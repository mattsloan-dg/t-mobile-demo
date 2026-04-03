import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createVoiceSession } from "@/lib/audio";
import { handleFunctionCall } from "@/lib/functions";
import { getAgentConfig, type AgentType } from "@/lib/agents";
import { usePageControl } from "@/lib/page-control";
import type { ActivityEvent, VASettings, VAServerMessage, WSLogEntry } from "@/lib/types";
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
  billing: "billing",
  cancellation: "cancellation",
};

/** Message returned in the FunctionCallResponse after UpdateThink completes, framed as instructions for the new agent persona. */
const AGENT_TRANSITION_MESSAGES: Record<AgentType, string> = {
  knowledge: "You are now the knowledge agent. Help the customer find answers using the help center.",
  billing: "You are now the billing agent. Your job is to look at the customer's billing account and provide information on recent charges.",
  cancellation: "You are now the cancellation specialist. Your job is to understand why the customer wants to cancel or downgrade their service, then escalate to a human with the detailed reason.",
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
  const [isMuted, setIsMuted] = useState(false);
  const [wsLog, setWsLog] = useState<WSLogEntry[]>([]);

  const agentRef = useRef<VoiceAgent | null>(null);
  const sessionRef = useRef<ReturnType<typeof createVoiceSession> | null>(null);
  /** Holds the pending FunctionCallResponse until ThinkUpdated confirms the agent swap. */
  const pendingTransferRef = useRef<{
    fnId: string;
    fnName: string;
    targetAgent: AgentType;
    timestamp: number;
  } | null>(null);

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
    setWsLog([]);
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

  /** Switch to a different agent by sending UpdateThink. */
  const switchAgent = useCallback(
    (targetAgent: AgentType, reason?: string) => {
      const agent = agentRef.current;
      if (!agent?.isConnected) return;

      const ctx = targetAgent === "knowledge" ? getPromptContext() : undefined;
      const config = getAgentConfig(targetAgent, ctx);

      logger.info("Sending UpdateThink for agent transfer", {
        targetAgent,
        label: config.label,
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

          case "ThinkUpdated": {
            logger.info("Agent config updated", { event: msg.type });
            setIsActive(true);
            setIsConnecting(false);
            setOrbState("listening");

            // If a transfer is pending, now send the FunctionCallResponse with the transition message
            const pending = pendingTransferRef.current;
            if (pending) {
              const message = AGENT_TRANSITION_MESSAGES[pending.targetAgent];
              const result = JSON.stringify({ message });
              logger.info("ThinkUpdated received, sending deferred FunctionCallResponse", {
                targetAgent: pending.targetAgent,
                message,
              });
              agent.sendFunctionCallResponse(pending.fnId, pending.fnName, result);
              finalizeFunctionEvent(pending.timestamp, result);
              pendingTransferRef.current = null;
            }
            break;
          }

          case "SpeakUpdated":
            logger.info("Agent config updated", { event: msg.type });
            setIsActive(true);
            setIsConnecting(false);
            setOrbState("listening");
            break;

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


              // Agent transfers: send UpdateThink first, defer FunctionCallResponse until ThinkUpdated
              if (fn.name === "escalate_call") {
                const escalateTo = typeof args.escalate_to === "string" ? args.escalate_to : "";
                const targetAgent = TRANSFER_TARGETS[escalateTo];
                if (targetAgent) {
                  const transferReason = typeof args.reason === "string" ? args.reason : undefined;
                  pendingTransferRef.current = { fnId: fn.id, fnName: fn.name, targetAgent, timestamp };
                  switchAgent(targetAgent, transferReason);
                } else {
                  // Human escalation — respond immediately
                  handleFunctionCall(fn.name, fn.arguments).then(({ result }) => {
                    agent.sendFunctionCallResponse(fn.id, fn.name, result);
                    finalizeFunctionEvent(timestamp, result);
                  });
                }
                continue;
              }

              // Handle all other functions through the dispatcher
              handleFunctionCall(fn.name, fn.arguments).then(({ result }) => {
                agent.sendFunctionCallResponse(fn.id, fn.name, result);
                finalizeFunctionEvent(timestamp, result);

                // Inject fake external-service log entries for mock API calls
                if (fn.name === "verify_identity") {
                  const parsed = JSON.parse(result) as Record<string, unknown>;
                  setWsLog((prev) => [
                    ...prev,
                    {
                      direction: "external" as const,
                      messageType: "IdentityVerification",
                      payload: {
                        service: "T-Mobile Identity Service",
                        endpoint: "POST /v1/identity/verify",
                        status: parsed.verified ? 200 : 401,
                        verified: parsed.verified,
                        user_id: parsed.user_id,
                        email_masked: parsed.email_masked,
                        response_time_ms: 800,
                      },
                      timestamp: Date.now(),
                    },
                  ]);
                }

                if (fn.name === "lookup_billing") {
                  const parsed = JSON.parse(result) as Record<string, unknown>;
                  setWsLog((prev) => [
                    ...prev,
                    {
                      direction: "external" as const,
                      messageType: "RetrieveAccountDetails",
                      payload: {
                        service: "T-Mobile Billing Service",
                        endpoint: "GET /v1/accounts/billing",
                        status: 200,
                        user_id: parsed.user_id,
                        plan: parsed.plan,
                        account_balance: parsed.account_balance,
                        next_payment_due: parsed.next_payment_due,
                        response_time_ms: 600,
                      },
                      timestamp: Date.now(),
                    },
                  ]);
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
            break;
        }
      });

      agent.on("audio", (data: ArrayBuffer) => {
        session.playAudio(data);
      });

      agent.on("activity", (event: ActivityEvent) => {
        setActivityEvents((prev) => [...prev, event]);
      });

      agent.on("ws_log", (entry: WSLogEntry) => {
        setWsLog((prev) => [...prev, entry]);
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
    // First click: establish connection to Deepgram
    if (!agentRef.current) {
      startAgent();
      return;
    }

    // Subsequent clicks: toggle mute/unmute
    if (isMuted) {
      sessionRef.current?.unmuteMic();
      setIsMuted(false);
      setOrbState("listening");
    } else {
      sessionRef.current?.muteMic();
      setIsMuted(true);
      setOrbState("idle");
    }
  }, [isMuted, startAgent]);

  const handleVoiceChange = useCallback((voice: string) => {
    setCurrentVoice(voice);
    if (agentRef.current?.isConnected) {
      agentRef.current.sendUpdateSpeak(voice);
    }
  }, []);

  const handleLlmChange = useCallback(
    (llm: string) => {
      setCurrentLlm(llm);
    },
    []
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
    isMuted,
    orbState,
    messages,
    activityEvents,
    wsLog,
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
