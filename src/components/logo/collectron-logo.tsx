
"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes orbit-1 {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes orbit-2 {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
           @keyframes pulse-in {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.95); opacity: 0.9; }
          }
          .collectron-main-coin {
            animation: pulse-in 5s ease-in-out infinite;
          }
          .collectron-orbit-1 {
            animation: orbit-1 10s linear infinite;
          }
          .collectron-orbit-2 {
            animation: orbit-2 15s linear infinite;
          }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="collectron-main-coin" style={{ transformOrigin: '50% 50%' }}>
            {/* Main Coin Body */}
            <circle cx="50" cy="50" r="28" fill="hsl(var(--primary) / 0.2)" />
            <circle cx="50" cy="50" r="28" stroke="hsl(var(--primary))" strokeWidth="4" />
            
            {/* Indian Rupee Symbol (₹) */}
            <g stroke="hsl(var(--primary))" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M38 42H62" />
                <path d="M38 52H62" />
                <path d="M43 62C43 62 43 52 50 52C57 52 57 62 57 62" />
                <path d="M50 52V38" />
            </g>
        </g>
        
        {/* Orbiting Coins */}
        <g className="collectron-orbit-1" style={{ transformOrigin: '50% 50%' }}>
            <circle cx="15" cy="50" r="5" fill="hsl(var(--accent))" />
            <circle cx="85" cy="50" r="5" fill="hsl(var(--accent))" opacity="0.6" />
        </g>
         <g className="collectron-orbit-2" style={{ transformOrigin: '50% 50%' }}>
            <circle cx="50" cy="8" r="7" fill="hsl(var(--secondary))" />
        </g>

      </svg>
    </div>
  );
};

export { CollectronLogo };
