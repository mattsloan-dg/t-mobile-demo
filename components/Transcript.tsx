"use client";

import { useEffect, useRef } from "react";

interface TranscriptProps {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export default function Transcript({ messages }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <p className="text-sm font-medium text-tm-text-secondary opacity-70">
          Click the mic to start speaking to Tara
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto px-4 pt-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ scrollBehavior: "smooth" }}
    >
      {messages.map((msg, i) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={i}
            className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {!isUser && (
              <div className="flex-shrink-0 mr-2 mt-auto mb-1">
                <div className="h-2 w-2 rounded-full bg-tm-magenta shadow-[0_0_8px_rgba(226,0,116,0.6)]" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm backdrop-blur-md ${
                isUser
                  ? "bg-white/10 text-white rounded-br-sm font-medium"
                  : "bg-transparent text-[#e8e9ea] rounded-bl-sm border border-white/5"
              }`}
            >
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
