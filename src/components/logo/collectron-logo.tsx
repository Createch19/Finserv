"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes rotate-one {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes rotate-two {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          @keyframes rotate-three {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .ring-1 { animation: rotate-one 20s linear infinite; transform-origin: center; }
          .ring-2 { animation: rotate-two 30s linear infinite; transform-origin: center; }
          .ring-3 { animation: rotate-three 40s linear infinite; transform-origin: center; }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="ring-1">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="hsl(var(--primary) / 0.8)"
            strokeWidth="6"
            strokeDasharray="180 101.06"
            strokeLinecap="round"
            transform="rotate(-45 50 50)"
          />
        </g>
        <g className="ring-2">
          <circle
            cx="50"
            cy="50"
            r="35"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
            strokeDasharray="130 89.54"
            strokeLinecap="round"
            transform="rotate(60 50 50)"
          />
        </g>
        <g className="ring-3">
          <circle
            cx="50"
            cy="50"
            r="25"
            stroke="hsl(var(--accent) / 0.9)"
            strokeWidth="6"
            strokeDasharray="80 77.12"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </g>
      </svg>
    </div>
  );
};

export { CollectronLogo };
