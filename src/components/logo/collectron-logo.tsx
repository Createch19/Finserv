
"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes draw-path {
            from {
              stroke-dashoffset: 65;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes move-coin {
            0% {
              offset-distance: 0%;
              opacity: 0;
            }
            20% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
              offset-distance: 100%;
              opacity: 0;
            }
          }
          @keyframes pulse-center {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .collectron-path {
            stroke-dasharray: 65;
            animation: draw-path 3s ease-out infinite;
          }
          .collectron-coin {
            offset-path: path("M 65,50 A 15,15 0 1 1 50,35");
            animation: move-coin 3s ease-in-out infinite;
            transform-origin: center;
          }
          .collectron-center-pulse {
             animation-delay: 2.5s;
             animation: pulse-center 0.5s ease-out infinite;
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
        {/* The circular path */}
        <path 
            d="M 65,50 A 15,15 0 1 1 50,35 L 50,42" 
            stroke="hsl(var(--primary) / 0.4)" 
            strokeWidth="2"
        />
        <path
            d="M 45 40 L 50 35 L 55 40"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* The moving coin */}
        <circle className="collectron-coin" cx="0" cy="0" r="3" fill="hsl(var(--secondary))" />

        {/* Central Dollar Symbol */}
        <g stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="collectron-center-pulse">
            <path d="M50 58 V 72" />
            <path d="M56 62 C 56 59 52 58 50 60 C 48 62 44 65 44 68 C 44 71 48 72 50 70" />
        </g>
      </svg>
    </div>
  );
};

export { CollectronLogo };
