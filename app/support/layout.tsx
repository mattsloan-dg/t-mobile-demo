import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import SupportFooter from "@/components/SupportFooter";
import TopNav from "@/components/TopNav";
import VoiceWidget from "@/components/VoiceWidget";
import { getCategories } from "@/lib/articles";

export default function SupportLayout({ children }: { children: ReactNode }) {
  const categories = getCategories().filter(
    (category) => category.articles.length > 0
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1d2329]">
      <TopNav />
      <div className="mx-auto flex w-full max-w-[1280px] pt-11">
        <Sidebar categories={categories} />
        <main className="min-h-[calc(100vh-2.75rem)] flex-1">{children}</main>
      </div>
      <SupportFooter />
      <VoiceWidget />
    </div>
  );
}
