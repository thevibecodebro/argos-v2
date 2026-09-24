"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Keep supporting details available without displacing the primary work on smaller screens. */
export function ResponsiveAside({ children, title }: { children: ReactNode; title: string }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 96rem)");
    const sync = () => { if (disclosure.current) disclosure.current.open = viewport.matches; };
    sync();
    viewport.addEventListener("change", sync);
    return () => viewport.removeEventListener("change", sync);
  }, []);
  return <details ref={disclosure} className="min-w-0">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[var(--forge-text)]">{title}</summary>
    {children}
  </details>;
}
