import { useCallback, useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

type Lenis = ReturnType<typeof useLenis>;

let lockCount = 0;

function applyLock(lenis: Lenis) {
  lockCount += 1;
  document.documentElement.style.overflow = "hidden";
  lenis?.stop();
}

function releaseLock(lenis: Lenis) {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    lenis?.start();
  }
}

export default function useLockHtmlScroll() {
  const lenis = useLenis();
  const lockedRef = useRef(false);

  const lock = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    applyLock(lenis);
  }, [lenis]);

  const unlock = useCallback(() => {
    if (!lockedRef.current) return;
    lockedRef.current = false;
    releaseLock(lenis);
  }, [lenis]);

  useEffect(
    () => () => {
      if (lockedRef.current) {
        lockedRef.current = false;
        releaseLock(lenis);
      }
    },
    [lenis]
  );

  return { lock, unlock };
}
