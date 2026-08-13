"use client";

import { useEffect, useState } from "react";

/**
 * True when the primary input can hover with a fine pointer (mouse/trackpad),
 * false on touch-only devices. Used to gate cursor-driven decoration so it
 * never fires on mobile/tablet.
 */
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return canHover;
}
