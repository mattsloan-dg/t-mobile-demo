"use client";

import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bot,
  Headset,
  Minimize2,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import MicButton from "@/components/MicButton";
import SettingsPanel from "@/components/SettingsPanel";
import Transcript from "@/components/Transcript";
import { useVoiceAgentContext } from "@/lib/voice-agent-context";

type WidgetView = "conversation" | "tools";

export default function VoiceWidget() {
  const agent = useVoiceAgentContext();

  const [isExpanded, setIsExpanded] = useState(false);
  const [widgetView, setWidgetView] = useState<WidgetView>("conversation");
  const [activeTab, setActiveTab] = useState<"settings" | "activity">("settings");
  const [debugMode, setDebugMode] = useState<"minimal" | "full">("minimal");

  const lastFunctionCall = agent.activityEvents
    .filter((e) => e.type === "function_call")
    .at(-1);

  const lastLatency = agent.activityEvents
    .filter((e) => e.type === "latency")
    .at(-1);

  return (
    <>
    {/* Powered by Deepgram bar */}
    {agent.isActive && (
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-tm-magenta/20 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-tm-magenta">
              <Zap className="size-3" />
              Powered by Deepgram
            </span>
            <span className="text-[10px] text-white/30">|</span>
            <span className="text-[11px] text-white/50">
              STT: Flux
            </span>
            <span className="text-[10px] text-white/30">|</span>
            <span className="text-[11px] text-white/50">
              TTS: {agent.currentVoice.replace("aura-2-", "").replace("-en", "")}
            </span>
            <span className="text-[10px] text-white/30">|</span>
            <span className="text-[11px] text-white/50">
              LLM: {agent.currentLlm.split(":")[1] || agent.currentLlm}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastFunctionCall && lastFunctionCall.type === "function_call" && (
              <span className="flex items-center gap-1.5 text-[11px]">
                <Activity className="size-3 text-tm-magenta" />
                <span className="text-white/70">{lastFunctionCall.name}</span>
                <span className={`rounded px-1 py-0.5 text-[10px] font-mono ${
                  lastFunctionCall.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-tm-magenta/20 text-tm-magenta"
                }`}>
                  {lastFunctionCall.status === "pending" ? "running..." : "done"}
                </span>
              </span>
            )}
            {lastLatency && lastLatency.type === "latency" && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                lastLatency.total < 500
                  ? "bg-tm-magenta/20 text-tm-magenta"
                  : lastLatency.total < 1000
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}>
                {Math.round(lastLatency.total)}ms
              </span>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="fixed bottom-6 right-6 z-50">
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-tm-magenta text-black shadow-[0_8px_26px_rgba(226,0,116,0.45)] transition hover:scale-105"
          aria-label="Open voice support"
          title="Talk to Tara"
        >
          <Headset className="size-6" />
          <span className="absolute inset-0 rounded-full border border-white/40 opacity-0 transition group-hover:opacity-100" />
          <span className="absolute -inset-2 animate-pulse rounded-full bg-tm-magenta/20" />
        </button>
      )}

      {isExpanded && (
        <section className="flex h-[min(540px,calc(100vh-5.5rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-tm-magenta/20 text-tm-magenta">
                <Bot className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Tara</p>
                <p className="text-[11px] font-medium text-tm-text-secondary">
                  {agent.isActive
                    ? "Connected"
                    : agent.isConnecting
                      ? "Connecting..."
                      : "Ready"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setWidgetView("conversation");
                setIsExpanded(false);
              }}
              className="rounded-md p-1.5 text-tm-text-secondary transition hover:bg-tm-card hover:text-white"
              aria-label="Minimize widget"
            >
              <Minimize2 className="size-4" />
            </button>
          </header>

          {widgetView === "conversation" ? (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0 bg-black/40">
                <Transcript messages={agent.messages} />
              </div>

              <footer className="flex shrink-0 items-center justify-between border-t border-white/10 bg-black/60 px-4 py-3">
                <span className="text-xs font-medium text-tm-text-secondary truncate pr-4">
                  {agent.pageControl.currentArticleSlug
                    ? `Viewing: ${agent.currentPageTitle}`
                    : "Support home"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <MicButton
                    isActive={agent.isActive}
                    isMuted={agent.isMuted}
                    onClick={agent.handleMicClick}
                    disabled={agent.isConnecting}
                  />
                  <button
                    onClick={() => setWidgetView("tools")}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-tm-text-secondary transition hover:bg-white/10 hover:text-white"
                  >
                    <Settings2 className="size-3.5" />
                    Tools
                  </button>
                </div>
              </footer>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <button
                  onClick={() => setWidgetView("conversation")}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-tm-text-secondary transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
                <div className="flex rounded-md border border-white/10 p-0.5 bg-black/40">
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${
                      activeTab === "settings"
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-tm-text-secondary hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Settings2 className="size-3.5" />
                      Settings
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${
                      activeTab === "activity"
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-tm-text-secondary hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      Activity
                    </span>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {activeTab === "settings" ? (
                  <SettingsPanel
                    currentVoice={agent.currentVoice}
                    currentLlm={agent.currentLlm}
                    onVoiceChange={agent.handleVoiceChange}
                    onLlmChange={agent.handleLlmChange}
                  />
                ) : (
                  <ActivityFeed
                    events={agent.activityEvents}
                    debugMode={debugMode}
                    onDebugModeChange={setDebugMode}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
    </>
  );
}
