"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Minimize2, Terminal } from "lucide-react";
import { useVoiceAgentContext } from "@/lib/voice-agent-context";
import type { WSLogEntry } from "@/lib/types";

/** Format timestamp as HH:MM:SS.mmm */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

/** Color for message type labels */
function typeColor(messageType: string): string {
  switch (messageType) {
    case "Welcome":
    case "SettingsApplied":
    case "ThinkUpdated":
    case "SpeakUpdated":
      return "text-green-400";
    case "Error":
      return "text-red-400";
    case "Warning":
      return "text-yellow-400";
    case "ConversationText":
      return "text-blue-300";
    case "FunctionCallRequest":
    case "FunctionCallResponse":
      return "text-purple-400";
    case "AgentStartedSpeaking":
    case "AgentThinking":
    case "AgentAudioDone":
      return "text-cyan-400";
    case "UserStartedSpeaking":
      return "text-orange-400";
    case "Settings":
      return "text-tm-magenta";
    case "UpdateThink":
    case "UpdateSpeak":
      return "text-amber-400";
    case "IdentityVerification":
    case "RetrieveAccountDetails":
      return "text-rose-400";
    default:
      return "text-white/70";
  }
}

function LogEntry({ entry }: { entry: WSLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isSent = entry.direction === "sent";
  const isExternal = entry.direction === "external";

  const arrowColor = isExternal
    ? "text-rose-400"
    : isSent
      ? "text-emerald-400"
      : "text-blue-400";
  const arrowChar = isExternal ? "\u2194" : isSent ? "\u2191" : "\u2193";

  return (
    <div className={`border-b border-white/5 last:border-b-0${isExternal ? " bg-rose-500/5" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="size-3 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-white/30 flex-shrink-0" />
        )}

        {/* Direction arrow */}
        <span
          className={`text-xs font-bold flex-shrink-0 w-4 text-center ${arrowColor}`}
        >
          {arrowChar}
        </span>

        {/* Message type */}
        <span
          className={`text-xs font-semibold truncate ${typeColor(entry.messageType)}`}
        >
          {entry.messageType}
        </span>

        {/* Timestamp */}
        <span className="ml-auto text-[10px] text-white/30 font-mono flex-shrink-0">
          {formatTime(entry.timestamp)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <pre className="rounded-md bg-black/60 border border-white/10 p-3 text-[11px] leading-relaxed text-white/70 font-mono overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/** Message types hidden in minimal mode */
const MINIMAL_HIDDEN: Set<string> = new Set([
  "AgentAudioDone",
  "UserStartedSpeaking",
  "ConversationText",
  "History",
]);

export default function WebSocketLogWidget() {
  const agent = useVoiceAgentContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugMode, setDebugMode] = useState<"minimal" | "full">("minimal");
  const bottomRef = useRef<HTMLDivElement>(null);

  const allEntries = agent.wsLog;
  const entries =
    debugMode === "minimal"
      ? allEntries.filter((e) => !MINIMAL_HIDDEN.has(e.messageType))
      : allEntries;

  // Auto-scroll to newest entry
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  const sentCount = entries.filter((e) => e.direction === "sent").length;
  const receivedCount = entries.filter((e) => e.direction === "received").length;
  const externalCount = entries.filter((e) => e.direction === "external").length;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Collapsed: round button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a] text-white/70 border border-white/10 shadow-[0_8px_26px_rgba(0,0,0,0.45)] transition hover:scale-105 hover:border-tm-magenta/40 hover:text-tm-magenta"
          aria-label="Open WebSocket log"
          title="WebSocket Log"
        >
          <Terminal className="size-6" />
          {agent.isActive && entries.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-tm-magenta text-[10px] font-bold text-white">
              {entries.length > 99 ? "99+" : entries.length}
            </span>
          )}
          <span className="absolute inset-0 rounded-full border border-white/20 opacity-0 transition group-hover:opacity-100" />
        </button>
      )}

      {/* Expanded: log panel */}
      {isExpanded && (
        <section className="flex h-[min(600px,calc(100vh-5.5rem))] w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60">
                <Terminal className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">WebSocket Log</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {entries.length === 0 ? (
                    "No messages yet"
                  ) : (
                    <>
                      <span className="text-emerald-400">{sentCount} sent</span>
                      {" \u00b7 "}
                      <span className="text-blue-400">{receivedCount} received</span>
                      {externalCount > 0 && (
                        <>
                          {" \u00b7 "}
                          <span className="text-rose-400">{externalCount} external</span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimize WebSocket log"
            >
              <Minimize2 className="size-4" />
            </button>
          </header>

          {/* Legend + debug toggle */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                <span className="text-emerald-400 font-bold">&uarr;</span> Client &rarr; Deepgram
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                <span className="text-blue-400 font-bold">&darr;</span> Deepgram &rarr; Client
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                <span className="text-rose-400 font-bold">&harr;</span> External Service
              </span>
            </div>
            <div className="flex rounded-md border border-white/10 p-0.5 bg-black/40">
              <button
                onClick={() => setDebugMode("minimal")}
                className={`px-2 py-1 text-[10px] font-medium rounded transition ${
                  debugMode === "minimal"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Minimal
              </button>
              <button
                onClick={() => setDebugMode("full")}
                className={`px-2 py-1 text-[10px] font-medium rounded transition ${
                  debugMode === "full"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Full Debug
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <Terminal className="size-8 text-white/10 mb-3" />
                <p className="text-white/30 text-sm text-center leading-relaxed">
                  WebSocket messages will appear here when a voice session starts.
                </p>
              </div>
            ) : (
              entries.map((entry, i) => (
                <LogEntry key={`${entry.messageType}-${entry.timestamp}-${i}`} entry={entry} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </section>
      )}
    </div>
  );
}
