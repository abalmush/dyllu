"use client";

import * as React from "react";

export { toast } from "sonner";
export { Toaster } from "@/components/atoms/sonner";

export function useToggleState(initial = false) {
  const [state, setState] = React.useState<boolean>(initial);
  const open = React.useCallback(() => setState(true), []);
  const close = React.useCallback(() => setState(false), []);
  const toggle = React.useCallback(() => setState((s) => !s), []);
  return { state, open, close, toggle };
}
