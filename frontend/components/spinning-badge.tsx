import React from "react";

interface SpinningBadgeProps {
  text: string;
}

export const SpinningBadge = ({ text }: SpinningBadgeProps) => {
  // To create a circular text, we use SVG and place text on a path.
  // The path is a circle with a radius of 40 (diameter 80), centered at 50,50.
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Center dot/star or icon could go here if needed */}
      <div className="absolute w-2 h-2 rounded-full bg-primary" />
      
      {/* Spinning SVG */}
      <svg
        className="w-full h-full animate-[spin_10s_linear_infinite]"
        viewBox="0 0 100 100"
      >
        <path
          id="textPath"
          d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
          fill="none"
        />
        <text className="text-[14px] uppercase font-bold tracking-[0.25em] fill-foreground">
          <textPath href="#textPath" startOffset="0%">
            {text} • {text} • 
          </textPath>
        </text>
      </svg>
    </div>
  );
};
