"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "./forge";

type ForgeDialogProps = {
  children?: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getAttribute("aria-hidden") !== "true" &&
      Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
  );
}

function focusWithoutScroll(element: HTMLElement) {
  element.focus({ preventScroll: true });
}

export function ForgeDialog({
  children,
  className,
  description,
  footer,
  onOpenChange,
  open,
  title,
}: ForgeDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;

  onOpenChangeRef.current = onOpenChange;

  const requestClose = useCallback(() => {
    onOpenChangeRef.current(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocusedElement = document.activeElement;
    previousFocusRef.current =
      previouslyFocusedElement instanceof HTMLElement ? previouslyFocusedElement : null;

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusableElements = getFocusableElements(panel);
    focusWithoutScroll(focusableElements[0] ?? panel);

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const currentPanel = panelRef.current;
      if (!currentPanel) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusableElements = getFocusableElements(currentPanel);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        focusWithoutScroll(currentPanel);
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsInsidePanel =
        activeElement instanceof HTMLElement && currentPanel.contains(activeElement);

      if (!focusIsInsidePanel) {
        event.preventDefault();
        focusWithoutScroll(event.shiftKey ? lastElement : firstElement);
        return;
      }

      if (event.shiftKey && (activeElement === firstElement || activeElement === currentPanel)) {
        event.preventDefault();
        focusWithoutScroll(lastElement);
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        focusWithoutScroll(firstElement);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      const previousFocus = previousFocusRef.current;
      if (previousFocus && document.contains(previousFocus)) {
        focusWithoutScroll(previousFocus);
      }
      previousFocusRef.current = null;
    };
  }, [open]);

  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  }, [requestClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="forge-dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,4,3,0.78)] px-4 py-6 text-[var(--forge-text)] backdrop-blur-sm"
      data-forge-dialog-overlay="true"
      onClick={handleBackdropClick}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "forge-dialog-panel forge-surface flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-[var(--forge-border-strong)] bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-[0_30px_100px_rgba(5,3,2,0.5)]",
          className,
        )}
        data-forge-dialog-panel="true"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex flex-none items-start justify-between gap-4 border-b border-[var(--forge-border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              className="font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]"
              id={titleId}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="forge-focus-ring forge-icon-button inline-flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--forge-gold)] transition hover:border-[rgba(241,191,123,0.35)] hover:bg-[rgba(241,191,123,0.1)]"
            onClick={requestClose}
            type="button"
          >
            <ForgeIcon name="close" size={18} />
          </button>
        </div>
        {children != null ? (
          <div
            className="forge-dialog-body min-h-0 overflow-y-auto px-5 py-5 sm:px-6"
            data-forge-dialog-body="true"
          >
            {children}
          </div>
        ) : null}
        {footer != null ? (
          <div className="flex flex-none flex-wrap items-center justify-end gap-3 border-t border-[var(--forge-border)] px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
