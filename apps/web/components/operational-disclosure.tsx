"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Secondary content stays mounted; desktop starts expanded, phone starts concise. */
export function OperationalDisclosure({ children, title }: { children: ReactNode; title: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 1280px)");
    const syncViewport = () => {
      if (detailsRef.current) detailsRef.current.open = viewport.matches;
    };
    syncViewport();
    viewport.addEventListener("change", syncViewport);
    return () => viewport.removeEventListener("change", syncViewport);
  }, []);

  return (
    <details className="mt-3 border-t border-[var(--forge-border)]" ref={detailsRef}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[var(--forge-text)] focus-visible:outline-2 focus-visible:outline-[var(--forge-focus)]">
        {title}
      </summary>
      <div className="space-y-3 pb-2">{children}</div>
    </details>
  );
}
