"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HighlightNote } from "@/components/highlight-note";
import { CALL_SCORING_CATEGORIES } from "@/lib/calls/rubric";
import type { CallAnnotation, CallDetail, CallMoment } from "@/lib/calls/service";

type CallDetailPanelProps = {
  annotations: CallAnnotation[];
  call: CallDetail;
  canManage: boolean;
};

function formatTimestamp(seconds: number | null | undefined) {
  if (seconds == null) {
    return "—";
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

function scoreTint(value: number | null | undefined) {
  if (typeof value !== "number") return "bg-slate-700 text-slate-400";
  if (value >= 85) return "bg-cyan-400 text-cyan-300";
  if (value >= 70) return "bg-[#74b1ff] text-[#74b1ff]";
  if (value >= 60) return "bg-amber-400 text-amber-300";
  return "bg-red-400 text-red-400";
}

function severityTint(severity: string | null | undefined) {
  if (severity === "strength") return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
  if (severity === "critical") return "bg-red-500/10 text-red-300 border-red-500/20";
  return "bg-[#74b1ff]/10 text-[#74b1ff] border-[#74b1ff]/20";
}

function progressWidth(value: number | null | undefined) {
  if (typeof value !== "number") return 18;
  return Math.max(8, Math.min(100, value));
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
  const [focusCategorySlug, setFocusCategorySlug] = useState("all");

  const scoreCards = useMemo(
    () =>
      CALL_SCORING_CATEGORIES.map((category, index) => ({
        categoryId: null,
        description: null,
        name: category.label,
        score:
          {
            frame_control: call.frameControlScore,
            rapport: call.rapportScore,
            discovery: call.discoveryScore,
            pain_expansion: call.painExpansionScore,
            solution: call.solutionScore,
            objection_handling: call.objectionScore,
            closing: call.closingScore,
          }[category.slug] ?? null,
        slug: category.slug,
        sortOrder: index,
        weight: category.weight ?? null,
      })),
    [call],
  );

  const circumference = 2 * Math.PI * 40;
  const overallScore = typeof call.overallScore === "number" ? call.overallScore : 0;
  const ringOffset = circumference - (Math.max(0, Math.min(100, overallScore)) / 100) * circumference;

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
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-8 lg:col-span-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Revenue Scorecard</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                AI-Powered Evaluation
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Confidence: {call.confidence ?? "unknown"} · Stage: {call.callStageReached ?? "not set"}
              </p>
            </div>
            <div className="relative flex items-center justify-center">
              <svg className="h-24 w-24 -rotate-90 transform">
                <circle
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="#22262f"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="#74b1ff"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <span className="absolute text-2xl font-black text-[#74b1ff]">
                {call.overallScore ?? "—"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {scoreCards.map((scoreCard) => {
              const tint = scoreTint(scoreCard.score);
              return (
                <div className="flex items-center justify-between gap-4" key={scoreCard.slug}>
                  <span className="text-sm font-medium text-slate-300 transition-colors hover:text-[#74b1ff]">
                    {scoreCard.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-black">
                      <div
                        className={`h-full rounded-full ${tint.split(" ")[0]}`}
                        style={{ width: `${progressWidth(scoreCard.score)}%` }}
                      />
                    </div>
                    <span className={`w-7 text-right text-xs font-bold ${tint.split(" ")[1]}`}>
                      {scoreCard.score ?? "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/8 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Key Moments</h2>
            <span className="material-symbols-outlined text-[#74b1ff]">filter_list</span>
          </div>

          <div className="space-y-6">
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
                  <div className="relative border-l border-white/10 pl-8" key={moment.id}>
                    <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-[#74b1ff] shadow-[0_0_16px_rgba(116,177,255,0.3)]" />
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black tracking-[0.22em] text-[#74b1ff]">
                        {formatTimestamp(moment.timestampSeconds)}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] border ${severityTint(moment.severity)}`}
                      >
                        {moment.category ?? "Moment"}
                      </span>
                      {moment.isHighlight ? (
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] border border-amber-500/20 bg-amber-500/10 text-amber-300">
                          Highlighted
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-white">
                      {moment.observation ?? "No observation recorded."}
                    </p>
                    {moment.recommendation ? (
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {moment.recommendation}
                      </p>
                    ) : null}
                    {moment.highlightNote ? <HighlightNote note={moment.highlightNote} /> : null}
                    {canManage ? (
                      <div className="mt-4 space-y-3">
                        <label
                          className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
                          htmlFor={`highlight-note-${moment.id}`}
                        >
                          Edit note
                        </label>
                        <textarea
                          className="min-h-[88px] w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#74b1ff]/50"
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
                              <button
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#74b1ff]/30 hover:text-[#74b1ff] disabled:opacity-50"
                                disabled={isNoteActionBusy || !noteChanged}
                                onClick={() => {
                                  void saveHighlightNote(moment);
                                }}
                                type="button"
                              >
                                {isNoteActionBusy ? "Saving..." : "Save note"}
                              </button>
                              {canRemoveNote ? (
                                <button
                                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-red-400/40 hover:text-red-200 disabled:opacity-50"
                                  disabled={isNoteActionBusy}
                                  onClick={() => {
                                    void removeHighlightNote(moment);
                                  }}
                                  type="button"
                                >
                                  {isNoteActionBusy ? "Removing..." : "Remove note"}
                                </button>
                              ) : null}
                              <button
                                className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                                disabled={isHighlightActionBusy}
                                onClick={() => {
                                  void removeHighlight(moment);
                                }}
                                type="button"
                              >
                                {isHighlightActionBusy ? "Removing..." : "Remove highlight"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-amber-500/30 hover:text-amber-200 disabled:opacity-50"
                              disabled={isHighlightActionBusy}
                              onClick={() => {
                                void highlightMoment(moment);
                              }}
                              type="button"
                            >
                              {isHighlightActionBusy ? "Saving..." : highlightActionLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-500">
                No moments were generated for this call yet.
              </div>
            )}
          </div>
        </section>
      </div>

        <div className="col-span-12 space-y-8 lg:col-span-7">
          <section className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-white/8 bg-black shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(116,177,255,0.16),transparent_35%),linear-gradient(180deg,rgba(15,19,26,0.15),rgba(0,0,0,0.8))]" />
          <div className="absolute inset-x-0 top-0 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#74b1ff]">
                  {call.status}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {call.callTopic ?? "Untitled call"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">{formatDate(call.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {call.status === "complete" ? (
                  <button
                    className="rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#74b1ff] transition hover:border-[#74b1ff]/40 hover:bg-[#74b1ff]/15"
                    onClick={() => {
                      void openGenerateRoleplayModal();
                    }}
                    type="button"
                  >
                    Generate Roleplay
                  </button>
                ) : null}
                <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                  {call.durationSeconds ? formatTimestamp(call.durationSeconds) : "No duration"}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className="flex h-20 w-20 items-center justify-center rounded-full border border-[#74b1ff]/30 bg-[#74b1ff]/10 backdrop-blur-md transition hover:scale-105"
              type="button"
            >
              <span
                className="material-symbols-outlined text-4xl text-[#74b1ff]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="mb-2 h-1 w-full rounded-full bg-[#22262f]">
              <div className="h-full w-1/3 rounded-full bg-[#74b1ff] shadow-[0_0_16px_rgba(116,177,255,0.3)]" />
            </div>
            <div className="flex justify-between text-[10px] font-bold tracking-[0.18em] text-[#74b1ff]">
              <span>Preview</span>
              <span>{call.transcriptUrl ? "Transcript linked" : "No media linked"}</span>
            </div>
          </div>
          </section>

          <section className="flex h-[600px] flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#10131a] shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-[#161a21] p-6">
            <h2 className="text-xl font-semibold text-white">Transcript</h2>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#74b1ff]">
                Speaker Diarization
              </span>
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {(call.transcript ?? []).length ? (
              (call.transcript ?? []).map((line, index) => {
                const isEmphasized = index === 2;
                const speakerInitials = initials(line.speaker);

                return (
                  <div
                    className={`flex gap-4 ${isEmphasized ? "rounded-xl border-l-2 border-[#74b1ff] bg-[#74b1ff]/5 p-4" : ""}`}
                    key={`${line.timestampSeconds}-${line.speaker}-${index}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#22262f] text-xs font-bold text-[#74b1ff]">
                      {speakerInitials}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase tracking-[0.18em] ${
                            isEmphasized ? "text-[#74b1ff]" : "text-white"
                          }`}
                        >
                          {line.speaker}
                        </span>
                        <span
                          className={`text-[10px] ${isEmphasized ? "text-[#74b1ff]/70" : "text-slate-500"}`}
                        >
                          {formatTimestamp(line.timestampSeconds)}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${
                          isEmphasized ? "italic text-white" : "text-slate-300"
                        }`}
                      >
                        {line.text}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-500">
                No transcript lines are available yet.
              </div>
            )}
          </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.5rem] border border-white/8 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
            <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-white">
              <span className="material-symbols-outlined text-[#74b1ff]">insights</span>
              Call Summary
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Strengths
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(call.strengths ?? []).length ? (
                    (call.strengths ?? []).map((strength) => <li key={strength}>• {strength}</li>)
                  ) : (
                    <li>• No strengths generated yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Improvement Areas
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(call.improvements ?? []).length ? (
                    (call.improvements ?? []).map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>• No improvement areas generated yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Recommended Drills
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {(call.recommendedDrills ?? []).length ? (
                    (call.recommendedDrills ?? []).map((drill) => <li key={drill}>• {drill}</li>)
                  ) : (
                    <li>• No drills recommended yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)]">
            <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-white">
              <span className="material-symbols-outlined text-[#74b1ff]">edit_note</span>
              Coaching Notes
            </h2>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <textarea
                className="min-h-[120px] w-full resize-none border-none bg-transparent text-sm text-white outline-none placeholder:text-slate-600 focus:ring-0"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a coaching observation..."
                value={note}
              />
              <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                <div className="flex gap-2">
                  <button className="rounded p-1.5 transition hover:bg-white/[0.05]" type="button">
                    <span className="material-symbols-outlined text-sm text-slate-400">attach_file</span>
                  </button>
                  <button className="rounded p-1.5 transition hover:bg-white/[0.05]" type="button">
                    <span className="material-symbols-outlined text-sm text-slate-400">alternate_email</span>
                  </button>
                </div>
                <button
                  className="rounded-lg bg-[#22262f] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#74b1ff] transition hover:bg-[#74b1ff] hover:text-[#002f59] disabled:opacity-50"
                  disabled={isSubmitting || !note.trim()}
                  onClick={() => {
                    void submitAnnotation();
                  }}
                  type="button"
                >
                  {isSubmitting ? "Saving..." : "Post Note"}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {annotations.length ? (
                annotations.map((annotation) => (
                  <div
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                    key={annotation.id}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#74b1ff]">
                        {(annotation.authorFirstName || annotation.authorLastName
                          ? `${annotation.authorFirstName ?? ""} ${annotation.authorLastName ?? ""}`.trim()
                          : annotation.authorRole ?? "Coach")}{" "}
                        • {formatDate(annotation.createdAt)}
                      </span>
                      <button
                        className="text-[11px] font-semibold text-slate-500 transition hover:text-red-300"
                        onClick={() => {
                          void removeAnnotation(annotation.id);
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">{annotation.note}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-500">
                  No annotations yet. Add a coaching note below.
                </div>
              )}
            </div>
          </div>
          </section>
        </div>
      </div>
      {isGenerateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#74b1ff]">
                  Generated From Call
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Generate Roleplay</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Launch a saved roleplay from this completed call.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:text-white"
                onClick={closeGenerateRoleplayModal}
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {isLoadingGeneratePreview ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
                  Preparing anonymized scenario preview...
                </div>
              ) : generatePreview ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Scenario
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-200">
                      {generatePreview.scenarioSummary}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Focus
                    </span>
                    <select
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-200 outline-none transition focus:border-[#74b1ff]/40"
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
                </>
              ) : null}

              {generateError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {generateError}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                onClick={closeGenerateRoleplayModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-2 text-sm font-extrabold text-[#002345] transition hover:opacity-90 disabled:opacity-50"
                disabled={isLoadingGeneratePreview || isGeneratingRoleplay || !generatePreview}
                onClick={() => {
                  void generateRoleplay();
                }}
                type="button"
              >
                {isGeneratingRoleplay ? "Starting..." : "Generate & Start"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
