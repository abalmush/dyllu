import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5",
  {
    variants: {
      variant: {
        default: "hover:bg-current/10",
        ghost: "hover:bg-current/10",
        outline: "border border-current/20 hover:bg-current/10",
        solid:
          "bg-foreground text-background hover:bg-foreground/90 [&_svg]:text-background",
      },
      size: {
        sm: "size-9",
        md: "size-10",
        lg: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    badge?: number;
    label: string;
  };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, badge, label, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn("relative", iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  )
);
IconButton.displayName = "IconButton";
