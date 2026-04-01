import type {
  VASettings,
  VAFunctionCallResponse,
  VAUpdateSpeak,
  VAUpdateThink,
  FunctionDefinition,
  VAServerMessage,
  ActivityEvent,
} from "./types";
import { createLogger } from "./logger";

const logger = createLogger("VoiceAgent");

// =============================================================================
// VoiceAgent - Event-driven WebSocket client for Deepgram Voice Agent API V1
// =============================================================================

const DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse";
const KEEP_ALIVE_INTERVAL_MS = 5_000;

/** Map of event names to their callback signatures */
export type VoiceAgentEventMap = {
  open: () => void;
  close: () => void;
  error: (error: Event) => void;
  message: (message: VAServerMessage) => void;
  audio: (data: ArrayBuffer) => void;
  activity: (event: ActivityEvent) => void;
};

type GenericListener = (...args: unknown[]) => void;

export class VoiceAgent {
  private ws: WebSocket | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Partial<
    Record<keyof VoiceAgentEventMap, GenericListener[]>
  > = {};

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Open a WebSocket connection to the Deepgram Voice Agent API.
   *
   * Authentication is performed via the WebSocket sub-protocol mechanism:
   *   new WebSocket(url, ["token", apiKey])
   *
   * Browser WebSocket does not support custom headers, so the sub-protocol
   * approach is the standard way to pass credentials to Deepgram.
   */
  connect(token: string): void {
    if (this.ws) {
      this.disconnect();
    }

    this.ws = new WebSocket(DEEPGRAM_AGENT_URL, ["token", token]);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      logger.info("WebSocket connection opened", { url: DEEPGRAM_AGENT_URL });
      this.emit("open");
      this.startKeepAlive();
    };

    this.ws.onclose = () => {
      logger.info("WebSocket connection closed");
      this.stopKeepAlive();
      this.emit("close");
    };

    this.ws.onerror = (e: Event) => {
      logger.error("WebSocket error", { event_type: e.type });
      this.emit("error", e);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary frame -> raw audio from the agent
        this.emit("audio", event.data);
      } else {
        // Text frame -> JSON control message
        try {
          const msg = JSON.parse(event.data as string) as VAServerMessage;
          logger.debug("Server message received", { type: msg.type, payload: msg });
          this.emit("message", msg);
          this.handleActivityEvents(msg);
        } catch (err) {
          logger.error("Failed to parse server message", {
            error: err instanceof Error ? err.message : String(err),
            raw_data: String(event.data).slice(0, 500),
          });
        }
      }
    };
  }

  /** Gracefully close the WebSocket connection and clean up resources. */
  disconnect(): void {
    this.stopKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Whether the WebSocket is currently open and ready to send/receive. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // Sending messages
  // ---------------------------------------------------------------------------

  /** Send the initial Settings configuration immediately after connecting. */
  sendSettings(settings: VASettings): void {
    this.send(settings);
  }

  /** Stream raw audio data (PCM/mu-law) to the agent. */
  sendAudio(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /** Respond to a FunctionCallRequest from the server. */
  sendFunctionCallResponse(id: string, name: string, content: string): void {
    const msg: VAFunctionCallResponse = {
      type: "FunctionCallResponse",
      id,
      name,
      content,
    };
    this.send(msg);
  }

  /** Dynamically switch the TTS voice model. */
  sendUpdateSpeak(model: string): void {
    const msg: VAUpdateSpeak = {
      type: "UpdateSpeak",
      speak: { provider: { type: "deepgram", model } },
    };
    this.send(msg);
  }

  /** Inject a message to prompt the agent to speak. */
  sendInjectAgentMessage(message: string): void {
    this.send({ type: "InjectAgentMessage", message });
  }

  /** Replace the entire Think configuration (prompt, model, functions). */
  sendUpdateThink(
    prompt: string,
    functions: FunctionDefinition[],
    provider?: { type: string; model: string; temperature?: number }
  ): void {
    const msg: VAUpdateThink = {
      type: "UpdateThink",
      think: {
        provider: provider ?? { type: "anthropic", model: "claude-sonnet-4-20250514", temperature: 0.7 },
        prompt,
        functions,
      },
    };
    this.send(msg);
  }

  // ---------------------------------------------------------------------------
  // Event emitter
  // ---------------------------------------------------------------------------

  /** Subscribe to an event. */
  on<K extends keyof VoiceAgentEventMap>(
    event: K,
    callback: VoiceAgentEventMap[K]
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback as GenericListener);
  }

  /** Unsubscribe from an event. */
  off<K extends keyof VoiceAgentEventMap>(
    event: K,
    callback: VoiceAgentEventMap[K]
  ): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = list.indexOf(callback as GenericListener);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private emit<K extends keyof VoiceAgentEventMap>(
    event: K,
    ...args: Parameters<VoiceAgentEventMap[K]>
  ): void {
    const list = this.listeners[event] as
      | Array<VoiceAgentEventMap[K]>
      | undefined;
    if (!list) return;
    for (const fn of list) {
      try {
        const listener = fn as (
          ...params: Parameters<VoiceAgentEventMap[K]>
        ) => void;
        listener(...args);
      } catch (err) {
        logger.error("Error in event listener", {
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /** Serialize an object to JSON and send it over the WebSocket. */
  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const typed = data as { type?: string };
      if (typed.type !== "KeepAlive") {
        logger.debug("Sending message", { type: typed.type, payload: data });
      }
      this.ws.send(JSON.stringify(data));
    }
  }

  /** Start the periodic KeepAlive heartbeat. */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      this.send({ type: "KeepAlive" });
    }, KEEP_ALIVE_INTERVAL_MS);
  }

  /** Stop the KeepAlive heartbeat. */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Translate certain server messages into ActivityEvent emissions so the UI
   * activity feed can display them without additional wiring.
   */
  private handleActivityEvents(msg: VAServerMessage): void {
    switch (msg.type) {
      case "AgentStartedSpeaking":
        this.emit("activity", {
          type: "latency",
          total: msg.total_latency,
          tts: msg.tts_latency,
          ttt: msg.ttt_latency,
          timestamp: Date.now(),
        });
        break;

      case "UserStartedSpeaking":
      case "AgentThinking":
      case "AgentAudioDone":
        this.emit("activity", {
          type: "agent_event",
          event: msg.type,
          timestamp: Date.now(),
        });
        break;

      case "FunctionCallRequest":
        // Function call activity events are emitted by the function handler
        // layer (Task 8) once args have been parsed and the result is known,
        // so we intentionally do not emit here.
        break;
    }
  }
}
