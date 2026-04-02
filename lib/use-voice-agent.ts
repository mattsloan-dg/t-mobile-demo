import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createVoiceSession } from "@/lib/audio";
import { handleFunctionCall } from "@/lib/functions";
import { getAgentConfig, type AgentType } from "@/lib/agents";
import { usePageControl } from "@/lib/page-control";
import type { ActivityEvent, VASettings, VAServerMessage } from "@/lib/types";
import { VoiceAgent } from "@/lib/voice-agent";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useVoiceAgent");

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export interface ArticleSummary {
  slug: string;
  title: string;
}

function parseSlug(url: string): string {
  return url.replace(/\/$/, "").split("/").at(-1) ?? "";
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

/** Map transfer_to param values to AgentType for agent swaps. */
const TRANSFER_TARGETS: Record<string, AgentType> = {
  "2fa": "2fa",
  account_lockout: "account_lockout",
};

/** Greeting messages per agent after transfer. */
const TRANSFER_GREETINGS: Record<AgentType, string> = {
  knowledge: "Hi there, this is Tara. What can I help you find?",
  "2fa": "Hi there, I'm Tara, the two-factor authentication specialist. I've been briefed on your situation and I'm here to help. First, I'll need to verify your identity. Could you please provide me with your email address and date of birth?",
  account_lockout: "Hi there, I'm Tara, the account recovery specialist. I've been briefed on your situation and I'm here to help. First, I'll need to verify your identity. Could you please provide me with your email address and date of birth?",
};


export function useVoiceAgent() {
  const pageControl = usePageControl();

  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [currentVoice, setCurrentVoice] = useState("aura-2-thalia-en");
  const [currentLlm, setCurrentLlm] = useState(
    "anthropic:claude-sonnet-4-6"
  );
  const [articleContext, setArticleContext] = useState("");
  const [articleCatalog, setArticleCatalog] = useState<ArticleSummary[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentType>("knowledge");

  const agentRef = useRef<VoiceAgent | null>(null);
  const sessionRef = useRef<ReturnType<typeof createVoiceSession> | null>(null);
  /** Tracks pending agent transfer — sequential steps: waitThink → waitSpeak → delay → inject. */
  const pendingTransferRef = useRef<{
    targetAgent: AgentType;
    reason: string;
    step: "waitThink" | "waitSpeak";
  } | null>(null);
  /** Pending inject message for retry if agent is still speaking. */
  const pendingInjectRef = useRef<{ message: string; retries: number } | null>(null);

  useEffect(() => {
    fetch("/api/articles")
      .then((res) => res.json())
      .then(
        (data: {
          context?: string;
          articles?: Array<{ url: string; title: string }>;
        }) => {
          setArticleContext(data.context ?? "");
          const summaries =
            data.articles
              ?.map((article) => ({
                slug: parseSlug(article.url),
                title: article.title,
              }))
              .filter((article) => article.slug) ?? [];
          setArticleCatalog(summaries);
        }
      )
      .catch((error) => {
        logger.error("Failed to load article catalog", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, []);

  const articleSlugs = useMemo(
    () => articleCatalog.map((article) => article.slug),
    [articleCatalog]
  );

  const currentPageTitle = useMemo(() => {
    if (pageControl.currentArticleSlug) {
      const found = articleCatalog.find(
        (article) => article.slug === pageControl.currentArticleSlug
      );
      if (found) return found.title;
      return humanizeSlug(pageControl.currentArticleSlug);
    }

    const categoryMatch = pageControl.pathname.match(/^\/support\/([^/]+)$/);
    if (categoryMatch && categoryMatch[1] !== "support") {
      return humanizeSlug(categoryMatch[1]);
    }

    return "Help center";
  }, [articleCatalog, pageControl.currentArticleSlug, pageControl.pathname]);

  /** Build the prompt context used by the knowledge agent. */
  const getPromptContext = useCallback(() => {
    const currentPage =
      pageControl.currentArticleSlug || pageControl.pathname === "/support"
        ? {
            slug: pageControl.currentArticleSlug ?? "support-home",
            title: currentPageTitle,
          }
        : null;
    return {
      helpArticleContent: articleContext,
      currentPage,
      availableArticleSlugs: articleSlugs,
    };
  }, [articleContext, articleSlugs, currentPageTitle, pageControl.currentArticleSlug, pageControl.pathname]);

  const buildSettings = useCallback((): VASettings => {
    const [providerType, model] = currentLlm.split(":");
    const config = getAgentConfig("knowledge", getPromptContext());

    return {
      type: "Settings",
      audio: {
        input: { encoding: "linear16", sample_rate: 16000 },
        output: { encoding: "linear16", sample_rate: 24000 },
      },
      agent: {
        listen: {
          provider: { type: "deepgram", model: "flux-general-en" },
        },
        think: {
          provider: { type: providerType, model, temperature: 0.7 },
          prompt: config.prompt,
          functions: config.functions,
        },
        speak: {
          provider: { type: "deepgram", model: currentVoice },
        },
        greeting:
          "Hi there, this is Tara from T-Mobile support. I can walk you through the help center while we talk. What do you need help with?",
      },
    };
  }, [
    currentLlm,
    currentVoice,
    getPromptContext,
  ]);

  const stopAgent = useCallback(() => {
    sessionRef.current?.stopMic();
    sessionRef.current?.clearAudio();
    sessionRef.current = null;

    agentRef.current?.disconnect();
    agentRef.current = null;

    setIsActive(false);
    setIsConnecting(false);
    setOrbState("idle");
    setActiveAgent("knowledge");
  }, []);

  const finalizeFunctionEvent = useCallback(
    (timestamp: number, result: string) => {
      setActivityEvents((prev) =>
        prev.map((event) =>
          event.type === "function_call" && event.timestamp === timestamp
            ? { ...event, status: "complete", result }
            : event
        )
      );
    },
    []
  );

  /** Switch to a different agent by sending UpdateThink + UpdateSpeak, then inject greeting once both confirm. */
  const switchAgent = useCallback(
    (targetAgent: AgentType, reason?: string) => {
      const agent = agentRef.current;
      if (!agent?.isConnected) return;

      const ctx = targetAgent === "knowledge" ? getPromptContext() : undefined;
      const config = getAgentConfig(targetAgent, ctx);

      // Step 1: Send UpdateThink, wait for ThinkUpdated before proceeding
      pendingTransferRef.current = {
        targetAgent,
        reason: reason ?? "Customer needs account-level assistance.",
        step: "waitThink",
      };

      logger.info("Sending UpdateThink for agent transfer", {
        targetAgent,
        label: config.label,
        prompt: config.prompt.slice(0, 200) + "...",
        functionCount: config.functions.length,
        functionNames: config.functions.map((f) => f.name),
      });
      agent.sendUpdateThink(config.prompt, config.functions);
      setActiveAgent(targetAgent);

      setActivityEvents((prev) => [
        ...prev,
        {
          type: "agent_event",
          event: `Switched to ${config.label}`,
          timestamp: Date.now(),
        },
      ]);
    },
    [getPromptContext]
  );

  const startAgent = useCallback(async () => {
    setIsConnecting(true);
    setActiveAgent("knowledge");

    try {
      const tokenRes = await fetch("/api/session");
      const { token } = (await tokenRes.json()) as { token: string };

      const session = createVoiceSession();
      sessionRef.current = session;

      const agent = new VoiceAgent();
      agentRef.current = agent;

      agent.on("open", () => {
        logger.info("WebSocket connected, waiting for Welcome message");
      });

      agent.on("message", (msg: VAServerMessage) => {
        switch (msg.type) {
          case "Welcome":
            logger.info("Welcome received, sending settings", { request_id: msg.request_id });
            agent.sendSettings(buildSettings());
            break;

          case "SettingsApplied":
            logger.info("Settings applied, starting microphone");
            session
              .startMic((audioData: ArrayBuffer) => {
                agent.sendAudio(audioData);
              })
              .then(() => {
                setIsActive(true);
                setIsConnecting(false);
                setOrbState("listening");
              })
              .catch((err) => {
                logger.error("Microphone error", {
                  error: err instanceof Error ? err.message : String(err),
                });
                setIsConnecting(false);
                setOrbState("idle");
              });
            break;

          case "ThinkUpdated":
          case "SpeakUpdated": {
            logger.info("Agent config updated", { event: msg.type });
            setIsActive(true);
            setIsConnecting(false);
            setOrbState("listening");

            // Sequential transfer: ThinkUpdated → send UpdateSpeak → SpeakUpdated → inject greeting
            const pending = pendingTransferRef.current;
            if (pending) {
              if (msg.type === "ThinkUpdated" && pending.step === "waitThink") {
                // Step 2: Think confirmed, now send UpdateSpeak
                pending.step = "waitSpeak";
                const transferConfig = getAgentConfig(pending.targetAgent);
                logger.info("ThinkUpdated received, sending UpdateSpeak", {
                  targetAgent: pending.targetAgent,
                  voice: transferConfig.voice,
                });
                agent.sendUpdateSpeak(transferConfig.voice);
                setCurrentVoice(transferConfig.voice);
              } else if (msg.type === "SpeakUpdated" && pending.step === "waitSpeak") {
                // Step 3: Speak confirmed, delay 1s for old agent speech to clear, then inject
                const target = pending.targetAgent;
                pendingTransferRef.current = null;
                const injectMessage = TRANSFER_GREETINGS[target] ?? `Hi there, I'm Tara. How can I help you?`;
                pendingInjectRef.current = { message: injectMessage, retries: 0 };
                logger.info("SpeakUpdated received, delaying before inject", { targetAgent: target });
                setTimeout(() => {
                  agent.sendInjectAgentMessage(injectMessage);
                }, 3000);
              }
            }
            break;
          }

          case "ConversationText":
            logger.info("Conversation text", { role: msg.role, content: msg.content });
            setMessages((prev) => [
              ...prev,
              { role: msg.role, content: msg.content },
            ]);
            break;

          case "UserStartedSpeaking":
            logger.debug("User started speaking");
            setOrbState("listening");
            session.clearAudio();
            break;

          case "AgentThinking":
            logger.debug("Agent thinking");
            setOrbState("thinking");
            break;

          case "AgentStartedSpeaking":
            logger.info("Agent started speaking", {
              total_latency: msg.total_latency,
              tts_latency: msg.tts_latency,
              ttt_latency: msg.ttt_latency,
            });
            setOrbState("speaking");
            // Inject succeeded, clear pending
            pendingInjectRef.current = null;
            break;

          case "AgentAudioDone":
            logger.info("Agent audio done");
            setOrbState("listening");
            break;

          case "FunctionCallRequest":
            logger.info("Function call request", {
              functions: msg.functions.map((fn) => ({
                id: fn.id,
                name: fn.name,
                arguments: fn.arguments,
              })),
            });
            for (const fn of msg.functions) {
              const args = JSON.parse(fn.arguments) as Record<string, unknown>;
              const timestamp = Date.now();

              setActivityEvents((prev) => [
                ...prev,
                {
                  type: "function_call",
                  name: fn.name,
                  args,
                  timestamp,
                  status: "pending",
                },
              ]);

              if (fn.name === "navigate_to_article") {
                const slug =
                  typeof args.slug === "string" ? args.slug.trim() : "";

                setTimeout(() => {
                  const navigated = pageControl.navigateToArticle(slug);
                  const result = JSON.stringify({ navigated, slug });
                  agent.sendFunctionCallResponse(fn.id, fn.name, result);
                  finalizeFunctionEvent(timestamp, result);
                }, 1500);
                continue;
              }


              // Handle all functions (including transfers) through the dispatcher
              handleFunctionCall(fn.name, fn.arguments).then(({ result }) => {
                agent.sendFunctionCallResponse(fn.id, fn.name, result);
                finalizeFunctionEvent(timestamp, result);

                // If this was a transfer function, resolve the target and swap agents
                if (fn.name === "transfer_to_agent") {
                  const transferTo = typeof args.transfer_to === "string" ? args.transfer_to : "";
                  if (transferTo === "human") {
                    // Human escalation is handled by the function result itself
                  } else {
                    const targetAgent = TRANSFER_TARGETS[transferTo];
                    if (targetAgent) {
                      const transferReason = typeof args.reason === "string" ? args.reason : undefined;
                      switchAgent(targetAgent, transferReason);
                    }
                  }
                }

                if (fn.name === "search_help_articles") {
                  try {
                    const parsed = JSON.parse(result) as {
                      results?: Array<{ title: string; snippet: string }>;
                    };
                    const ragResults = parsed.results;
                    if (ragResults) {
                      setActivityEvents((prev) => [
                        ...prev,
                        {
                          type: "rag_retrieval",
                          query: typeof args.query === "string" ? args.query : "",
                          articles: ragResults.map((article) => ({
                            title: article.title,
                            snippet: article.snippet,
                          })),
                          timestamp: Date.now(),
                        },
                      ]);
                    }
                  } catch {
                    // Ignore malformed payloads from debug tools.
                  }
                }
              });
            }
            break;

          case "Error":
            logger.error("Voice Agent server error", { description: msg.description });
            break;

          case "Warning":
            logger.warn("Voice Agent server warning", { payload: msg });

            // Retry inject if agent was still speaking
            if (msg.code === "INJECT_AGENT_MESSAGE_DURING_AGENT_SPEECH") {
              const pending = pendingInjectRef.current;
              if (pending && pending.retries < 3) {
                pending.retries++;
                logger.info("Retrying InjectAgentMessage", { retry: pending.retries });
                setTimeout(() => {
                  agent.sendInjectAgentMessage(pending.message);
                }, 1000);
              } else {
                logger.warn("InjectAgentMessage retries exhausted");
                pendingInjectRef.current = null;
              }
            }
            break;
        }
      });

      agent.on("audio", (data: ArrayBuffer) => {
        session.playAudio(data);
      });

      agent.on("activity", (event: ActivityEvent) => {
        setActivityEvents((prev) => [...prev, event]);
      });

      agent.on("close", () => {
        setIsActive(false);
        setOrbState("idle");
      });

      agent.on("error", () => {
        setIsActive(false);
        setIsConnecting(false);
        setOrbState("idle");
      });

      agent.connect(token);
    } catch (error) {
      logger.error("Failed to start agent", {
        error: error instanceof Error ? error.message : String(error),
      });
      setIsConnecting(false);
      setOrbState("idle");
    }
  }, [buildSettings, finalizeFunctionEvent, pageControl, switchAgent]);

  const handleMicClick = useCallback(() => {
    if (isActive) {
      stopAgent();
    } else {
      startAgent();
    }
  }, [isActive, startAgent, stopAgent]);

  const handleVoiceChange = useCallback((voice: string) => {
    setCurrentVoice(voice);
    if (agentRef.current?.isConnected) {
      agentRef.current.sendUpdateSpeak(voice);
    }
  }, []);

  const handleLlmChange = useCallback(
    (llm: string) => {
      setCurrentLlm(llm);
      if (isActive) stopAgent();
    },
    [isActive, stopAgent]
  );

  useEffect(() => {
    return () => {
      sessionRef.current?.stopMic();
      agentRef.current?.disconnect();
    };
  }, []);

  return {
    isActive,
    isConnecting,
    orbState,
    messages,
    activityEvents,
    currentVoice,
    currentLlm,
    currentPageTitle,
    activeAgent,
    pageControl,
    handleMicClick,
    handleVoiceChange,
    handleLlmChange,
    stopAgent,
  };
}
