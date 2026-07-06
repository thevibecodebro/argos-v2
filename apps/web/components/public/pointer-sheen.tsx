"use client";

import { useEffect } from "react";

// Cursor-aware specular highlight for elements marked with data-sheen.
// Purely decorative: one delegated listener, fine pointers only, disabled
// for reduced-motion users, and the page renders identically without it.
export function PointerSheen() {
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) {
      return;
    }

    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    function paint() {
      frame = 0;

      if (!lastEvent) {
        return;
      }

      const target = (lastEvent.target as Element | null)?.closest<HTMLElement>("[data-sheen]");

      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      target.style.setProperty("--sheen-x", `${lastEvent.clientX - rect.left}px`);
      target.style.setProperty("--sheen-y", `${lastEvent.clientY - rect.top}px`);
      target.style.setProperty("--sheen-opacity", "1");
    }

    function handleMove(event: PointerEvent) {
      lastEvent = event;

      if (!frame) {
        frame = window.requestAnimationFrame(paint);
      }
    }

    function handleOut(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-sheen]");
      target?.style.setProperty("--sheen-opacity", "0");
    }

    document.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerout", handleOut, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerout", handleOut);
    };
  }, []);

  return null;
}
