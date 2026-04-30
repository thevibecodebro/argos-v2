"use client";

import type { TrainingModuleRecord, TrainingModuleSummary } from "@/lib/training/service";

export type TrainingModuleAIDraftMode = "content" | "quiz";

export type TrainingModuleContentDraft = {
  description: string;
  skillCategory: string;
  title: string;
  videoUrl: string | null;
};

export type TrainingModuleQuizDraft = {
  quizData: TrainingModuleRecord["quizData"];
};

export type TrainingModuleAIDraftResponse =
  | {
      draft: TrainingModuleContentDraft;
      mode: "content";
    }
  | {
      draft: TrainingModuleQuizDraft;
      mode: "quiz";
    };

export type TrainingManagerAiToolsProps = {
  aiAvailable: boolean;
  canManage: boolean;
  contextNotes: string;
  isBusy: boolean;
  onContextNotesChange: (value: string) => void;
  onGenerate: (mode: TrainingModuleAIDraftMode) => void;
  selectedModule: TrainingModuleSummary | null;
};

const TRAINING_AI_FIELD_FOCUS_CLASS =
  "outline-none transition focus-visible:border-[var(--forge-gold)] focus-visible:ring-2 focus-visible:ring-[var(--forge-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--forge-surface)]";
const TRAINING_AI_TEXTAREA_CLASS = `min-h-28 w-full rounded-xl border border-[var(--forge-border-strong)]/15 bg-[var(--forge-surface)] px-4 py-3 text-sm text-white ${TRAINING_AI_FIELD_FOCUS_CLASS}`;

function isQuizData(value: unknown): value is TrainingModuleRecord["quizData"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as { questions?: unknown };
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return false;
  }

  return payload.questions.every((question) => {
    if (!question || typeof question !== "object") {
      return false;
    }

    const entry = question as {
      correctIndex?: unknown;
      options?: unknown;
      question?: unknown;
    };

    return (
      typeof entry.question === "string" &&
      entry.question.trim().length > 0 &&
      Array.isArray(entry.options) &&
      entry.options.length >= 2 &&
      entry.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
      typeof entry.correctIndex === "number" &&
      Number.isInteger(entry.correctIndex) &&
      entry.correctIndex >= 0 &&
      entry.correctIndex < entry.options.length
    );
  });
}

export function getTrainingModuleAiContextAvailability(
  selectedModule: TrainingModuleSummary | null,
  contextNotes: string,
) {
  return Boolean(
    selectedModule &&
      (selectedModule.description?.trim() || selectedModule.videoUrl?.trim() || contextNotes.trim()),
  );
}

export function parseTrainingModuleAIDraftResponse(
  value: unknown,
): TrainingModuleAIDraftResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as { draft?: unknown; mode?: unknown };

  if (payload.mode === "content") {
    if (!payload.draft || typeof payload.draft !== "object") {
      return null;
    }

    const draft = payload.draft as {
      description?: unknown;
      skillCategory?: unknown;
      title?: unknown;
      videoUrl?: unknown;
    };

    const title = typeof draft.title === "string" ? draft.title.trim() : "";
    const skillCategory = typeof draft.skillCategory === "string" ? draft.skillCategory.trim() : "";
    const description = typeof draft.description === "string" ? draft.description.trim() : "";
    const videoUrl =
      typeof draft.videoUrl === "string" && draft.videoUrl.trim().length > 0 ? draft.videoUrl.trim() : null;

    if (!title || !skillCategory || !description) {
      return null;
    }

    return {
      mode: "content",
      draft: {
        title,
        skillCategory,
        description,
        videoUrl,
      },
    };
  }

  if (payload.mode === "quiz") {
    if (!payload.draft || typeof payload.draft !== "object") {
      return null;
    }

    const draft = payload.draft as {
      quizData?: unknown;
    };

    if (!isQuizData(draft.quizData)) {
      return null;
    }

    return {
      mode: "quiz",
      draft: {
        quizData: draft.quizData,
      },
    };
  }

  return null;
}

export function TrainingManagerAiTools({
  aiAvailable,
  canManage,
  contextNotes,
  isBusy,
  onContextNotesChange,
  onGenerate,
  selectedModule,
}: TrainingManagerAiToolsProps) {
  if (!canManage) {
    return null;
  }

  const hasCourseContext = getTrainingModuleAiContextAvailability(selectedModule, contextNotes);
  const actionsDisabled = !aiAvailable || !hasCourseContext || !selectedModule || isBusy;
  const contextSummary =
    selectedModule?.description?.trim() ||
    selectedModule?.videoUrl?.trim() ||
    contextNotes.trim() ||
    "Add notes to ground the draft in this lesson.";

  return (
    <section className="rounded-[1.15rem] border border-white/10 bg-[rgba(5,4,3,0.32)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">Lesson drafting</p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {selectedModule?.title ?? "Select a module to draft"}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--forge-muted)]">
            Draft lesson content or quiz questions from the selected module, then review the result inline before
            saving.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Context source</p>
          <p className="mt-1 max-w-xs text-sm leading-6 text-[var(--forge-text)]">{contextSummary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">Context notes</span>
          <textarea
            className={TRAINING_AI_TEXTAREA_CLASS}
            data-training-focus-hardened="true"
            onChange={(event) => onContextNotesChange(event.target.value)}
            placeholder="Add an angle, objection, or scenario to ground the draft."
            value={contextNotes}
          />
          <p className="text-xs leading-6 text-[var(--forge-muted)]">
            Notes combine with the selected module description or video URL to ground the draft.
          </p>
        </label>

        <div className="space-y-3">
          <button
            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionsDisabled}
            onClick={() => onGenerate("content")}
            type="button"
          >
            Draft lesson content
          </button>
          <button
            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionsDisabled}
            onClick={() => onGenerate("quiz")}
            type="button"
          >
            Draft quiz
          </button>

          {!selectedModule ? (
            <p className="text-xs leading-6 text-[var(--forge-muted)]">Select a module before drafting AI content.</p>
          ) : null}
          {selectedModule && !hasCourseContext ? (
            <p className="text-xs leading-6 text-[var(--forge-muted)]">
              Add course context to enable module-scoped drafts.
            </p>
          ) : null}
          {!aiAvailable ? (
            <p className="text-xs leading-6 text-[var(--forge-muted)]">
              AI drafting is unavailable until OpenAI is configured.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
