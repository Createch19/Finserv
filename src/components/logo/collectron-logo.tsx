
"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-24 w-24", className)}>
      <style>
        {`
          .collectron-bar {
            transform-origin: bottom;
            animation: grow-bar 1.5s ease-out forwards;
          }
          #collectron-bar-1 { animation-delay: 0s; }
          #collectron-bar-2 { animation-delay: 0.2s; }
          #collectron-bar-3 { animation-delay: 0.4s; }

          @keyframes grow-bar {
            from { transform: scaleY(0); }
            to { transform: scaleY(1); }
          }

          .collectron-trend-line {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: draw-line 1s ease-out forwards 0.8s;
          }

          @keyframes draw-line {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bars */}
        <rect id="collectron-bar-1" className="collectron-bar" x="20" y="50" width="15" height="30" rx="3" fill="hsl(var(--primary) / 0.7)" />
        <rect id="collectron-bar-2" className="collectron-bar" x="42.5" y="35" width="15" height="45" rx="3" fill="hsl(var(--primary))" />
        <rect id="collectron-bar-3" className="collectron-bar" x="65" y="20" width="15" height="60" rx="3" fill="hsl(var(--primary) / 0.7)" />

        {/* Trend Line */}
        <path
          className="collectron-trend-line"
          d="M 15 65 L 50 30 L 85 45"
          stroke="hsl(var(--secondary))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow Head for the trend line */}
        <path
           className="collectron-trend-line"
           d="M 78 41 L 85 45 L 81 52"
           stroke="hsl(var(--secondary))"
           strokeWidth="5"
           strokeLinecap="round"
           strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export { CollectronLogo };
