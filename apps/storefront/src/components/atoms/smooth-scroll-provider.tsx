"use client";

import * as React from "react";
import { ReactLenis } from "lenis/react";

export interface SmoothScrollProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  disableOnTouch?: boolean;
  lerp?: number;
}

export function SmoothScrollProvider({
  children,
  enabled = true,
  disableOnTouch = false,
  lerp = 0.1,
}: SmoothScrollProviderProps) {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      setActive(false);
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const compute = () => {
      if (reducedMotion.matches) return false;
      if (disableOnTouch && coarsePointer.matches) return false;
      return true;
    };
    setActive(compute());
    const onChange = () => setActive(compute());
    reducedMotion.addEventListener("change", onChange);
    coarsePointer.addEventListener("change", onChange);
    return () => {
      reducedMotion.removeEventListener("change", onChange);
      coarsePointer.removeEventListener("change", onChange);
    };
  }, [enabled, disableOnTouch]);

  if (!active) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
