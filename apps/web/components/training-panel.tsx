"use client";

import { useMemo, useState } from "react";
import type { TrainingModuleSummary, TrainingTeamProgress } from "@/lib/training/service";

type TrainingPanelProps = {
  canManage: boolean;
  initialModules: TrainingModuleSummary[];
  initialTeamRows: TrainingTeamProgress[];
};

export function TrainingPanel({
  canManage,
  initialModules,
  initialTeamRows,
}: TrainingPanelProps) {
  const [modules, setModules] = useState(initialModules);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(initialModules[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  async function submitProgress() {
    if (!selectedModule) {
      return;
    }

    const quizAnswers = selectedModule.quizData?.questions.map((_, index) => answers[index] ?? -1);
    setIsSubmitting(true);
    setStatusMessage(null);

    const response = await fetch(`/api/training/modules/${selectedModule.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizAnswers }),
    });

    const payload = (await response.json()) as { error?: string; status?: string; score?: number | null; attempts?: number };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Failed to submit module progress");
      setIsSubmitting(false);
      return;
    }

    setModules((current) =>
      current.map((module) =>
        module.id === selectedModule.id
          ? {
              ...module,
              progress: {
                status: payload.status ?? "in_progress",
                score: payload.score ?? null,
                attempts: payload.attempts ?? 1,
                completedAt: payload.status === "passed" ? new Date().toISOString() : null,
                dueDate: module.progress?.dueDate ?? null,
                assignedAt: module.progress?.assignedAt ?? null,
              },
            }
          : module,
      ),
    );
    setStatusMessage(
      payload.status === "passed"
        ? `Passed with ${payload.score ?? 0}%`
        : payload.status === "failed"
          ? `Scored ${payload.score ?? 0}%. Reopen the module and try again.`
          : "Progress saved",
    );
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Modules</p>
        <div className="mt-4 space-y-3">
          {modules.map((module) => (
            <button
              className={`w-full rounded-[1.3rem] border px-4 py-4 text-left transition ${
                module.id === selectedModuleId
                  ? "border-blue-500/30 bg-blue-600/10"
                  : "border-slate-800/70 bg-slate-950/25 hover:border-slate-700"
              }`}
              key={module.id}
              onClick={() => {
                setSelectedModuleId(module.id);
                setAnswers({});
                setStatusMessage(null);
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{module.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-blue-300">{module.skillCategory}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {module.progress?.status ?? "assigned"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">
                    {module.progress?.score ?? "—"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          {selectedModule ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
                  {selectedModule.skillCategory}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedModule.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{selectedModule.description}</p>
              </div>

              {selectedModule.quizData?.questions?.length ? (
                <div className="space-y-5">
                  {selectedModule.quizData.questions.map((question, questionIndex) => (
                    <div key={question.question}>
                      <p className="text-sm font-medium text-slate-100">
                        {questionIndex + 1}. {question.question}
                      </p>
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <button
                            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                              answers[questionIndex] === optionIndex
                                ? "border-blue-500/30 bg-blue-600/10 text-blue-200"
                                : "border-slate-800/70 bg-slate-950/25 text-slate-300 hover:border-slate-700"
                            }`}
                            key={`${question.question}-${option}`}
                            onClick={() =>
                              setAnswers((current) => ({
                                ...current,
                                [questionIndex]: optionIndex,
                              }))
                            }
                            type="button"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4 text-sm text-slate-400">
                  This module does not include a quiz. Completing it will mark the assignment as passed.
                </div>
              )}

              {statusMessage ? (
                <div className="rounded-[1.2rem] border border-blue-500/20 bg-blue-600/10 px-4 py-3 text-sm text-blue-100">
                  {statusMessage}
                </div>
              ) : null}

              {!canManage ? (
                <button
                  className="rounded-[1.15rem] bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => {
                    void submitProgress();
                  }}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Submit module"}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No modules are available.</p>
          )}
        </section>

        {canManage ? (
          <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Team Progress</p>
                <p className="mt-2 text-sm text-slate-400">Starter modules are auto-provisioned when an org has none, so managers can test the full training flow immediately.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {initialTeamRows.length ? (
                initialTeamRows.map((row) => (
                  <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4" key={row.repId}>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {[row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{row.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-300">{row.completionRate}%</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.passed}/{row.assigned} passed
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-6 text-sm text-slate-500">
                  No rep progress yet. Reps will appear here after they complete module quizzes.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
