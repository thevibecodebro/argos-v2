"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeDialog } from "@/components/forge-dialog";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeErrorState,
  ForgeIcon,
  ForgeSegmentedTab,
  ForgeSegmentedTabs,
  ForgeStatusPanel,
  ForgeSurface,
} from "@/components/forge";
import { HighlightNote } from "@/components/highlight-note";
import type { CallAnnotation, CallDetail, CallMoment } from "@/lib/calls/service";
import {
  DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE,
  GENERATED_ROLEPLAY_BUYER_PERSONAS,
  type GeneratedRoleplayBuyerVoice,
} from "@/lib/roleplay/types";

type CallDetailPanelProps = {
  annotations: CallAnnotation[];
  call: CallDetail;
  canManage: boolean;
};

function formatTimestamp(seconds: number | null | undefined) {
  if (seconds == null) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function severityTint(severity: string | null | undefined): "cyan" | "danger" | "ember" {
  if (severity === "strength") return "cyan";
  if (severity === "critical") return "danger";
  return "ember";
}

function statusTone(status: string | null | undefined): "danger" | "ember" | "muted" | "success" {
  const normalized = status?.toLowerCase();
  if (normalized === "complete") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "processing" || normalized === "transcribing" || normalized === "evaluating") {
    return "ember";
  }
  return "muted";
}


export function getCallMediaState({
  hasRecording,
  hasTranscript,
  status,
}: {
  hasRecording: boolean;
  hasTranscript: boolean;
  status: string | null | undefined;
}) {
  const normalized = status?.toLowerCase();

  if (normalized === "failed") {
    return {
      description: "Analysis failed before this call could be prepared for review.",
      icon: "warning",
      title: "Processing failed",
      tone: "danger" as const,
    };
  }

  if (normalized === "processing" || normalized === "transcribing" || normalized === "evaluating") {
    return {
      description: "Argos is still preparing the transcript, scorecard, and coaching moments.",
      icon: "pending",
      title: "Processing call",
      tone: "gold" as const,
    };
  }

  if (!hasRecording) {
    return {
      description: "Attach or process a recording before audio playback can be offered here.",
      icon: "cloud_off",
      title: "Recording unavailable",
      tone: "muted" as const,
    };
  }

  if (!hasTranscript) {
    return {
      description: "Recording exists, but transcript data is not available in this review panel yet.",
      icon: "subject",
      title: "Transcript unavailable",
      tone: "ember" as const,
    };
  }

  return {
    description: "Recording and transcript data are linked. Playback is unavailable in this review panel.",
    icon: "graphic_eq",
    title: "Review data ready",
    tone: "success" as const,
  };
}

function initials(speaker: string) {
  return speaker
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CallDetailPanel({
  annotations: initialAnnotations,
  call,
  canManage,
}: CallDetailPanelProps) {
  const router = useRouter();
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [moments, setMoments] = useState(call.moments);
  const [note, setNote] = useState("");
  const [highlightNoteDrafts, setHighlightNoteDrafts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightActionMomentId, setHighlightActionMomentId] = useState<string | null>(null);
  const [noteActionMomentId, setNoteActionMomentId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isLoadingGeneratePreview, setIsLoadingGeneratePreview] = useState(false);
  const [isGeneratingRoleplay, setIsGeneratingRoleplay] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatePreview, setGeneratePreview] = useState<{
    scenarioSummary: string;
    focusOptions: Array<{ slug: string; label: string }>;
    defaultFocusSlug: string;
  } | null>(null);
  const [buyerVoice, setBuyerVoice] = useState<GeneratedRoleplayBuyerVoice>(
    DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE,
  );
  const [focusCategorySlug, setFocusCategorySlug] = useState("all");
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<
    "transcript" | "moments" | "summary" | "notes"
  >("transcript");

  const busyAnnouncement = isSubmitting
    ? "Saving coaching note."
    : isLoadingGeneratePreview
      ? "Preparing roleplay scenario."
      : isGeneratingRoleplay
        ? "Generating roleplay session."
        : noteActionMomentId
          ? "Updating highlight note."
          : highlightActionMomentId
            ? "Updating highlighted moment."
            : "";

  async function submitAnnotation() {
    if (!note.trim()) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch(`/api/calls/${call.id}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    });
    const payload = (await response.json()) as CallAnnotation & { error?: string };

    if (response.ok) {
      setAnnotations((current) => [payload, ...current]);
      setNote("");
    }

    setIsSubmitting(false);
  }

  function getHighlightNoteDraft(moment: CallMoment) {
    return highlightNoteDrafts[moment.id] ?? moment.highlightNote ?? "";
  }

  function updateMoment(nextMoment: CallMoment) {
    setMoments((current) =>
      current.map((moment) => (moment.id === nextMoment.id ? nextMoment : moment)),
    );
    setHighlightNoteDrafts((current) => ({
      ...current,
      [nextMoment.id]: nextMoment.highlightNote ?? "",
    }));
  }

  async function persistHighlight(momentId: string, nextValue: boolean, nextNote: string | null) {
    const response = await fetch(`/api/calls/${call.id}/moments/${momentId}/highlight`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isHighlight: nextValue,
        highlightNote: nextNote,
      }),
    });
    const payload = (await response.json()) as CallMoment & { error?: string };

    if (response.ok) {
      updateMoment(payload);
    }
  }

  async function highlightMoment(moment: CallMoment) {
    setHighlightActionMomentId(moment.id);

    try {
      await persistHighlight(moment.id, true, getHighlightNoteDraft(moment).trim() || null);
    } finally {
      setHighlightActionMomentId(null);
    }
  }

  async function saveHighlightNote(moment: CallMoment) {
    setNoteActionMomentId(moment.id);

    try {
      await persistHighlight(moment.id, true, getHighlightNoteDraft(moment).trim() || null);
    } finally {
      setNoteActionMomentId(null);
    }
  }

  async function removeHighlightNote(moment: CallMoment) {
    setNoteActionMomentId(moment.id);

    try {
      await persistHighlight(moment.id, true, null);
    } finally {
      setNoteActionMomentId(null);
    }
  }

  async function removeHighlight(moment: CallMoment) {
    setHighlightActionMomentId(moment.id);

    try {
      await persistHighlight(moment.id, false, null);
    } finally {
      setHighlightActionMomentId(null);
    }
  }

  async function removeAnnotation(annotationId: string) {
    const response = await fetch(`/api/calls/${call.id}/annotations/${annotationId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setAnnotations((current) => current.filter((item) => item.id !== annotationId));
    }
  }

  async function openGenerateRoleplayModal() {
    setIsGenerateModalOpen(true);
    setIsLoadingGeneratePreview(true);
    setGenerateError(null);
    setBuyerVoice(DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE);

    try {
      const response = await fetch(`/api/calls/${call.id}/generate-roleplay`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            defaultFocusSlug?: string;
            focusOptions?: Array<{ slug: string; label: string }>;
            scenarioSummary?: string;
            error?: string;
          }
        | null;

      if (!response.ok) {
        setGenerateError(payload?.error ?? "Unable to prepare roleplay.");
        setGeneratePreview(null);
        return;
      }

      const defaultFocusSlug = payload?.defaultFocusSlug ?? "all";
      setGeneratePreview({
        scenarioSummary: payload?.scenarioSummary ?? "",
        focusOptions: payload?.focusOptions ?? [{ slug: "all", label: "All" }],
        defaultFocusSlug,
      });
      setFocusCategorySlug(defaultFocusSlug);
    } catch {
      setGenerateError("Unable to prepare roleplay.");
      setGeneratePreview(null);
    } finally {
      setIsLoadingGeneratePreview(false);
    }
  }

  function closeGenerateRoleplayModal() {
    if (isGeneratingRoleplay) {
      return;
    }

    setIsGenerateModalOpen(false);
    setGenerateError(null);
  }

  async function generateRoleplay() {
    setIsGeneratingRoleplay(true);
    setGenerateError(null);

    try {
      const response = await fetch(`/api/calls/${call.id}/generate-roleplay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerVoice,
          focusCategorySlug: focusCategorySlug === "all" ? null : focusCategorySlug,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            id?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.id) {
        setGenerateError(payload?.error ?? "Unable to generate roleplay.");
        return;
      }

      setIsGenerateModalOpen(false);
      router.push(`/roleplay?sessionId=${payload.id}`);
    } catch {
      setGenerateError("Unable to generate roleplay.");
    } finally {
      setIsGeneratingRoleplay(false);
    }
  }

  return (
    <>
      <div aria-live="polite" className="sr-only" role="status">
        {busyAnnouncement}
      </div>
      <div className="space-y-3" data-call-detail-panel="forge-review-bench">
        <ForgeSurface className="overflow-hidden p-0">
            <div className="flex flex-col gap-4 border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.025)] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
                    Workbench
                  </p>
                  <h2 className="mt-1 font-[var(--font-display)] text-xl font-semibold text-[var(--forge-text)]">
                    Call Review
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ForgeChip tone="cyan">Speaker Diarization</ForgeChip>
                  {call.status === "complete" ? (
                    <ForgeButton
                      icon="record_voice_over"
                      onClick={() => {
                        void openGenerateRoleplayModal();
                      }}
                      size="sm"
                      type="button"
                      variant="primary"
                    >
                      Generate Roleplay
                    </ForgeButton>
                  ) : null}
                </div>
              </div>
              <ForgeSegmentedTabs label="Call workbench sections">
                <ForgeSegmentedTab
                  active={activeWorkbenchTab === "transcript"}
                  icon="subject"
                  onClick={() => setActiveWorkbenchTab("transcript")}
                >
                  Transcript
                </ForgeSegmentedTab>
                <ForgeSegmentedTab
                  active={activeWorkbenchTab === "moments"}
                  icon="insights"
                  onClick={() => setActiveWorkbenchTab("moments")}
                >
                  Key Moments
                </ForgeSegmentedTab>
                <ForgeSegmentedTab
                  active={activeWorkbenchTab === "summary"}
                  icon="summarize"
                  onClick={() => setActiveWorkbenchTab("summary")}
                >
                  Call Summary
                </ForgeSegmentedTab>
                <ForgeSegmentedTab
                  active={activeWorkbenchTab === "notes"}
                  icon="edit_note"
                  onClick={() => setActiveWorkbenchTab("notes")}
                >
                  Coaching Notes
                </ForgeSegmentedTab>
              </ForgeSegmentedTabs>
            </div>

            <div className="max-h-[640px] overflow-y-auto p-5 sm:p-6">
              <div className={activeWorkbenchTab === "transcript" ? "space-y-4" : "hidden space-y-4"}>
                {(call.transcript ?? []).length ? (
                  (call.transcript ?? []).map((line, index) => {
                    const isEmphasized = index === 2;
                    const speakerInitials = initials(line.speaker);

                    return (
                      <div
                        className={`flex gap-4 rounded-xl border p-4 transition ${
                          isEmphasized
                            ? "border-[rgba(241,191,123,0.26)] bg-[rgba(241,191,123,0.06)]"
                            : "border-transparent bg-transparent"
                        }`}
                        key={`${line.timestampSeconds}-${line.speaker}-${index}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-xs font-bold text-[var(--forge-cyan)]">
                          {speakerInitials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-[var(--font-display)] text-xs font-bold uppercase tracking-[0.16em] text-[var(--forge-text)]">
                              {line.speaker}
                            </span>
                            <span className="text-[0.7rem] text-[var(--forge-muted)]">
                              {formatTimestamp(line.timestampSeconds)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-[var(--forge-muted)]">
                            {line.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <ForgeEmptyState
                    description="No transcript lines are available yet."
                    icon="edit_note"
                    title="Transcript pending"
                  />
                )}
              </div>

              <div className={activeWorkbenchTab === "moments" ? "space-y-4" : "hidden space-y-4"}>
                {moments.length ? (
                  moments.map((moment) => {
                    const savedNote = moment.highlightNote?.trim() ?? "";
                    const draftNote = getHighlightNoteDraft(moment);
                    const trimmedDraftNote = draftNote.trim();
                    const noteChanged = trimmedDraftNote !== savedNote;
                    const canRemoveNote = Boolean(savedNote || trimmedDraftNote);
                    const highlightActionLabel =
                      trimmedDraftNote.length > 0 ? "Add note and highlight" : "Highlight moment";
                    const isHighlightActionBusy = highlightActionMomentId === moment.id;
                    const isNoteActionBusy = noteActionMomentId === moment.id;

                    return (
                      <ForgeSurface className="p-4" key={moment.id} variant="inset">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <ForgeChip icon="history" tone="gold">
                            {formatTimestamp(moment.timestampSeconds)}
                          </ForgeChip>
                          <ForgeChip tone={severityTint(moment.severity)}>
                            {moment.category ?? "Moment"}
                          </ForgeChip>
                          {moment.isHighlight ? <ForgeChip tone="ember">Highlighted</ForgeChip> : null}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-[var(--forge-text)]">
                          {moment.observation ?? "No observation recorded."}
                        </p>
                        {moment.recommendation ? (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--forge-muted)]">
                            {moment.recommendation}
                          </p>
                        ) : null}
                        {moment.highlightNote ? <HighlightNote note={moment.highlightNote} /> : null}
                        {canManage ? (
                          <div className="mt-4 space-y-3">
                            <label
                              className="block font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]"
                              htmlFor={`highlight-note-${moment.id}`}
                            >
                              Edit note
                            </label>
                            <textarea
                              className="min-h-[88px] w-full resize-y rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition placeholder:text-[rgba(255,244,230,0.38)] focus:border-[rgba(241,191,123,0.36)]"
                              id={`highlight-note-${moment.id}`}
                              onChange={(event) =>
                                setHighlightNoteDrafts((current) => ({
                                  ...current,
                                  [moment.id]: event.target.value,
                                }))
                              }
                              placeholder="Add context for why this moment matters."
                              value={draftNote}
                            />
                            <div className="flex flex-wrap gap-2">
                              {moment.isHighlight ? (
                                <>
                                  <ForgeButton
                                    disabled={isNoteActionBusy || !noteChanged}
                                    onClick={() => {
                                      void saveHighlightNote(moment);
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                  >
                                    {isNoteActionBusy ? "Saving..." : "Save note"}
                                  </ForgeButton>
                                  {canRemoveNote ? (
                                    <ForgeButton
                                      disabled={isNoteActionBusy}
                                      onClick={() => {
                                        void removeHighlightNote(moment);
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="secondary"
                                    >
                                      {isNoteActionBusy ? "Removing..." : "Remove note"}
                                    </ForgeButton>
                                  ) : null}
                                  <ForgeButton
                                    disabled={isHighlightActionBusy}
                                    onClick={() => {
                                      void removeHighlight(moment);
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="danger"
                                  >
                                    {isHighlightActionBusy ? "Removing..." : "Remove highlight"}
                                  </ForgeButton>
                                </>
                              ) : (
                                <ForgeButton
                                  disabled={isHighlightActionBusy}
                                  onClick={() => {
                                    void highlightMoment(moment);
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                >
                                  {isHighlightActionBusy ? "Saving..." : highlightActionLabel}
                                </ForgeButton>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </ForgeSurface>
                    );
                  })
                ) : (
                  <ForgeEmptyState
                    description="No moments were generated for this call yet."
                    icon="insights"
                    title="No moments yet"
                  />
                )}
              </div>

              <div className={activeWorkbenchTab === "summary" ? "space-y-6" : "hidden space-y-6"}>
                <SummaryList
                  empty="No strengths generated yet."
                  items={call.strengths ?? []}
                  title="Strengths"
                />
                <SummaryList
                  empty="No improvement areas generated yet."
                  items={call.improvements ?? []}
                  title="Improvement Areas"
                />
                <SummaryList
                  empty="No drills recommended yet."
                  items={call.recommendedDrills ?? []}
                  title="Recommended Drills"
                />
              </div>

              <div className={activeWorkbenchTab === "notes" ? "space-y-6" : "hidden space-y-6"}>
                <ForgeSurface className="p-4" variant="inset">
                  <label
                    className="block font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]"
                    htmlFor="call-coaching-note"
                  >
                    Coaching note
                  </label>
                  <textarea
                    aria-describedby="call-coaching-note-help"
                    className="mt-2 min-h-[120px] w-full resize-none border-none bg-transparent text-sm text-[var(--forge-text)] outline-none placeholder:text-[rgba(255,244,230,0.38)] focus:ring-0"
                    id="call-coaching-note"
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Add a coaching observation..."
                    value={note}
                  />
                  <div className="mt-3 flex flex-col gap-3 border-t border-[var(--forge-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-[var(--forge-muted)]" id="call-coaching-note-help">
                      Add a plain-text coaching note for this call.
                    </p>
                    <ForgeButton
                      disabled={isSubmitting || !note.trim()}
                      onClick={() => {
                        void submitAnnotation();
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {isSubmitting ? "Saving..." : "Post Note"}
                    </ForgeButton>
                  </div>
                </ForgeSurface>

                <div className="space-y-3">
                  {annotations.length ? (
                    annotations.map((annotation) => (
                      <ForgeSurface className="p-4" key={annotation.id} variant="inset">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.15em] text-[var(--forge-gold)]">
                            {(annotation.authorFirstName || annotation.authorLastName
                              ? `${annotation.authorFirstName ?? ""} ${annotation.authorLastName ?? ""}`.trim()
                              : annotation.authorRole ?? "Coach")}{" "}
                            / {formatDate(annotation.createdAt)}
                          </span>
                          <button
                            className="text-[0.72rem] font-semibold text-[var(--forge-muted)] transition hover:text-[var(--forge-danger)]"
                            onClick={() => {
                              void removeAnnotation(annotation.id);
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--forge-text)]">{annotation.note}</p>
                      </ForgeSurface>
                    ))
                  ) : (
                    <ForgeEmptyState
                      description="Add a coaching note below when this call needs follow-up."
                      icon="edit_note"
                      title="No annotations yet"
                    />
                  )}
                </div>
              </div>
            </div>
        </ForgeSurface>
      </div>

      <ForgeDialog
        description="Launch a saved roleplay from this completed call."
        footer={
          <>
            <ForgeButton
              disabled={isGeneratingRoleplay}
              onClick={closeGenerateRoleplayModal}
              type="button"
              variant="secondary"
            >
              Cancel
            </ForgeButton>
            <ForgeButton
              disabled={isLoadingGeneratePreview || isGeneratingRoleplay || !generatePreview}
              onClick={() => {
                void generateRoleplay();
              }}
              type="button"
              variant="primary"
            >
              {isGeneratingRoleplay ? "Starting..." : "Generate & Start"}
            </ForgeButton>
          </>
        }
        onOpenChange={(open) => {
          if (!open) {
            closeGenerateRoleplayModal();
          }
        }}
        open={isGenerateModalOpen}
        title="Generate Roleplay"
      >
        <div className="space-y-4">
          {isLoadingGeneratePreview ? (
            <ForgeStatusPanel
              announce="polite"
              className="px-4 py-5"
              description="Preparing anonymized scenario preview..."
              icon="pending"
              title="Preparing scenario"
              tone="cyan"
            />
          ) : generatePreview ? (
            <>
              <ForgeSurface className="px-4 py-5" variant="inset">
                <p className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]">
                  Scenario
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--forge-text)]">
                  {generatePreview.scenarioSummary}
                </p>
              </ForgeSurface>
              <label className="block">
                <span className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]">
                  Focus
                </span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[rgba(241,191,123,0.36)]"
                  onChange={(event) => setFocusCategorySlug(event.target.value)}
                  value={focusCategorySlug}
                >
                  {generatePreview.focusOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]">
                  Buyer voice
                </legend>
                <div className="grid grid-cols-2 gap-2" data-generated-roleplay-buyer-voice="true">
                  {(["male", "female"] as const).map((voice) => {
                    const isSelected = buyerVoice === voice;
                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[var(--forge-gold)]/35 bg-[var(--forge-gold)]/10 text-[var(--forge-gold)]"
                            : "border-[var(--forge-border)] bg-[rgba(255,244,230,0.025)] text-[var(--forge-muted)] hover:text-[var(--forge-text)]"
                        }`}
                        disabled={isGeneratingRoleplay}
                        key={voice}
                        onClick={() => setBuyerVoice(voice)}
                        type="button"
                      >
                        {GENERATED_ROLEPLAY_BUYER_PERSONAS[voice].label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : null}

          {generateError ? (
            <ForgeErrorState description={generateError} title="Roleplay generation failed" />
          ) : null}
        </div>
      </ForgeDialog>
    </>
  );
}

function SummaryList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: string[];
  title: string;
}) {
  return (
    <div>
      <p className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--forge-muted)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--forge-muted)]">
        {items.length ? (
          items.map((item) => (
            <li className="flex gap-2" key={item}>
              <span aria-hidden="true" className="text-[var(--forge-gold)]">
                -
              </span>
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--forge-gold)]">
              -
            </span>
            <span>{empty}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
