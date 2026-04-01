"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityEvent } from "@/lib/types";

interface ActivityFeedProps {
  events: ActivityEvent[];
  debugMode: "minimal" | "full";
  onDebugModeChange: (mode: "minimal" | "full") => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a timestamp as a relative label ("just now", "12s ago", "3m ago") */
function relativeTime(ts: number, now: number): string {
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  return `${mins}m ago`;
}

/** Pretty-print a value for display inside argument lists */
function formatValue(v: unknown): string {
  if (typeof v === "string") return `"${v}"`;
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 text-tm-magenta"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Card: Function Call                                                */
/* ------------------------------------------------------------------ */

function FunctionCallCard({
  event,
  now,
}: {
  event: Extract<ActivityEvent, { type: "function_call" }>;
  now: number;
}) {
  const elapsed =
    event.status === "complete" && event.result
      ? `${((now - event.timestamp) / 1000).toFixed(1)}s`
      : null;

  let parsedResult: Record<string, unknown> | null = null;
  if (event.result) {
    try {
      parsedResult = JSON.parse(event.result);
    } catch {
      /* result is plain text, not JSON */
    }
  }

  return (
    <div className="activity-card bg-tm-card rounded-lg border border-tm-border/60 border-l-2 border-l-tm-magenta overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {event.status === "pending" ? (
            <Spinner />
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-tm-magenta flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-tm-text truncate">
            {event.name}
          </span>
        </div>
        <span className="text-[10px] text-tm-text-secondary flex-shrink-0 ml-2">
          {elapsed ?? relativeTime(event.timestamp, now)}
        </span>
      </div>

      {/* Arguments */}
      <div className="px-3 pb-2 space-y-0.5">
        {Object.entries(event.args).map(([key, val]) => (
          <div key={key} className="text-xs leading-relaxed">
            <span className="text-tm-text-secondary">{key}:</span>{" "}
            <span className="text-tm-text">{formatValue(val)}</span>
          </div>
        ))}
      </div>

      {/* Result (when complete) */}
      {event.status === "complete" && event.result && (
        <>
          <div className="border-t border-tm-border/40 mx-3" />
          <div className="px-3 py-2 space-y-0.5">
            {parsedResult ? (
              Object.entries(parsedResult).map(([key, val]) => (
                <div key={key} className="text-xs leading-relaxed">
                  <span className="text-tm-text-secondary/70">&rarr;</span>{" "}
                  <span className="text-tm-magenta/80">{key}:</span>{" "}
                  <span className="text-tm-text">{formatValue(val)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs leading-relaxed">
                <span className="text-tm-text-secondary/70">&rarr;</span>{" "}
                <span className="text-tm-text">{event.result}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card: RAG Retrieval                                                */
/* ------------------------------------------------------------------ */

function RagRetrievalCard({
  event,
  now,
}: {
  event: Extract<ActivityEvent, { type: "rag_retrieval" }>;
  now: number;
}) {
  return (
    <div className="activity-card bg-tm-card rounded-lg border border-tm-border/60 border-l-2 border-l-[#3B82F6] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Search icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm font-semibold text-tm-text truncate">
            Knowledge Search
          </span>
        </div>
        <span className="text-[10px] text-tm-text-secondary flex-shrink-0 ml-2">
          {relativeTime(event.timestamp, now)}
        </span>
      </div>

      {/* Query */}
      <div className="px-3 pb-1.5">
        <div className="text-xs leading-relaxed">
          <span className="text-tm-text-secondary">Query:</span>{" "}
          <span className="text-tm-text">&ldquo;{event.query}&rdquo;</span>
        </div>
      </div>

      {/* Matched articles */}
      {event.articles.length > 0 && (
        <>
          <div className="border-t border-tm-border/40 mx-3" />
          <div className="px-3 py-2 space-y-2">
            {event.articles.map((article, i) => (
              <div
                key={i}
                className="bg-tm-darker/50 rounded px-2.5 py-2 border border-tm-border/30"
              >
                <div className="flex items-start gap-1.5">
                  <span className="text-[#3B82F6] text-xs mt-px flex-shrink-0">&bull;</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-tm-text leading-snug truncate">
                      {article.title}
                    </p>
                    <p className="text-[11px] text-tm-text-secondary leading-snug mt-0.5 line-clamp-2">
                      &ldquo;{article.snippet}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card: Agent Event  (full debug only)                               */
/* ------------------------------------------------------------------ */

function AgentEventCard({
  event,
  now,
}: {
  event: Extract<ActivityEvent, { type: "agent_event" }>;
  now: number;
}) {
  return (
    <div className="activity-card bg-tm-card/60 rounded-md border border-tm-border/40 border-l-2 border-l-tm-border px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Small dot */}
        <span className="flex h-1.5 w-1.5 rounded-full bg-tm-text-secondary flex-shrink-0" />
        <span className="text-xs text-tm-text truncate">{event.event}</span>
        {event.details && (
          <span className="text-[11px] text-tm-text-secondary truncate">
            &mdash; {event.details}
          </span>
        )}
      </div>
      <span className="text-[10px] text-tm-text-secondary flex-shrink-0">
        {relativeTime(event.timestamp, now)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card: Latency  (full debug only)                                   */
/* ------------------------------------------------------------------ */

function LatencyCard({ event }: { event: Extract<ActivityEvent, { type: "latency" }> }) {
  const color =
    event.total < 500
      ? "bg-tm-magenta/15 text-tm-magenta border-tm-magenta/20"
      : event.total < 1000
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
        : "bg-red-500/15 text-red-400 border-red-500/20";

  return (
    <div className={`activity-card inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${color}`}>
      {/* Clock icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>Total: {event.total}ms</span>
      <span className="opacity-40">|</span>
      <span>LLM: {event.ttt}ms</span>
      <span className="opacity-40">|</span>
      <span>TTS: {event.tts}ms</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Debug Mode Toggle                                                  */
/* ------------------------------------------------------------------ */

function DebugToggle({
  mode,
  onChange,
}: {
  mode: "minimal" | "full";
  onChange: (mode: "minimal" | "full") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-0 bg-tm-card border border-tm-border rounded-lg p-0.5">
      <button
        onClick={() => onChange("minimal")}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer
          ${
            mode === "minimal"
              ? "bg-tm-border text-tm-text shadow-sm"
              : "text-tm-text-secondary hover:text-tm-text"
          }
        `}
      >
        Minimal
      </button>
      <button
        onClick={() => onChange("full")}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer
          ${
            mode === "full"
              ? "bg-tm-border text-tm-text shadow-sm"
              : "text-tm-text-secondary hover:text-tm-text"
          }
        `}
      >
        Full Debug
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component: ActivityFeed                                       */
/* ------------------------------------------------------------------ */

export default function ActivityFeed({
  events,
  debugMode,
  onDebugModeChange,
}: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  // Auto-scroll to newest event
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Tick every 5 seconds so relative timestamps update
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Filter events based on debug mode
  const visibleEvents =
    debugMode === "minimal"
      ? events.filter(
          (e) => e.type === "function_call" || e.type === "rag_retrieval"
        )
      : events;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable event list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {visibleEvents.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-tm-text-secondary text-sm text-center leading-relaxed">
              Events will appear here when the<br />conversation starts...
            </p>
          </div>
        ) : (
          visibleEvents.map((event, i) => (
            <div
              key={`${event.type}-${event.timestamp}-${i}`}
              className="activity-card-wrapper"
              style={{
                animation: "activityFadeIn 300ms ease forwards",
                animationDelay: "0ms",
              }}
            >
              {event.type === "function_call" && (
                <FunctionCallCard event={event} now={now} />
              )}
              {event.type === "rag_retrieval" && (
                <RagRetrievalCard event={event} now={now} />
              )}
              {event.type === "agent_event" && (
                <AgentEventCard event={event} now={now} />
              )}
              {event.type === "latency" && <LatencyCard event={event} />}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticky footer with debug toggle */}
      <div className="flex-shrink-0 border-t border-tm-border bg-tm-dark px-4 py-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-tm-text-secondary">
          Debug Level
        </span>
        <DebugToggle mode={debugMode} onChange={onDebugModeChange} />
      </div>

      {/* CSS animation keyframes */}
      <style jsx>{`
        @keyframes activityFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
