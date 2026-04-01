// =============================================================================
// Deepgram Voice Agent API V1 - TypeScript Types
// =============================================================================

// -----------------------------------------------------------------------------
// Client -> Server Messages
// -----------------------------------------------------------------------------

/** Function definition for agent tool-use / function calling */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Settings message - must be sent immediately after WebSocket connects */
export interface VASettings {
  type: "Settings";
  audio: {
    input: {
      encoding: string;
      sample_rate: number;
    };
    output: {
      encoding: string;
      sample_rate: number;
      container?: string;
    };
  };
  agent: {
    listen: {
      provider: {
        type: string;
        model: string;
      };
    };
    think: {
      provider: {
        type: string;
        model: string;
        temperature?: number;
      };
      prompt: string;
      functions?: FunctionDefinition[];
    };
    speak: {
      provider: {
        type: string;
        model: string;
      };
    };
    greeting?: string;
  };
}

/** Response to a server-initiated function call */
export interface VAFunctionCallResponse {
  type: "FunctionCallResponse";
  id: string;
  name: string;
  content: string;
}

/** Dynamically update the TTS voice */
export interface VAUpdateSpeak {
  type: "UpdateSpeak";
  speak: {
    provider: {
      type: string;
      model: string;
    };
  };
}

/** Dynamically update the agent system prompt */
export interface VAUpdatePrompt {
  type: "UpdatePrompt";
  prompt: string;
}

/** Replace the entire Think provider configuration (prompt, model, functions) */
export interface VAUpdateThink {
  type: "UpdateThink";
  think: {
    provider: {
      type: string;
      model: string;
      temperature?: number;
    };
    prompt: string;
    functions?: FunctionDefinition[];
  };
}

/** Confirms the Think configuration was updated */
export interface VAThinkUpdated {
  type: "ThinkUpdated";
}

/** Confirms the Speak configuration was updated */
export interface VASpeakUpdated {
  type: "SpeakUpdated";
}

/** Inject a message into the conversation to prompt the agent to speak */
export interface VAInjectAgentMessage {
  type: "InjectAgentMessage";
  message: string;
}

/** Keep the WebSocket connection alive */
export interface VAKeepAlive {
  type: "KeepAlive";
}

/** Union of all client-to-server message types */
export type VAClientMessage =
  | VASettings
  | VAFunctionCallResponse
  | VAUpdateSpeak
  | VAUpdatePrompt
  | VAUpdateThink
  | VAInjectAgentMessage
  | VAKeepAlive;

// -----------------------------------------------------------------------------
// Server -> Client Messages
// -----------------------------------------------------------------------------

/** Sent once when the WebSocket connection is established */
export interface VAWelcome {
  type: "Welcome";
  request_id: string;
}

/** Confirms the Settings message was accepted */
export interface VASettingsApplied {
  type: "SettingsApplied";
}

/** Transcription of user or assistant speech */
export interface VAConversationText {
  type: "ConversationText";
  role: "user" | "assistant";
  content: string;
}

/** The user has started speaking (voice activity detected) */
export interface VAUserStartedSpeaking {
  type: "UserStartedSpeaking";
}

/** The agent has started speaking; includes latency metrics */
export interface VAAgentStartedSpeaking {
  type: "AgentStartedSpeaking";
  total_latency: number;
  tts_latency: number;
  ttt_latency: number;
}

/** Partial thinking/reasoning content from the LLM */
export interface VAAgentThinking {
  type: "AgentThinking";
  content: string;
}

/** All audio for the current agent turn has been sent */
export interface VAAgentAudioDone {
  type: "AgentAudioDone";
}

/** Server requests that the client execute one or more functions */
export interface VAFunctionCallRequest {
  type: "FunctionCallRequest";
  functions: Array<{
    id: string;
    name: string;
    arguments: string;
    client_side: boolean;
  }>;
}

/** An error occurred */
export interface VAError {
  type: "Error";
  description: string;
  code: string;
}

/** A non-fatal warning */
export interface VAWarning {
  type: "Warning";
  description: string;
  code: string;
}

/** Union of all server-to-client message types */
export type VAServerMessage =
  | VAWelcome
  | VASettingsApplied
  | VAConversationText
  | VAUserStartedSpeaking
  | VAAgentStartedSpeaking
  | VAAgentThinking
  | VAAgentAudioDone
  | VAFunctionCallRequest
  | VAThinkUpdated
  | VASpeakUpdated
  | VAError
  | VAWarning;

// -----------------------------------------------------------------------------
// Activity Feed Events (used by the UI activity panel)
// -----------------------------------------------------------------------------

export type ActivityEvent =
  | {
      type: "function_call";
      name: string;
      args: Record<string, unknown>;
      result?: string;
      timestamp: number;
      status: "pending" | "complete";
    }
  | {
      type: "rag_retrieval";
      query: string;
      articles: Array<{ title: string; snippet: string }>;
      timestamp: number;
    }
  | {
      type: "agent_event";
      event: string;
      details?: string;
      timestamp: number;
    }
  | {
      type: "latency";
      total: number;
      tts: number;
      ttt: number;
      timestamp: number;
    };
