"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ScrollToActiveStep() {
  const step = useSearchParams().get("step");
  const previousStep = useRef<string | null>(null);

  useEffect(() => {
    if (!step || previousStep.current === step) {
      previousStep.current = step;
      return;
    }

    const isFirstRender = previousStep.current === null;
    previousStep.current = step;
    if (isFirstRender) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`[data-checkout-section="${step}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [step]);

  return null;
}
