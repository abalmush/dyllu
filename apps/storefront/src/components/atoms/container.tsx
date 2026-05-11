import * as React from "react";

import { cn } from "@lib/utils";

export const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mx-auto w-full max-w-[1440px] px-4 small:px-6 medium:px-10",
      className
    )}
    {...props}
  />
));
Container.displayName = "Container";
