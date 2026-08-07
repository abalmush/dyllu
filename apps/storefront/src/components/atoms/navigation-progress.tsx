"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";

const SHOW_DELAY_MS = 120;
const FINISH_DELAY_MS = 180;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const initialRoute = React.useRef(true);
  const active = React.useRef(false);
  const showTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const finishTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const progressTimer = React.useRef<ReturnType<typeof setInterval>>(undefined);
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const stopTimers = React.useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(finishTimer.current);
    clearInterval(progressTimer.current);
  }, []);

  const start = React.useCallback(() => {
    stopTimers();
    active.current = true;
    setProgress(0);

    showTimer.current = setTimeout(() => {
      setVisible(true);
      setProgress(24);
      progressTimer.current = setInterval(() => {
        setProgress((current) =>
          Math.min(88, current + Math.max(1, (88 - current) * 0.12))
        );
      }, 220);
    }, SHOW_DELAY_MS);
  }, [stopTimers]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname &&
          destination.search === current.search)
      ) {
        return;
      }

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  React.useEffect(() => {
    if (initialRoute.current) {
      initialRoute.current = false;
      return;
    }

    stopTimers();
    if (!active.current) return;

    active.current = false;
    setProgress(100);
    finishTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, FINISH_DELAY_MS);
  }, [routeKey, stopTimers]);

  React.useEffect(() => stopTimers, [stopTimers]);

  return (
    <span
      role="progressbar"
      aria-label="Se încarcă pagina"
      aria-hidden={!visible}
      className="pointer-events-none absolute inset-x-0 -bottom-px z-50 h-0.5 overflow-hidden"
    >
      <span
        className="bg-primary block h-full origin-left shadow-[0_0_8px_hsl(var(--primary))] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </span>
  );
}
