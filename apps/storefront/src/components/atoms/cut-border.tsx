import * as React from "react";

import { cn } from "@lib/utils";

const CLIP = {
  xs: "clip-corner-cut-xs",
  sm: "clip-corner-cut-sm",
  md: "clip-corner-cut-md",
  lg: "clip-corner-cut-lg",
} as const;

type CutBorderProps = Omit<React.HTMLAttributes<HTMLDivElement>, "style"> & {
  clip?: keyof typeof CLIP;
  width?: number;
  borderClassName?: string;
  fillClassName?: string;
  innerClassName?: string;
};

export function CutBorder({
  clip = "lg",
  width = 1,
  borderClassName = "bg-border",
  fillClassName = "bg-card",
  innerClassName,
  className,
  children,
  ...rest
}: CutBorderProps) {
  const clipClass = CLIP[clip];
  return (
    <div
      className={cn(clipClass, borderClassName, className)}
      style={{ padding: width }}
      {...rest}
    >
      <div className={cn(clipClass, fillClassName, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
