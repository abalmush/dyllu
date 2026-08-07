"use client";

import * as React from "react";
import { ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

const SCROLL_THRESHOLD_RATIO = 1;

export function ScrollToTopButton() {
  const [visible, setVisible] = React.useState(false);
  const lenis = useLenis();

  React.useEffect(() => {
    let ticking = false;

    const updateVisibility = () => {
      setVisible(window.scrollY > window.innerHeight * SCROLL_THRESHOLD_RATIO);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (lenis) {
      lenis.scrollTo(0, { immediate: prefersReducedMotion });
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div
      className={cn(
        "small:right-6 small:bottom-6 fixed right-4 bottom-24 z-40 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <Button
        variant="brand"
        size="icon"
        onClick={handleClick}
        className="clip-corner-cut-sm clip-shadow-md rounded-none"
        aria-label="Derulează spre început"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        data-testid="scroll-to-top-button"
      >
        <ChevronUp />
      </Button>
    </div>
  );
}
