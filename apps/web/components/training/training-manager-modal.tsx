"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ForgeIcon } from "../forge";

type TrainingManagerModalProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function TrainingManagerModal({
  children,
  description,
  onClose,
  open,
  title,
}: TrainingManagerModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const getFocusableElements = () =>
      dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
          )
        : [];

    const focusTarget = getFocusableElements()[0] ?? dialog;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialog?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || !dialog?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--forge-overlay-bg)] px-3 py-3 sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-modal="true"
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col rounded-2xl bg-[var(--forge-surface)] p-4 shadow-[0_8px_24px_rgba(41,40,39,0.12)] sm:p-6"
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--forge-text)]" id={titleId}>
              {title}
            </h2>
            <p className="mt-2 text-sm text-[var(--forge-muted)]" id={descriptionId}>
              {description}
            </p>
          </div>
          <button
            aria-label="Close manager modal"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)] p-2 text-[var(--forge-muted)] transition hover:text-[var(--forge-text)]"
            onClick={onClose}
            type="button"
          >
            <ForgeIcon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 min-h-0 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
