"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "bg-foreground text-background undefined-state-delayed-open:animate-in undefined-state-closed:animate-out undefined-state-closed:fade-out-0 undefined-state-delayed-open:fade-in-0 undefined-state-closed:zoom-out-95 undefined-state-delayed-open:zoom-in-95 undefined-side-bottom:slide-in-from-top-1 undefined-side-left:slide-in-from-right-1 undefined-side-right:slide-in-from-left-1 undefined-side-top:slide-in-from-bottom-1 z-50 overflow-hidden rounded-md px-4 py-2 text-sm font-medium shadow-lg",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
