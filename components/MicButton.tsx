"use client";

interface MicButtonProps {
  isActive: boolean;
  isMuted?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function MicButton({ isActive, isMuted = false, onClick, disabled = false }: MicButtonProps) {
  return (
    <>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(226,0,116,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(226,0,116,0); }
        }
        .mic-active-pulse {
          animation: mic-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={!isActive ? "Start microphone" : isMuted ? "Unmute microphone" : "Mute microphone"}
        className={`
          relative flex items-center justify-center rounded-full
          transition-all duration-300 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-tm-magenta focus-visible:ring-offset-2 focus-visible:ring-offset-tm-darker
          ${disabled
            ? "w-8 h-8 bg-tm-card border border-tm-border cursor-not-allowed opacity-50"
            : isActive && !isMuted
              ? "w-8 h-8 bg-tm-magenta cursor-pointer hover:bg-tm-magenta-hover mic-active-pulse"
              : isActive && isMuted
                ? "w-8 h-8 bg-tm-dark border border-red-500/60 cursor-pointer hover:bg-tm-card"
                : "w-8 h-8 bg-tm-dark border border-tm-magenta cursor-pointer hover:bg-tm-card"
          }
        `}
      >
        {/* Microphone icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-colors duration-300 ${
            disabled
              ? "text-tm-text-secondary"
              : isActive && !isMuted
                ? "text-white"
                : isActive && isMuted
                  ? "text-red-400"
                  : "text-tm-magenta"
          }`}
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
          {/* Strike-through line when muted */}
          {isMuted && <line x1="2" y1="2" x2="22" y2="22" />}
        </svg>

        {/* Active indicator ring (visible when active and unmuted) */}
        {isActive && !isMuted && !disabled && (
          <span className="absolute inset-0 rounded-full border-2 border-tm-magenta opacity-50" />
        )}
      </button>
    </>
  );
}
