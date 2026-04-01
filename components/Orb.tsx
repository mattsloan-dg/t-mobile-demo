"use client";

interface OrbProps {
  state: "idle" | "listening" | "thinking" | "speaking";
}

export default function Orb({ state }: OrbProps) {
  return (
    <>
      <style>{`
        /* T-Mobile Orb Animations */
        @keyframes orb-idle {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(226, 0, 116, 0.3)); }
          50% { transform: scale(1.03); filter: drop-shadow(0 0 25px rgba(226, 0, 116, 0.5)); }
        }

        @keyframes orb-listen-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(226, 0, 116, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 35px rgba(226, 0, 116, 0.9)); transform: scale(1.04); }
        }

        @keyframes orb-think-rotate {
          0% { transform: rotate(0deg); filter: drop-shadow(0 0 15px rgba(226, 0, 116, 0.4)); }
          50% { filter: drop-shadow(0 0 25px rgba(255, 77, 166, 0.7)); }
          100% { transform: rotate(360deg); filter: drop-shadow(0 0 15px rgba(226, 0, 116, 0.4)); }
        }

        @keyframes orb-speak-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(226, 0, 116, 0.6)); }
          25% { transform: scale(1.06); filter: drop-shadow(0 0 35px rgba(226, 0, 116, 0.9)); }
          50% { transform: scale(0.98); filter: drop-shadow(0 0 25px rgba(226, 0, 116, 0.7)); }
          75% { transform: scale(1.04); filter: drop-shadow(0 0 30px rgba(226, 0, 116, 0.8)); }
        }

        @keyframes ring-expand {
          0% { r: 42; opacity: 0.4; }
          100% { r: 80; opacity: 0; }
        }

        @keyframes speak-sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        .orb-idle { animation: orb-idle 3s ease-in-out infinite; }
        .orb-listen { animation: orb-listen-glow 1.5s ease-in-out infinite; }
        .orb-think { animation: orb-think-rotate 2.5s linear infinite; }
        .orb-speak { animation: orb-speak-pulse 1.2s ease-in-out infinite; }
        .ring-1 { animation: ring-expand 2s ease-out infinite; }
        .ring-2 { animation: ring-expand 2s ease-out infinite 0.66s; }
        .ring-3 { animation: ring-expand 2s ease-out infinite 1.33s; }
        .sparkle-1 { animation: speak-sparkle 1s ease-in-out infinite; }
        .sparkle-2 { animation: speak-sparkle 1s ease-in-out infinite 0.33s; }
        .sparkle-3 { animation: speak-sparkle 1s ease-in-out infinite 0.66s; }

        @media (prefers-reduced-motion: reduce) {
          .orb-idle, .orb-listen, .orb-think, .orb-speak,
          .ring-1, .ring-2, .ring-3,
          .sparkle-1, .sparkle-2, .sparkle-3 {
            animation: none;
            transform: none !important;
            filter: drop-shadow(0 0 15px rgba(226, 0, 116, 0.4));
          }
        }
      `}</style>

      <div className="relative flex items-center justify-center w-[240px] h-[240px]">
        <svg
          viewBox="0 0 160 160"
          className={`w-40 h-40 transition-all duration-300 ${
            state === "idle" ? "orb-idle" :
            state === "listening" ? "orb-listen" :
            state === "thinking" ? "orb-think" :
            "orb-speak"
          }`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="orb-gradient" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#FF4DA6" />
              <stop offset="50%" stopColor="#E20074" />
              <stop offset="100%" stopColor="#99004D" />
            </radialGradient>
            <radialGradient id="orb-highlight" cx="40%" cy="35%" r="40%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
          </defs>

          {/* Expanding rings (visible during listening and speaking) */}
          {(state === "listening" || state === "speaking") && (
            <>
              <circle cx="80" cy="80" r="42" fill="none" stroke="#E20074" strokeWidth="1" className="ring-1" />
              <circle cx="80" cy="80" r="42" fill="none" stroke="#E20074" strokeWidth="0.8" className="ring-2" />
              <circle cx="80" cy="80" r="42" fill="none" stroke="#E20074" strokeWidth="0.6" className="ring-3" />
            </>
          )}

          {/* Outer glow ring */}
          <circle cx="80" cy="80" r="50" fill="none" stroke="#E20074" strokeWidth="0.5" opacity="0.2" />

          {/* Main orb */}
          <circle cx="80" cy="80" r="40" fill="url(#orb-gradient)" />

          {/* Highlight reflection */}
          <circle cx="80" cy="80" r="40" fill="url(#orb-highlight)" />

          {/* Inner accent ring */}
          <circle cx="80" cy="80" r="34" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.5" />
        </svg>

        {/* Sparkle particles when speaking */}
        {state === "speaking" && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-tm-magenta-light shadow-[0_0_10px_#FF4DA6] sparkle-1" />
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] sparkle-2" />
            <div className="absolute bottom-1/3 left-1/4 w-2.5 h-2.5 rounded-full bg-tm-magenta shadow-[0_0_12px_#E20074] sparkle-3" />
          </div>
        )}
      </div>
    </>
  );
}
