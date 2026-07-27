"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import { cn } from "@lib/utils";

export const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    delayDuration={120}
    skipDelayDuration={180}
    className={cn(
      "relative z-30 flex max-w-max flex-1 items-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

export const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center gap-1",
      className
    )}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

export const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md px-2.5 py-2 text-sm font-medium tracking-tight transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-muted undefined-state-open:bg-muted"
);

export const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}
    <ChevronDown
      className="group-undefined-state-open:rotate-180 relative top-px ml-1 size-3 transition duration-300"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

export const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out undefined-motion-from-end:slide-in-from-right-52 undefined-motion-from-start:slide-in-from-left-52 undefined-motion-to-end:slide-out-to-right-52 undefined-motion-to-start:slide-out-to-left-52 top-0 left-0 w-full md:absolute md:w-auto",
      className
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

export const NavigationMenuLink = NavigationMenuPrimitive.Link;

export const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div
    className={cn("absolute top-full left-0 z-50 flex w-full justify-center")}
  >
    <NavigationMenuPrimitive.Viewport
      ref={ref}
      className={cn(
        "origin-top-center h-undefined-navigation-menu-viewport text-popover-foreground undefined-state-open:animate-in undefined-state-closed:animate-out undefined-state-closed:fade-out-0 undefined-state-open:fade-in-0 undefined-state-closed:zoom-out-95 undefined-state-open:zoom-in-95 md:w-undefined-navigation-menu-viewport relative -mt-4 w-full overflow-visible bg-transparent",
        className
      )}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

export const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "undefined-state-visible:animate-in undefined-state-hidden:animate-out undefined-state-hidden:fade-out undefined-state-visible:fade-in top-full z-1 flex h-1.5 items-end justify-center overflow-hidden",
      className
    )}
    {...props}
  >
    <div className="bg-border relative top-[60%] size-2 rotate-45 rounded-tl-sm shadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName;

export { navigationMenuTriggerStyle };
