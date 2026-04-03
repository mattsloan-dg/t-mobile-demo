"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useVoiceAgent } from "@/lib/use-voice-agent";

type VoiceAgentState = ReturnType<typeof useVoiceAgent>;

const VoiceAgentContext = createContext<VoiceAgentState | null>(null);

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  const agent = useVoiceAgent();
  return (
    <VoiceAgentContext.Provider value={agent}>
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useVoiceAgentContext(): VoiceAgentState {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error("useVoiceAgentContext must be used within a VoiceAgentProvider");
  }
  return ctx;
}
