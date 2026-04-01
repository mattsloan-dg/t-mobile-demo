"use client";

import { useState, useRef, useEffect } from "react";

interface SettingsPanelProps {
  currentVoice: string;
  currentLlm: string;
  onVoiceChange: (voice: string) => void;
  onLlmChange: (llm: string) => void;
}

const VOICE_OPTIONS = [
  { label: "Thalia (Energetic)", value: "aura-2-thalia-en" },
  { label: "Andromeda (Expressive)", value: "aura-2-andromeda-en" },
  { label: "Helena (Caring)", value: "aura-2-helena-en" },
  { label: "Apollo (Confident)", value: "aura-2-apollo-en" },
  { label: "Athena (Professional)", value: "aura-2-athena-en" },
  { label: "Orion (Warm)", value: "aura-2-orion-en" },
  { label: "Luna (Gentle)", value: "aura-2-luna-en" },
  { label: "Draco (British)", value: "aura-2-draco-en" },
  { label: "Asteria (Friendly)", value: "aura-2-asteria-en" },
];

const LLM_OPTIONS = [
  { label: "Claude Sonnet 4", value: "anthropic:claude-sonnet-4-20250514", provider: "anthropic" },
  { label: "Claude 3.5 Haiku", value: "anthropic:claude-3-5-haiku-latest", provider: "anthropic" },
  { label: "GPT-4o", value: "open_ai:gpt-4o", provider: "open_ai" },
  { label: "GPT-4o Mini", value: "open_ai:gpt-4o-mini", provider: "open_ai" },
  { label: "Gemini 2.0 Flash", value: "google:gemini-2.0-flash", provider: "google" },
];

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#D97757",
  open_ai: "#10A37F",
  google: "#4285F4",
};

/* ------------------------------------------------------------------ */
/*  Custom Dropdown                                                    */
/* ------------------------------------------------------------------ */

interface DropdownOption {
  label: string;
  value: string;
  provider?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  id: string;
}

function CustomDropdown({ options, value, onChange, id }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" id={id}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-tm-card border rounded-lg px-3.5 py-2.5
          text-sm text-tm-text text-left
          transition-colors duration-150 cursor-pointer
          ${open ? "border-tm-magenta ring-1 ring-tm-magenta/30" : "border-tm-border hover:border-tm-text-secondary"}
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {/* Provider dot for LLM options */}
          {selected?.provider && (
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: PROVIDER_COLORS[selected.provider] ?? "#9DA0A4" }}
            />
          )}
          {selected?.label ?? "Select..."}
        </span>
        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 text-tm-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <ul
          className="
            absolute z-50 mt-1 w-full
            bg-tm-card border border-tm-border rounded-lg
            shadow-lg shadow-black/30
            py-1 max-h-64 overflow-y-auto
          "
          role="listbox"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left
                    transition-colors cursor-pointer
                    ${isSelected ? "bg-tm-magenta/10 text-tm-magenta" : "text-tm-text hover:bg-tm-border/40"}
                  `}
                >
                  {/* Provider dot */}
                  {opt.provider && (
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PROVIDER_COLORS[opt.provider] ?? "#9DA0A4" }}
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                  {/* Check mark */}
                  {isSelected && (
                    <svg
                      className="ml-auto flex-shrink-0 text-tm-magenta"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SettingsPanel                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPanel({
  currentVoice,
  currentLlm,
  onVoiceChange,
  onLlmChange,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-0 p-5">
      {/* ---- Voice Selector ---- */}
      <section>
        <label
          htmlFor="voice-select"
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-tm-text-secondary mb-3"
        >
          {/* Speaker icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tm-text-secondary"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Voice
        </label>
        <CustomDropdown
          id="voice-select"
          options={VOICE_OPTIONS}
          value={currentVoice}
          onChange={onVoiceChange}
        />
        <p className="mt-2 text-xs text-tm-text-secondary/70 leading-relaxed">
          Deepgram Aura-2 text-to-speech voices
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-tm-border my-5" />

      {/* ---- LLM Selector ---- */}
      <section>
        <label
          htmlFor="llm-select"
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-tm-text-secondary mb-3"
        >
          {/* Brain/chip icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tm-text-secondary"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
            <path d="M15 2v2" />
            <path d="M15 20v2" />
            <path d="M2 15h2" />
            <path d="M2 9h2" />
            <path d="M20 15h2" />
            <path d="M20 9h2" />
            <path d="M9 2v2" />
            <path d="M9 20v2" />
          </svg>
          Language Model
        </label>
        <CustomDropdown
          id="llm-select"
          options={LLM_OPTIONS}
          value={currentLlm}
          onChange={onLlmChange}
        />
        <p className="mt-2 text-xs text-tm-text-secondary/70 leading-relaxed">
          The AI model powering conversation responses
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-tm-border my-5" />

      {/* ---- STT Model Display ---- */}
      <section>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-tm-text-secondary mb-3">
          {/* Microphone icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tm-text-secondary"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Speech Recognition
        </div>
        <div className="flex items-center justify-between bg-tm-card border border-tm-border rounded-lg px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            {/* Green status dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tm-magenta opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tm-magenta" />
            </span>
            <span className="text-sm text-tm-text font-medium">
              Deepgram Nova-3
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-tm-magenta/15 text-tm-magenta px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
        <p className="mt-2 text-xs text-tm-text-secondary/70 leading-relaxed">
          Real-time speech-to-text transcription
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-tm-border my-5" />

      {/* ---- Info note ---- */}
      <div className="flex gap-2.5 bg-tm-card/60 border border-tm-border/50 rounded-lg px-3.5 py-3">
        {/* Info icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-tm-text-secondary flex-shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-xs text-tm-text-secondary leading-relaxed">
          Voice changes take effect immediately. LLM changes require reconnection.
        </p>
      </div>
    </div>
  );
}

export { VOICE_OPTIONS, LLM_OPTIONS };
export type { SettingsPanelProps };
