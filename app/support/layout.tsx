import type { ReactNode } from "react";
import SupportFooter from "@/components/SupportFooter";
import TopNav from "@/components/TopNav";
import VoiceWidget from "@/components/VoiceWidget";
import WebSocketLogWidget from "@/components/WebSocketLog";
import { VoiceAgentProvider } from "@/lib/voice-agent-context";
import { getCategories } from "@/lib/articles";

export default function SupportLayout({ children }: { children: ReactNode }) {
  const categories = getCategories().filter(
    (category) => category.articles.length > 0
  );

  return (
    <VoiceAgentProvider>
      <div className="min-h-screen bg-white text-[#1a1a1a]">
        <TopNav categories={categories} />
        <main>{children}</main>
        <SupportFooter />
        <VoiceWidget />
        <WebSocketLogWidget />
      </div>
    </VoiceAgentProvider>
  );
}
