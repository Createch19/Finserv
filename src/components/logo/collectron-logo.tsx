
"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes draw-in {
            from {
              stroke-dashoffset: 100;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes grow-bar {
              from {
                  transform: scaleY(0);
              }
              to {
                  transform: scaleY(1);
              }
          }
          @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
          }

          .collectron-circle {
              stroke-dasharray: 100;
              animation: draw-in 1.5s ease-out forwards;
          }
          .collectron-bar-1 {
              transform-origin: bottom;
              animation: grow-bar 0.8s ease-out 0.5s forwards;
          }
           .collectron-bar-2 {
              transform-origin: bottom;
              animation: grow-bar 1s ease-out 0.7s forwards;
          }
           .collectron-bar-3 {
              transform-origin: bottom;
              animation: grow-bar 1.2s ease-out 0.9s forwards;
          }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Enclosing Circle */}
        <circle 
            cx="50" 
            cy="50" 
            r="45" 
            stroke="hsl(var(--primary) / 0.7)" 
            strokeWidth="5" 
            className="collectron-circle"
        />

        {/* Growing Bars */}
        <g>
            <rect 
                x="25" 
                y="50" 
                width="12" 
                height="25" 
                fill="hsl(var(--secondary))" 
                className="collectron-bar-1"
                rx="2"
            />
            <rect 
                x="44" 
                y="35" 
                width="12" 
                height="40" 
                fill="hsl(var(--primary))" 
                className="collectron-bar-2"
                 rx="2"
            />
            <rect 
                x="63" 
                y="25" 
                width="12" 
                height="50" 
                fill="hsl(var(--accent))" 
                className="collectron-bar-3"
                 rx="2"
            />
        </g>
      </svg>
    </div>
  );
};

export { CollectronLogo };
