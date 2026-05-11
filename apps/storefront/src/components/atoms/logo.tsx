import * as React from "react";

import { cn } from "@lib/utils";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  showWordmark?: boolean;
}

export const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, showWordmark = true, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 200 44"
      role="img"
      aria-label="DYLLU"
      className={cn("h-7 w-auto", className)}
      {...props}
    >
      <g>
        <rect
          x="2"
          y="6"
          width="32"
          height="32"
          rx="6"
          className="fill-primary"
        />
        <path
          d="M11 14h7c4.418 0 8 3.582 8 8s-3.582 8-8 8h-7V14zm4.2 4v8H18a4 4 0 0 0 0-8h-2.8z"
          className="fill-primary-foreground"
        />
      </g>
      {showWordmark && (
        <text
          x="44"
          y="29"
          className="fill-current"
          style={{
            fontFamily: "var(--font-display), Inter, sans-serif",
            fontWeight: 800,
            fontSize: "22px",
            letterSpacing: "0.02em",
          }}
        >
          DYLLU
        </text>
      )}
    </svg>
  )
);
Logo.displayName = "Logo";
