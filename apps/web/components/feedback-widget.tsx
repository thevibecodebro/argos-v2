"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import { ForgeDialog } from "./forge-dialog";
import { ForgeButton, ForgeIcon } from "./forge";

type FeedbackCategory = "bug" | "feedback" | "question";
type FeedbackStatus = {
  message: string;
  tone: "success" | "danger";
};

type FeedbackDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const categories: Array<{
  icon: string;
  label: string;
  value: FeedbackCategory;
}> = [
  { icon: "bug_report", label: "Bug", value: "bug" },
  { icon: "forum", label: "Feedback", value: "feedback" },
  { icon: "help", label: "Question", value: "question" },
];

async function readFeedbackResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    return String(body.error);
  }

  return response.ok
    ? "Sent."
    : "Feedback could not be sent right now.";
}

export function FeedbackDialog({ onOpenChange, open }: FeedbackDialogProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length >= 10 && !submitting;

  useEffect(() => {
    if (open) {
      setStatus(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus({
        message: "Add a little more detail before sending.",
        tone: "danger",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/feedback", {
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          pagePath: pathname,
          subject,
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const responseMessage = await readFeedbackResponse(response);

      if (!response.ok) {
        throw new Error(responseMessage);
      }

      setCategory("feedback");
      setMessage("");
      setSubject("");
      setStatus({
        message: "Sent. Thanks for the context.",
        tone: "success",
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : "Feedback could not be sent right now.",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ForgeDialog
      description="Send a bug, product note, or question with your current page attached."
      footer={
        <>
          <ForgeButton
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </ForgeButton>
          <ForgeButton
            disabled={!canSubmit}
            form="feedback-widget-form"
            icon={submitting ? "progress_activity" : "send"}
            type="submit"
            variant="primary"
          >
            {submitting ? "Sending" : "Send"}
          </ForgeButton>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Send feedback"
    >
      <form
        className="grid gap-5"
        id="feedback-widget-form"
        onSubmit={handleSubmit}
      >
        <fieldset className="grid gap-2">
          <legend className="sr-only">Feedback type</legend>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((item) => {
              const selected = category === item.value;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "forge-focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 font-[var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] transition",
                    selected
                      ? "border-[color-mix(in_srgb,var(--forge-gold)_42%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_12%,transparent)] text-[var(--forge-gold)]"
                      : "border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] text-[var(--forge-muted)] hover:border-[color-mix(in_srgb,var(--forge-gold)_28%,transparent)] hover:text-[var(--forge-text)]",
                  )}
                  key={item.value}
                  onClick={() => setCategory(item.value)}
                  type="button"
                >
                  <ForgeIcon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-gold)]">
            Subject
          </span>
          <input
            className="forge-focus-ring min-h-11 rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 text-sm text-[var(--forge-text)] outline-none transition placeholder:text-[var(--forge-faint)] focus:border-[color-mix(in_srgb,var(--forge-gold)_45%,transparent)]"
            maxLength={140}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Optional"
            value={subject}
          />
        </label>

        <label className="grid gap-2">
          <span className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-gold)]">
            Message
          </span>
          <textarea
            className="forge-focus-ring min-h-36 resize-y rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 py-3 text-sm leading-6 text-[var(--forge-text)] outline-none transition placeholder:text-[var(--forge-faint)] focus:border-[color-mix(in_srgb,var(--forge-gold)_45%,transparent)]"
            maxLength={4000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What happened, what did you expect, or what would make this better?"
            required
            value={message}
          />
          <span className="text-right text-xs text-[var(--forge-faint)]">
            {trimmedMessage.length}/4000
          </span>
        </label>

        {status ? (
          <p
            aria-live={status.tone === "danger" ? "assertive" : "polite"}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              status.tone === "success"
                ? "border-[color-mix(in_srgb,var(--forge-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_10%,transparent)] text-[var(--forge-success)]"
                : "border-[color-mix(in_srgb,var(--forge-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--forge-danger)_10%,transparent)] text-[var(--forge-danger)]",
            )}
            role={status.tone === "danger" ? "alert" : "status"}
          >
            {status.message}
          </p>
        ) : null}
      </form>
    </ForgeDialog>
  );
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open bugs and feedback form"
        className="forge-focus-ring fixed bottom-4 right-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--forge-gold)_34%,transparent)] bg-[rgba(16,9,7,0.94)] px-3 text-[var(--forge-gold)] shadow-[0_18px_52px_rgba(5,3,2,0.45)] backdrop-blur-xl transition hover:border-[color-mix(in_srgb,var(--forge-gold)_56%,transparent)] hover:bg-[rgba(32,21,15,0.96)] hover:text-[var(--forge-text)] sm:bottom-5 sm:right-5 sm:px-4"
        data-feedback-widget="true"
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        <ForgeIcon name="chat_bubble" size={19} />
        <span className="hidden font-[var(--font-display)] text-xs font-bold uppercase tracking-[0.16em] sm:inline">
          Bugs and feedback
        </span>
      </button>

      <FeedbackDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
