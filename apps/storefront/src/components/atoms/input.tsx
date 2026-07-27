import * as React from "react";

import { cn } from "@lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "border-input bg-background text-foreground file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground flex h-12 w-full rounded-md border px-4 py-4 text-base shadow-xs transition-[border-color,box-shadow,background-color,color] file:border-0 file:bg-transparent file:text-base file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
