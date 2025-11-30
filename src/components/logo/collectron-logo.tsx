
"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes orbit-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes orbit-ccw {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes pulse-subtle {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.95; }
          }
          .collectron-rupee-symbol {
            animation: pulse-subtle 6s ease-in-out infinite;
          }
          .collectron-orbit-1 {
            animation: orbit-cw 12s linear infinite;
          }
          .collectron-orbit-2 {
            animation: orbit-ccw 18s linear infinite;
          }
           @keyframes sparkle-pulse {
            0%, 100% { transform: scale(1); fill-opacity: 0.7; }
            50% { transform: scale(1.3); fill-opacity: 1; }
          }
          .collectron-sparkle {
            animation: sparkle-pulse 2s ease-in-out infinite;
            transform-origin: center;
          }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Orbits */}
        <g className="collectron-orbit-1" style={{ transformOrigin: '50% 50%' }}>
            <ellipse cx="50" cy="50" rx="40" ry="20" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5"/>
        </g>
        <g className="collectron-orbit-2" style={{ transformOrigin: '50% 50%' }}>
            <ellipse cx="50" cy="50" rx="25" ry="45" stroke="hsl(var(--accent) / 0.4)" strokeWidth="1.5"/>
            <path d="M72 38 L74 36 L76 38 L74 40 Z" fill="hsl(var(--secondary))" className="collectron-sparkle" />
        </g>

        {/* Rupee Symbol */}
        <g className="collectron-rupee-symbol" style={{ transformOrigin: '50% 50%' }} stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M38 40H62" />
            <path d="M38 50H62" />
            <path d="M44 68C44 68 44 50 51 50C58 50 64 55 64 62" />
            <path d="M51 50V32" />
        </g>

      </svg>
    </div>
  );
};

export { CollectronLogo };
