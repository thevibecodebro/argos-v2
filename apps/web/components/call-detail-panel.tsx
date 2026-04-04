"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CallAnnotation, CallDetail } from "@/lib/calls/service";

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

export function CallDetailPanel({
  annotations: initialAnnotations,
  call,
  canManage,
}: CallDetailPanelProps) {
  const router = useRouter();
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [note, setNote] = useState("");
  const [highlightNote, setHighlightNote] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scoreCards = useMemo(
    () => [
      ["Frame Control", call.frameControlScore],
      ["Rapport", call.rapportScore],
      ["Discovery", call.discoveryScore],
      ["Pain Expansion", call.painExpansionScore],
      ["Solution", call.solutionScore],
      ["Objection Handling", call.objectionScore],
      ["Closing", call.closingScore],
    ],
    [call],
  );

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

  async function toggleHighlight(momentId: string, nextValue: boolean) {
    const response = await fetch(`/api/calls/${call.id}/moments/${momentId}/highlight`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isHighlight: nextValue,
        highlightNote: highlightNote[momentId] ?? null,
      }),
    });

    if (response.ok) {
      router.refresh();
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1.55fr]">
      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Scorecard</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">{call.overallScore ?? "—"}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Confidence: {call.confidence ?? "unknown"} · Stage: {call.callStageReached ?? "not set"}
          </p>
          <div className="mt-5 space-y-3">
            {scoreCards.map(([label, value]) => (
              <div className="flex items-center justify-between rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-3" key={label}>
                <span className="text-sm text-slate-300">{label}</span>
                <span className="text-sm font-semibold text-white">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Coaching Notes</p>
          <div className="mt-4 space-y-3">
            {annotations.length ? (
              annotations.map((annotation) => (
                <div className="rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4" key={annotation.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{annotation.note}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {annotation.authorFirstName || annotation.authorLastName
                          ? `${annotation.authorFirstName ?? ""} ${annotation.authorLastName ?? ""}`.trim()
                          : annotation.authorRole ?? "Coach"}{" "}
                        · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(annotation.createdAt))}
                      </p>
                    </div>
                    <button
                      className="text-xs uppercase tracking-[0.22em] text-slate-500 transition hover:text-red-300"
                      onClick={() => {
                        void removeAnnotation(annotation.id);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.15rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-6 text-sm text-slate-500">
                No annotations yet. Add a coaching note below.
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <textarea
              className="min-h-28 w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a coaching note tied to this call."
              value={note}
            />
            <button
              className="rounded-[1.15rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              disabled={isSubmitting || !note.trim()}
              onClick={() => {
                void submitAnnotation();
              }}
              type="button"
            >
              {isSubmitting ? "Saving..." : "Add annotation"}
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Call Detail</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{call.callTopic ?? "Untitled call"}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{call.status}</p>
              <p className="mt-1 text-sm text-slate-400">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.createdAt))}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Strengths</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(call.strengths ?? []).map((strength) => (
                  <li key={strength}>• {strength}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recommended Drills</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(call.recommendedDrills ?? []).map((drill) => (
                  <li key={drill}>• {drill}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Moments</p>
          <div className="mt-4 space-y-3">
            {call.moments.length ? (
              call.moments.map((moment) => (
                <div className="rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4" key={moment.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                        {moment.category ?? "moment"} · {formatTimestamp(moment.timestampSeconds)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">{moment.observation}</p>
                      {moment.recommendation ? (
                        <p className="mt-2 text-sm leading-7 text-slate-400">{moment.recommendation}</p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="space-y-2 text-right">
                        <button
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            moment.isHighlight
                              ? "bg-amber-500/15 text-amber-200"
                              : "border border-slate-700/70 text-slate-300 hover:border-amber-500/30 hover:text-amber-200"
                          }`}
                          onClick={() => {
                            void toggleHighlight(moment.id, !moment.isHighlight);
                          }}
                          type="button"
                        >
                          {moment.isHighlight ? "Unstar" : "Highlight"}
                        </button>
                        <input
                          className="w-44 rounded-lg border border-slate-700/70 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60"
                          onChange={(event) =>
                            setHighlightNote((current) => ({
                              ...current,
                              [moment.id]: event.target.value,
                            }))
                          }
                          placeholder="Highlight note"
                          type="text"
                          value={highlightNote[moment.id] ?? moment.highlightNote ?? ""}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.15rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-6 text-sm text-slate-500">
                No moments were generated for this call yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Transcript</p>
          <div className="mt-4 space-y-3">
            {(call.transcript ?? []).map((line) => (
              <div className="rounded-[1.15rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4" key={`${line.timestampSeconds}-${line.speaker}`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-white">{line.speaker}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {formatTimestamp(line.timestampSeconds)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{line.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
