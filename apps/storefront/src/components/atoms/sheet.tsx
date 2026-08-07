"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import useLockHtmlScroll from "@lib/hooks/use-lock-html-scroll";
import { cn } from "@lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "bg-foreground/40 undefined-state-open:animate-in undefined-state-closed:animate-out undefined-state-closed:fade-out-0 undefined-state-open:fade-in-0 fixed inset-0 z-50 backdrop-blur-[3px]",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-6 overflow-y-auto overscroll-contain bg-background p-6 shadow-2xl transition-[transform,opacity] ease-in-out undefined-state-closed:duration-300 undefined-state-open:duration-400 undefined-state-open:animate-in undefined-state-closed:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b undefined-state-closed:slide-out-to-top undefined-state-open:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t undefined-state-closed:slide-out-to-bottom undefined-state-open:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-full max-w-md border-r undefined-state-closed:slide-out-to-left undefined-state-open:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-full max-w-md border-l undefined-state-closed:slide-out-to-right undefined-state-open:slide-in-from-right",
      },
    },
    defaultVariants: { side: "right" },
  }
);

export interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      children,
      onOpenAutoFocus,
      onCloseAutoFocus,
      ...props
    },
    ref
  ) => {
    const { lock, unlock } = useLockHtmlScroll();
    return (
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          data-lenis-prevent
          onOpenAutoFocus={(e) => {
            lock();
            onOpenAutoFocus?.(e);
          }}
          onCloseAutoFocus={(e) => {
            unlock();
            onCloseAutoFocus?.(e);
          }}
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-2 right-2 grid size-11 place-items-center rounded-md transition-[background-color,color,opacity] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none">
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Închide</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

export const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-foreground pr-12 text-xl leading-tight font-semibold tracking-tight text-balance",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-muted-foreground text-base leading-relaxed", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
