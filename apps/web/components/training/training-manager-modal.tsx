"use client";

import type { ReactNode } from "react";

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
  eyebrow,
  onClose,
  open,
  title,
}: TrainingManagerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div
        aria-modal="true"
        className="w-full max-w-4xl rounded-[1.5rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.4)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#74b1ff]">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm text-[#a9abb3]">{description}</p>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-[#a9abb3] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="mt-6 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
