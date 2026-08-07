import { useEffect } from "react";

let lockCount = 0;

export default function useLockHtmlScroll() {
  useEffect(() => {
    // Radix locks scroll on <body> only, but this app scrolls via <html>; reference-counted for stacked dialogs.
    lockCount += 1;
    document.documentElement.style.overflow = "hidden";
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.documentElement.style.overflow = "";
      }
    };
  }, []);
}
