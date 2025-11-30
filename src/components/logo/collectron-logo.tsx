"use client";

import { cn } from "@/lib/utils";

const CollectronLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative h-12 w-12", className)}>
      <style>
        {`
          @keyframes float-up {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
          @keyframes float-down {
            0% { transform: translateY(0px); }
            50% { transform: translateY(5px); }
            100% { transform: translateY(0px); }
          }
          .shape-1 { animation: float-up 4s ease-in-out infinite; }
          .shape-2 { animation: float-down 4s ease-in-out infinite 1s; }
          .shape-3 { animation: float-up 4s ease-in-out infinite 2s; }
        `}
      </style>
      <svg
        className="w-full h-full"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="shape-1"
          d="M8 26.5L8 13L21.5 6L35 13L35 26.5L21.5 33.5L8 26.5Z"
          fill="hsl(var(--primary) / 0.8)"
        />
        <path
          className="shape-2"
          d="M21.5 42L8 35V31L21.5 38L35 31V35L21.5 42Z"
          fill="hsl(var(--accent) / 0.9)"
        />
         <path
          className="shape-3"
          d="M40 24.5L40 11L26.5 4L13 11L13 24.5L26.5 31.5L40 24.5Z"
          fill="hsl(var(--secondary))"
          style={{ mixBlendMode: "multiply", opacity: 0.8 }}
        />
      </svg>
    </div>
  );
};

export { CollectronLogo };
