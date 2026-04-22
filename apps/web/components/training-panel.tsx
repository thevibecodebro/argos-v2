"use client";

import { useMemo, useState } from "react";
import { TrainingCourseShell } from "./training/training-course-shell";
import { TrainingManagerCommandDeck } from "./training/training-manager-command-deck";
import { TrainingModuleStage } from "./training/training-module-stage";
import { TrainingModuleToc } from "./training/training-module-toc";
import {
  TrainingQuizEditor,
  normalizeTrainingQuizQuestionDrafts,
  quizDataToTrainingQuizQuestionDrafts,
  type TrainingQuizQuestionDraft,
} from "./training/training-quiz-editor";
import {
  TrainingManagerAiTools,
  getTrainingModuleAiContextAvailability,
  parseTrainingModuleAIDraftResponse,
  type TrainingModuleAIDraftMode,
  type TrainingModuleAIDraftResponse,
} from "./training/training-manager-ai-tools";
import { TrainingManagerStatusBand } from "./training/training-manager-status-band";
import { getTrainingManagerStageMetrics } from "./training/training-manager-stage-metrics";
import {
  getTrainingStagePrimaryAction,
  resolveTrainingStageView,
  type TrainingStageView,
} from "./training/training-stage-state";
import type {
  TrainingModuleRecord,
  TrainingModuleSummary,
  TrainingTeamProgress,
  TrainingTeamProgressShell,
} from "@/lib/training/service";

type ManagerModal = "assign" | "create" | "edit" | "generate" | null;

type ModuleFormState = {
  title: string;
  description: string;
  skillCategory: string;
  videoUrl: string;
  quizQuestions: TrainingQuizQuestionDraft[];
};

type GenerateFormState = {
  topic: string;
  targetRole: string;
  moduleCount: number;
  skillFocus: string;
};

type GeneratedModuleDraft = {
  title: string;
  skillCategory: string;
  description: string;
  quizData: TrainingModuleRecord["quizData"];
};

type ModuleAiDraftFormState = {
  contextNotes: string;
};

type TrainingPanelProps = {
  canManage: boolean;
  aiAvailable: boolean;
  initialModules: TrainingModuleSummary[];
  initialTeamProgress: TrainingTeamProgressShell;
  initialTeamRows: TrainingTeamProgress[];
  rubricCategories?: Array<{ slug: string; name: string }>;
};

type JsonResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

type ModuleSubmitTarget = {
  endpoint: string;
  method: "PATCH" | "POST";
  moduleId: string | null;
};

type ModuleSelectionPatch = {
  answers: Record<number, number>;
  selectedModuleId: string;
  stageView: TrainingStageView;
  statusMessage: null;
};

const EMPTY_MODULE_FORM: ModuleFormState = {
  title: "",
  description: "",
  skillCategory: "",
  videoUrl: "",
  quizQuestions: [],
};

const EMPTY_GENERATE_FORM: GenerateFormState = {
  topic: "",
  targetRole: "",
  moduleCount: 3,
  skillFocus: "",
};

const EMPTY_MODULE_AI_DRAFT_FORM: ModuleAiDraftFormState = {
  contextNotes: "",
};

function moduleToFormState(module: TrainingModuleSummary): ModuleFormState {
  return {
    title: module.title,
    description: module.description ?? "",
    skillCategory: module.skillCategory,
    videoUrl: module.videoUrl ?? "",
    quizQuestions: quizDataToTrainingQuizQuestionDrafts(module.quizData),
  };
}

function moduleDraftToFormState(
  selectedModule: TrainingModuleSummary,
  draft: TrainingModuleAIDraftResponse,
): ModuleFormState {
  if (draft.mode === "quiz") {
    return {
      title: selectedModule.title,
      description: selectedModule.description ?? "",
      skillCategory: selectedModule.skillCategory,
      videoUrl: selectedModule.videoUrl ?? "",
      quizQuestions: quizDataToTrainingQuizQuestionDrafts(draft.draft.quizData),
    };
  }

  return {
    title: selectedModule.title,
    description: draft.draft.description,
    skillCategory: selectedModule.skillCategory,
    videoUrl: selectedModule.videoUrl ?? "",
    quizQuestions: quizDataToTrainingQuizQuestionDrafts(selectedModule.quizData),
  };
}

async function readJsonResponse<T>(response: Response): Promise<JsonResponse<T>> {
  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: typeof payload?.error === "string" ? payload.error : "Request failed",
      status: response.status,
    };
  }

  return {
    ok: true,
    data: payload as T,
  };
}

export function getModuleSubmitTarget(
  activeManagerModal: ManagerModal,
  editingModuleId: string | null,
): ModuleSubmitTarget {
  if (activeManagerModal === "edit" && editingModuleId) {
    return {
      endpoint: `/api/training/modules/${editingModuleId}`,
      method: "PATCH",
      moduleId: editingModuleId,
    };
  }

  return {
    endpoint: "/api/training/modules",
    method: "POST",
    moduleId: null,
  };
}

export function getModuleSelectionPatch(moduleId: string): ModuleSelectionPatch {
  return {
    answers: {},
    selectedModuleId: moduleId,
    stageView: "lesson",
    statusMessage: null,
  };
}

export function mergeTeamProgressModule(
  progress: TrainingTeamProgressShell,
  module: TrainingModuleSummary,
): TrainingTeamProgressShell {
  const modules = progress.modules.some((entry) => entry.id === module.id)
    ? progress.modules.map((entry) => (entry.id === module.id ? { ...entry, title: module.title } : entry))
    : [...progress.modules, { id: module.id, title: module.title }];

  return {
    modules,
    repProgress: progress.repProgress.map((rep) => ({
      ...rep,
      moduleProgress: rep.moduleProgress.map((entry) =>
        entry.moduleId === module.id ? { ...entry, moduleTitle: module.title } : entry,
      ),
    })),
  };
}

export function TrainingPanel({
  canManage,
  aiAvailable,
  initialModules,
  initialTeamProgress,
  initialTeamRows,
  rubricCategories = [],
}: TrainingPanelProps) {
  const [modules, setModules] = useState(initialModules);
  const [teamRows, setTeamRows] = useState(initialTeamRows);
  const [teamProgress, setTeamProgress] = useState(initialTeamProgress);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(initialModules[0]?.id ?? null);
  const [stageView, setStageView] = useState<TrainingStageView>("lesson");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeManagerModal, setActiveManagerModal] = useState<ManagerModal>(null);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerMessage, setManagerMessage] = useState<string | null>(null);
  const [isManagerBusy, setIsManagerBusy] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(EMPTY_MODULE_FORM);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(EMPTY_GENERATE_FORM);
  const [moduleAiDraftForm, setModuleAiDraftForm] = useState<ModuleAiDraftFormState>(EMPTY_MODULE_AI_DRAFT_FORM);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null);
  const [assignRepIds, setAssignRepIds] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState("");
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedModuleDraft[]>([]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  const assigningModule = useMemo(
    () => modules.find((module) => module.id === assigningModuleId) ?? null,
    [assigningModuleId, modules],
  );

  const assignmentProgressByRepId = useMemo(() => {
    if (!assigningModuleId) {
      return new Map<string, TrainingTeamProgressShell["repProgress"][number]["moduleProgress"][number]>();
    }

    return new Map(
      teamProgress.repProgress.flatMap((rep) => {
        const entry = rep.moduleProgress.find((progress) => progress.moduleId === assigningModuleId);
        return entry ? [[rep.repId, entry] as const] : [];
      }),
    );
  }, [assigningModuleId, teamProgress.repProgress]);

  function resetManagerFeedback() {
    setManagerError(null);
    setManagerMessage(null);
  }

  function openCreateModal() {
    resetManagerFeedback();
    setGeneratedDrafts([]);
    setModuleForm(EMPTY_MODULE_FORM);
    setEditingModuleId(null);
    setActiveManagerModal("create");
  }

  function openEditModal(module: TrainingModuleSummary) {
    resetManagerFeedback();
    setGeneratedDrafts([]);
    setEditingModuleId(module.id);
    setModuleForm(moduleToFormState(module));
    setActiveManagerModal("edit");
  }

  function openGenerateModal() {
    resetManagerFeedback();
    setGeneratedDrafts([]);
    setGenerateForm(EMPTY_GENERATE_FORM);
    setActiveManagerModal("generate");
  }

  function openAssignModal(module: TrainingModuleSummary) {
    resetManagerFeedback();
    setAssigningModuleId(module.id);
    setAssignRepIds([]);
    setAssignDueDate("");
    setActiveManagerModal("assign");
  }

  async function generateModuleDraft(mode: TrainingModuleAIDraftMode) {
    resetManagerFeedback();

    if (!selectedModule) {
      setManagerError("Select a module before drafting AI content.");
      return;
    }

    const hasCourseContext = getTrainingModuleAiContextAvailability(selectedModule, moduleAiDraftForm.contextNotes);
    if (!hasCourseContext) {
      setManagerError("Add course context before generating module drafts.");
      return;
    }

    setIsManagerBusy(true);

    try {
      const response = await fetch(`/api/training/modules/${selectedModule.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          contextNotes: moduleAiDraftForm.contextNotes,
        }),
      });
      const payload = await readJsonResponse<unknown>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      const draft = parseTrainingModuleAIDraftResponse(payload.data);
      if (!draft) {
        setManagerError("AI draft response was malformed.");
        return;
      }

      setGeneratedDrafts([]);
      setModuleForm(moduleDraftToFormState(selectedModule, draft));
      setEditingModuleId(selectedModule.id);
      setActiveManagerModal("edit");
      setManagerMessage(
        draft.mode === "quiz" ? "Loaded quiz draft for review." : "Loaded lesson draft for review.",
      );
    } finally {
      setIsManagerBusy(false);
    }
  }

  function closeManagerModal() {
    setActiveManagerModal(null);
    setEditingModuleId(null);
    setAssigningModuleId(null);
    setAssignRepIds([]);
    setAssignDueDate("");
    setGeneratedDrafts([]);
    setIsManagerBusy(false);
  }

  async function refreshTeamProgress() {
    const response = await fetch("/api/training/team-progress", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const payload = await readJsonResponse<{
      rows: TrainingTeamProgress[];
      progress: TrainingTeamProgressShell;
    }>(response);

    if (!payload.ok) {
      throw new Error(payload.error);
    }

    setTeamRows(payload.data.rows);
    setTeamProgress(payload.data.progress);
  }

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

    const payload = (await response.json()) as {
      attempts?: number;
      error?: string;
      score?: number | null;
      status?: string;
    };

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

  async function submitModuleForm() {
    const title = moduleForm.title.trim();
    const skillCategory = moduleForm.skillCategory.trim();

    if (!title || !skillCategory) {
      setManagerError("Title and skill category are required.");
      return;
    }

    resetManagerFeedback();
    setIsManagerBusy(true);
    const quizData = normalizeTrainingQuizQuestionDrafts(moduleForm.quizQuestions);

    const submitTarget = getModuleSubmitTarget(activeManagerModal, editingModuleId);
    try {
      const response = await fetch(submitTarget.endpoint, {
        method: submitTarget.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: moduleForm.description.trim(),
          skillCategory,
          videoUrl: moduleForm.videoUrl.trim() || null,
          quizData,
        }),
      });
      const payload = await readJsonResponse<{ module: TrainingModuleSummary }>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      const nextModule = payload.data.module;
      setModules((current) => {
        if (submitTarget.moduleId) {
          return current.map((module) => (module.id === nextModule.id ? nextModule : module));
        }

        return [...current, nextModule].sort((left, right) => left.orderIndex - right.orderIndex);
      });
      setTeamProgress((current) => mergeTeamProgressModule(current, nextModule));
      setSelectedModuleId(nextModule.id);
      setStageView("lesson");
      setManagerMessage(submitTarget.moduleId ? "Module updated." : "Module created.");
      closeManagerModal();
    } finally {
      setIsManagerBusy(false);
    }
  }

  async function submitGenerate() {
    resetManagerFeedback();
    setIsManagerBusy(true);

    try {
      const response = await fetch("/api/training/modules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });
      const payload = await readJsonResponse<{ modules: GeneratedModuleDraft[] }>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      setGeneratedDrafts(payload.data.modules);
      setManagerMessage(
        `Generated ${payload.data.modules.length} draft module${payload.data.modules.length === 1 ? "" : "s"}.`,
      );
    } finally {
      setIsManagerBusy(false);
    }
  }

  async function saveGeneratedDraft(draft: GeneratedModuleDraft) {
    resetManagerFeedback();
    setIsManagerBusy(true);

    try {
      const response = await fetch("/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          skillCategory: draft.skillCategory,
          videoUrl: null,
          quizData: draft.quizData,
        }),
      });
      const payload = await readJsonResponse<{ module: TrainingModuleSummary }>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      setModules((current) =>
        [...current, payload.data.module].sort((left, right) => left.orderIndex - right.orderIndex),
      );
      setTeamProgress((current) => mergeTeamProgressModule(current, payload.data.module));
      setSelectedModuleId(payload.data.module.id);
      setStageView("lesson");
      setGeneratedDrafts((current) => current.filter((entry) => entry !== draft));
      setManagerMessage(`Saved "${payload.data.module.title}".`);
    } finally {
      setIsManagerBusy(false);
    }
  }

  async function submitAssignment() {
    if (!assigningModuleId) {
      return;
    }

    if (assignRepIds.length === 0) {
      setManagerError("Select at least one rep to assign.");
      return;
    }

    resetManagerFeedback();
    setIsManagerBusy(true);

    try {
      const response = await fetch(`/api/training/modules/${assigningModuleId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repIds: assignRepIds,
          dueDate: assignDueDate || null,
        }),
      });
      const payload = await readJsonResponse<{
        assignedRepIds: string[];
        rejectedRepIds: Array<{ repId: string; reason: "not_found" | "out_of_scope" }>;
      }>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      await refreshTeamProgress();
      const rejectedSummary =
        payload.data.rejectedRepIds.length > 0
          ? ` Rejected: ${payload.data.rejectedRepIds.map((entry) => entry.repId).join(", ")}.`
          : "";
      setManagerMessage(`Assigned to ${payload.data.assignedRepIds.length} rep(s).${rejectedSummary}`);
    } finally {
      setIsManagerBusy(false);
    }
  }

  async function unassignRep(repId: string) {
    if (!assigningModuleId) {
      return;
    }

    resetManagerFeedback();
    setIsManagerBusy(true);

    try {
      const response = await fetch(`/api/training/modules/${assigningModuleId}/assign/${repId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const payload = await readJsonResponse<{ unassignedRepId: string }>(response);

      if (!payload.ok) {
        setManagerError(payload.error);
        return;
      }

      await refreshTeamProgress();
      setManagerMessage(`Removed assignment for ${repId}.`);
    } finally {
      setIsManagerBusy(false);
    }
  }

  function selectModule(moduleId: string) {
    const nextState = getModuleSelectionPatch(moduleId);
    setSelectedModuleId(nextState.selectedModuleId);
    setAnswers(nextState.answers);
    setStatusMessage(nextState.statusMessage);
    setStageView(nextState.stageView);
  }

  const resolvedStageView = resolveTrainingStageView(stageView, selectedModule?.hasQuiz ?? false);
  const primaryAction = getTrainingStagePrimaryAction({
    canManage,
    hasQuiz: selectedModule?.hasQuiz ?? false,
    progress: selectedModule?.progress ?? null,
    stageView: resolvedStageView,
  });

  const primaryActionDisabled =
    isSubmitting || (primaryAction.kind === "assign" ? !selectedModule || isManagerBusy : false);

  function handlePrimaryAction() {
    if (!selectedModule) {
      return;
    }

    if (primaryAction.kind === "assign") {
      openAssignModal(selectedModule);
      return;
    }

    if (primaryAction.kind === "complete") {
      void submitProgress();
      return;
    }

    setStageView(primaryAction.nextView);
  }

  const managerStageMetrics = getTrainingManagerStageMetrics({
    repProgress: teamProgress.repProgress,
    selectedModuleId,
  });

  const managerFeedback = (
    <>
      {managerError ? (
        <div className="mt-4 rounded-xl border border-[#f38ba8]/30 bg-[#f38ba8]/10 px-4 py-3 text-sm text-[#ffd7e3]">
          {managerError}
        </div>
      ) : null}
      {managerMessage ? (
        <div className="mt-4 rounded-xl border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-3 text-sm text-[#ecedf6]">
          {managerMessage}
        </div>
      ) : null}
    </>
  );

  const hasModules = modules.length > 0;

  const managerPlannerPanel = (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a]/72 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Coverage board</p>
              <p className="mt-2 text-sm text-[#a9abb3]">
                Module-level status stays visible here so managers can spot stalled reps without leaving the planning
                deck.
              </p>
            </div>
            <div className="rounded-xl border border-[#45484f]/10 bg-[#161a21]/55 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Live snapshot</p>
              <p className="mt-1 text-sm text-[#ecedf6]">
                {managerStageMetrics.assignedCount} assigned, {managerStageMetrics.dueSoonCount} due soon
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
                                  <p className="text-sm font-semibold capitalize text-white">
                                    {progress.status.replaceAll("_", " ")}
                                  </p>
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
              Create or generate modules to start tracking coverage across the team.
            </div>
          )}
        </section>

        <TrainingManagerAiTools
          aiAvailable={aiAvailable}
          canManage={canManage}
          contextNotes={moduleAiDraftForm.contextNotes}
          isBusy={isManagerBusy}
          onContextNotesChange={(value) => setModuleAiDraftForm((current) => ({ ...current, contextNotes: value }))}
          onGenerate={(mode) => {
            void generateModuleDraft(mode);
          }}
          selectedModule={selectedModule}
        />
      </div>
    </div>
  );

  const managerEmptyPanel = (
    <section className="rounded-[1.5rem] border border-dashed border-[#45484f]/20 bg-[#10131a]/78 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">Curriculum studio</p>
      <h4 className="mt-2 text-lg font-semibold text-white">Build your curriculum</h4>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[#a9abb3]">
        Start the studio by creating your first module or generating a draft sequence with AI. Once modules exist,
        the inline deck will handle editing, assignment planning, and team coverage without leaving this shell.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10"
          onClick={openCreateModal}
          type="button"
        >
          Create module
        </button>
        <button
          className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
          disabled={!aiAvailable || isManagerBusy}
          onClick={openGenerateModal}
          type="button"
        >
          Generate with AI
        </button>
      </div>
    </section>
  );

  const activeManagerPanel =
    activeManagerModal === "create" || activeManagerModal === "edit" ? (
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">
              {activeManagerModal === "edit" ? "Editing module" : "Create module"}
            </p>
            <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
              Shape the lesson, quiz, and context inline, then save it directly into the curriculum map.
            </p>
          </div>
          <button
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a9abb3]"
            onClick={closeManagerModal}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
            onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Module title"
            value={moduleForm.title}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setModuleForm((current) => ({ ...current, skillCategory: event.target.value }))}
              value={moduleForm.skillCategory}
            >
              <option disabled value="">
                Skill category
              </option>
              {rubricCategories.map((cat) => (
                <option key={cat.slug} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setModuleForm((current) => ({ ...current, videoUrl: event.target.value }))}
              placeholder="Video URL (optional)"
              value={moduleForm.videoUrl}
            />
          </div>
          <textarea
            className="min-h-28 w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
            onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Module description"
            value={moduleForm.description}
          />
          <TrainingQuizEditor
            onChange={(quizQuestions) => setModuleForm((current) => ({ ...current, quizQuestions }))}
            value={moduleForm.quizQuestions}
          />
          <div className="flex justify-end">
            <button
              className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
              disabled={isManagerBusy}
              onClick={() => {
                void submitModuleForm();
              }}
              type="button"
            >
              {isManagerBusy ? "Saving..." : activeManagerModal === "edit" ? "Save changes" : "Create module"}
            </button>
          </div>
        </div>
      </section>
    ) : activeManagerModal === "generate" ? (
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">AI drafting</p>
            <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
              Generate draft modules inside the deck, then save only the lessons that fit the curriculum arc.
            </p>
          </div>
          <button
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a9abb3]"
            onClick={closeManagerModal}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setGenerateForm((current) => ({ ...current, topic: event.target.value }))}
              placeholder="Topic"
              value={generateForm.topic}
            />
            <input
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setGenerateForm((current) => ({ ...current, targetRole: event.target.value }))}
              placeholder="Target role"
              value={generateForm.targetRole}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
            <input
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setGenerateForm((current) => ({ ...current, skillFocus: event.target.value }))}
              placeholder="Skill focus"
              value={generateForm.skillFocus}
            />
            <input
              className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              min={1}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  moduleCount: Number.parseInt(event.target.value || "0", 10) || 0,
                }))
              }
              placeholder="Count"
              type="number"
              value={generateForm.moduleCount}
            />
          </div>
          <div className="flex justify-end">
            <button
              className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
              disabled={isManagerBusy}
              onClick={() => {
                void submitGenerate();
              }}
              type="button"
            >
              {isManagerBusy ? "Generating..." : "Generate drafts"}
            </button>
          </div>

          {generatedDrafts.length > 0 ? (
            <div className="space-y-3 pt-2">
              {generatedDrafts.map((draft) => (
                <div
                  className="rounded-xl border border-[#45484f]/20 bg-[#10131a]/80 p-4"
                  key={`${draft.title}-${draft.skillCategory}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{draft.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#74b1ff]">
                        {draft.skillCategory}
                      </p>
                    </div>
                    <button
                      className="rounded-lg border border-[#74b1ff]/30 px-3 py-2 text-xs font-semibold text-[#ecedf6]"
                      disabled={isManagerBusy}
                      onClick={() => {
                        void saveGeneratedDraft(draft);
                      }}
                      type="button"
                    >
                      Save draft
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-[#a9abb3]">{draft.description}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    ) : activeManagerModal === "assign" && assigningModule ? (
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Assignment planner</p>
            <h4 className="mt-2 text-lg font-semibold text-white">{assigningModule.title}</h4>
            <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
              Keep assignment changes inline to the command deck so coverage stays visible while you plan.
            </p>
          </div>
          <button
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a9abb3]"
            onClick={closeManagerModal}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#a9abb3]">
              Select reps, set an optional due date, and remove unstarted assignments without leaving the deck.
            </p>
            <input
              className="rounded-xl border border-[#45484f]/20 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => setAssignDueDate(event.target.value)}
              type="date"
              value={assignDueDate}
            />
          </div>
          <div className="space-y-3">
            {teamRows.map((row) => {
              const progress = assignmentProgressByRepId.get(row.repId);
              const checked = assignRepIds.includes(row.repId);

              return (
                <label
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#45484f]/20 bg-[#10131a]/80 px-4 py-3"
                  key={row.repId}
                >
                  <div className="flex items-center gap-3">
                    <input
                      checked={checked}
                      onChange={(event) =>
                        setAssignRepIds((current) =>
                          event.target.checked
                            ? [...current, row.repId]
                            : current.filter((repId) => repId !== row.repId),
                        )
                      }
                      type="checkbox"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {[row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email}
                      </p>
                      <p className="text-xs text-[#a9abb3]">{row.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-[#a9abb3]">
                      <p>{progress ? progress.status : "not assigned"}</p>
                      <p>
                        {progress?.score === null || progress?.score === undefined
                          ? "Score pending"
                          : `${progress.score}% score`}
                      </p>
                    </div>
                    {progress?.status === "assigned" ? (
                      <button
                        className="rounded-lg border border-[#45484f]/30 px-3 py-2 text-xs font-semibold text-white"
                        disabled={isManagerBusy}
                        onClick={() => {
                          void unassignRep(row.repId);
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button
              className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
              disabled={isManagerBusy}
              onClick={() => {
                void submitAssignment();
              }}
              type="button"
            >
              {isManagerBusy ? "Assigning..." : "Assign module"}
            </button>
          </div>
        </div>
      </section>
    ) : hasModules ? (
      managerPlannerPanel
    ) : (
      managerEmptyPanel
    );

  const quizContent = selectedModule ? (
    selectedModule.quizData?.questions?.length ? (
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
      <div className="rounded-xl border border-[#45484f]/10 bg-[#161a21]/50 px-4 py-4 text-sm text-[#a9abb3]">
        This module does not include a quiz. Completing it will mark the assignment as passed.
      </div>
    )
  ) : (
    <p className="text-sm text-[#a9abb3]">No modules are available.</p>
  );

  const stage = selectedModule ? (
    <TrainingModuleStage
      canManage={canManage}
      onPrimaryAction={handlePrimaryAction}
      onSelectView={setStageView}
      primaryAction={primaryAction.label}
      primaryActionDisabled={primaryActionDisabled}
      quizContent={quizContent}
      selectedModule={selectedModule}
      stageBand={canManage ? <TrainingManagerStatusBand metrics={managerStageMetrics} /> : null}
      stageView={resolvedStageView}
      statusMessage={statusMessage}
    />
  ) : canManage ? (
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Current curriculum</p>
      <div className="mt-4 rounded-[1.25rem] border border-dashed border-[#45484f]/15 bg-[#161a21]/40 p-5">
        <h2 className="text-2xl font-semibold text-white">Build your curriculum</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
          Create your first lesson or generate a starter sequence from the command deck to activate the studio.
        </p>
      </div>
    </section>
  ) : (
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Current curriculum</p>
      <div className="mt-4 rounded-[1.25rem] border border-dashed border-[#45484f]/15 bg-[#161a21]/40 p-5">
        <h2 className="text-2xl font-semibold text-white">No training is assigned yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
          Your manager will surface modules here once a curriculum is assigned. Check back soon to start practice.
        </p>
      </div>
    </section>
  );

  const tableOfContents = (
    <TrainingModuleToc modules={modules} onSelectModule={selectModule} selectedModuleId={selectedModuleId} />
  );

  const commandDeck = canManage ? (
    <TrainingManagerCommandDeck
      aiAvailable={aiAvailable}
      expandedPanel={activeManagerPanel}
      feedback={managerFeedback}
      hasSelectedModule={Boolean(selectedModule)}
      isBusy={isManagerBusy}
      moduleCount={modules.length}
      onAssign={() => {
        if (selectedModule) {
          openAssignModal(selectedModule);
        }
      }}
      onCreate={openCreateModal}
      onEdit={() => {
        if (selectedModule) {
          openEditModal(selectedModule);
        }
      }}
      onGenerate={() => {
        if (aiAvailable) {
          openGenerateModal();
        }
      }}
      repCount={teamRows.length}
      selectedModuleTitle={selectedModule?.title ?? null}
    />
  ) : null;

  return <TrainingCourseShell commandDeck={commandDeck} stage={stage} tableOfContents={tableOfContents} />;
}
