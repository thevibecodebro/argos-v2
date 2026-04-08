"use client";

import { useMemo, useState } from "react";
import type { TrainingModuleSummary, TrainingTeamProgress } from "@/lib/training/service";

type TrainingProgressModule = {
  id: string;
  title: string;
};

type TrainingProgressEntry = {
  moduleId: string;
  moduleTitle: string;
  status: string;
  score: number | null;
  attempts: number;
};

type TrainingProgressRep = {
  repId: string;
  firstName: string | null;
  lastName: string | null;
  moduleProgress: TrainingProgressEntry[];
};

type TrainingProgressShell = {
  modules: TrainingProgressModule[];
  repProgress: TrainingProgressRep[];
};

type TrainingPanelProps = {
  canManage: boolean;
  aiAvailable: boolean;
  initialModules: TrainingModuleSummary[];
  initialTeamProgress?: TrainingProgressShell;
  initialTeamRows?: TrainingTeamProgress[];
};

export function TrainingPanel({
  canManage,
  aiAvailable,
  initialModules,
  initialTeamProgress,
  initialTeamRows,
}: TrainingPanelProps) {
  const [modules, setModules] = useState(initialModules);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(initialModules[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeManagerModal, setActiveManagerModal] = useState<"create" | "generate" | null>(null);
  const teamProgress = useMemo<TrainingProgressShell>(() => {
    if (initialTeamProgress) {
      return initialTeamProgress;
    }

    return {
      modules: initialModules.map((module) => ({
        id: module.id,
        title: module.title,
      })),
      repProgress: (initialTeamRows ?? []).map((row) => ({
        repId: row.repId,
        firstName: row.firstName,
        lastName: row.lastName,
        moduleProgress: initialModules.map((module) => ({
          moduleId: module.id,
          moduleTitle: module.title,
          status: row.completionRate >= 100 ? "passed" : row.passed > 0 ? "in_progress" : "assigned",
          score: null,
          attempts: row.assigned,
        })),
      })),
    };
  }, [initialModules, initialTeamProgress, initialTeamRows]);

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
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Modules</p>
        <div className="mt-4 space-y-3">
          {modules.map((module) => (
            <button
              className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                module.id === selectedModuleId
                  ? "border-[#74b1ff]/20 bg-[#74b1ff]/8"
                  : "border-[#45484f]/10 bg-[#161a21]/50 hover:border-[#74b1ff]/30"
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
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#74b1ff]">{module.skillCategory}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                    {module.progress?.status ?? "assigned"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#ecedf6]">
                    {module.progress?.score ?? "—"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        {canManage ? (
          <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Manager tools</p>
                <p className="mt-2 text-sm text-[#a9abb3]">Create a module manually or launch AI generation from the same panel.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10"
                  onClick={() => {
                    setActiveManagerModal("create");
                  }}
                  type="button"
                >
                  Create module
                </button>
                <button
                  className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!aiAvailable}
                  onClick={() => {
                    if (!aiAvailable) {
                      return;
                    }
                    setActiveManagerModal("generate");
                  }}
                  type="button"
                >
                  Generate with AI
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 text-sm text-[#a9abb3]">
              {activeManagerModal === "create" ? (
                <span>Create module modal shell is ready for the authoring flow.</span>
              ) : activeManagerModal === "generate" ? (
                <span>AI generation modal shell is ready for curriculum prompts.</span>
              ) : (
                <span>Use the toolbar to open the manager modal shell.</span>
              )}
              {!aiAvailable ? (
                <p className="mt-2 text-xs text-[#a9abb3]">
                  AI curriculum generation is unavailable until OpenAI is configured.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          {selectedModule ? (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">
                  {selectedModule.skillCategory}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedModule.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#a9abb3]">{selectedModule.description}</p>
              </div>

              {selectedModule.quizData?.questions?.length ? (
                <div className="space-y-5">
                  {selectedModule.quizData.questions.map((question, questionIndex) => (
                    <div key={question.question}>
                      <p className="text-sm font-medium text-[#ecedf6]">
                        {questionIndex + 1}. {question.question}
                      </p>
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <button
                            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                              answers[questionIndex] === optionIndex
                                ? "border-[#74b1ff]/20 bg-[#74b1ff]/8 text-[#74b1ff]"
                                : "border-[#45484f]/10 bg-[#161a21]/50 text-[#ecedf6] hover:border-[#74b1ff]/30"
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
                <div className="rounded-xl border border-[#45484f]/10 bg-[#161a21]/50 px-4 py-4 text-sm text-[#a9abb3]">
                  This module does not include a quiz. Completing it will mark the assignment as passed.
                </div>
              )}

              {statusMessage ? (
                <div className="rounded-xl border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-3 text-sm text-[#ecedf6]">
                  {statusMessage}
                </div>
              ) : null}

              {!canManage ? (
                <button
                  className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
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
            <p className="text-sm text-[#a9abb3]">No modules are available.</p>
          )}
        </section>

        {canManage ? (
          <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team Progress</p>
                <p className="mt-2 text-sm text-[#a9abb3]">
                  Starter modules are auto-provisioned when an org has none, so managers can test the full training flow immediately.
                </p>
              </div>
            </div>
            {teamProgress.modules.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm text-[#ecedf6]">
                  <thead>
                    <tr className="border-b border-[#45484f]/20 text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                      <th className="px-4 py-3">Rep</th>
                      {teamProgress.modules.map((module) => (
                        <th className="px-4 py-3" key={module.id}>
                          {module.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamProgress.repProgress.length ? (
                      teamProgress.repProgress.map((rep) => (
                        <tr className="border-b border-[#45484f]/10 last:border-b-0" key={rep.repId}>
                          <td className="px-4 py-4 align-top">
                            <p className="font-medium text-white">
                              {[rep.firstName, rep.lastName].filter(Boolean).join(" ").trim() || rep.repId}
                            </p>
                          </td>
                          {teamProgress.modules.map((module) => {
                            const progress = rep.moduleProgress.find((entry) => entry.moduleId === module.id);

                            return (
                              <td className="px-4 py-4 align-top" key={module.id}>
                                {progress ? (
                                  <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-3">
                                    <p className="text-sm font-semibold text-white">{progress.status}</p>
                                    <p className="mt-1 text-xs text-[#a9abb3]">
                                      {progress.score === null ? "Score pending" : `${progress.score}% score`}
                                    </p>
                                    <p className="mt-1 text-xs text-[#a9abb3]">{progress.attempts} attempts</p>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-[#45484f]/20 px-3 py-3 text-xs text-[#a9abb3]">
                                    Not started
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-sm text-[#a9abb3]" colSpan={teamProgress.modules.length + 1}>
                          No rep progress yet. Reps will appear here after they complete module quizzes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#45484f]/20 px-4 py-6 text-sm text-[#a9abb3]">
                Create or generate modules to start tracking team progress.
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
