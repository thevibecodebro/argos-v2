"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  RubricImportIssue,
  RubricInput,
  RubricSourceType,
  RubricSummary,
  RubricWithCategories,
} from "@/lib/rubrics/types";

type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type RubricImportPreviewResponse = {
  rubric: RubricInput;
  issues: RubricImportIssue[];
};

type RubricsPanelProps = {
  defaultTemplate: RubricInput;
  initialActiveRubric: RubricWithCategories | null;
  initialHistory: RubricSummary[];
};

type WizardStep = "source" | "edit" | "review" | "publish";

function copyRubricInput(rubric: RubricInput): RubricInput {
  return {
    name: rubric.name,
    description: rubric.description,
    categories: rubric.categories.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      weight: category.weight,
      sortOrder: category.sortOrder ?? index,
      scoringCriteria: {
        excellent: category.scoringCriteria.excellent,
        proficient: category.scoringCriteria.proficient,
        developing: category.scoringCriteria.developing,
        lookFor: [...category.scoringCriteria.lookFor],
      },
    })),
  };
}

function copyRubricToInput(rubric: RubricWithCategories): RubricInput {
  return {
    name: rubric.name,
    description: rubric.description,
    categories: rubric.categories.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      weight: category.weight,
      sortOrder: category.sortOrder ?? index,
      scoringCriteria: {
        excellent: category.scoringCriteria.excellent,
        proficient: category.scoringCriteria.proficient,
        developing: category.scoringCriteria.developing,
        lookFor: [...category.scoringCriteria.lookFor],
      },
    })),
  };
}

function createEmptyCategory(index: number) {
  return {
    slug: "",
    name: "",
    description: "",
    weight: 5,
    sortOrder: index,
    scoringCriteria: {
      excellent: "",
      proficient: "",
      developing: "",
      lookFor: [],
    },
  };
}

function toSummary(rubric: RubricWithCategories): RubricSummary {
  return {
    id: rubric.id,
    orgId: rubric.orgId,
    version: rubric.version,
    name: rubric.name,
    description: rubric.description,
    status: rubric.status,
    isActive: rubric.isActive,
    isTemplate: rubric.isTemplate,
    createdBy: rubric.createdBy,
    createdAt: rubric.createdAt,
    updatedAt: rubric.updatedAt,
    categoryCount: rubric.categoryCount,
  };
}

function updateHistory(history: RubricSummary[], summary: RubricSummary) {
  const existing = history.filter((entry) => entry.id !== summary.id);
  return [summary, ...existing].sort((left, right) => right.version - left.version);
}

function publishHistory(history: RubricSummary[], rubric: RubricWithCategories) {
  const publishedSummary = toSummary(rubric);
  return updateHistory(
    history.map((entry) =>
      entry.id === rubric.id
        ? publishedSummary
        : entry.isActive
          ? { ...entry, isActive: false, status: "draft" }
          : entry,
    ),
    publishedSummary,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function collectDraftIssues(rubric: RubricInput | null) {
  if (!rubric) {
    return [];
  }

  const issues: RubricImportIssue[] = [];
  const name = rubric.name.trim();

  if (!name) {
    issues.push({ row: null, field: "name", message: "Rubric name is required" });
  }

  if (rubric.categories.length === 0) {
    issues.push({
      row: null,
      field: "categories",
      message: "At least one category is required before publish",
    });
  }

  const seenSlugs = new Set<string>();

  rubric.categories.forEach((category, index) => {
    const row = index + 1;
    const slug = category.slug.trim();
    const nameValue = category.name.trim();
    const description = category.description.trim();
    const excellent = category.scoringCriteria.excellent.trim();
    const proficient = category.scoringCriteria.proficient.trim();
    const developing = category.scoringCriteria.developing.trim();

    if (!slug) {
      issues.push({ row, field: "slug", message: "Slug is required" });
    } else if (seenSlugs.has(slug)) {
      issues.push({ row, field: "slug", message: `Slug "${slug}" must be unique` });
    } else {
      seenSlugs.add(slug);
    }

    if (!nameValue) {
      issues.push({ row, field: "name", message: "Category name is required" });
    }

    if (!description) {
      issues.push({ row, field: "description", message: "Category description is required" });
    }

    if (!Number.isFinite(category.weight) || category.weight <= 0) {
      issues.push({ row, field: "weight", message: "Weight must be a positive number" });
    }

    if (!excellent) {
      issues.push({ row, field: "excellent", message: "Excellent guidance is required" });
    }

    if (!proficient) {
      issues.push({ row, field: "proficient", message: "Proficient guidance is required" });
    }

    if (!developing) {
      issues.push({ row, field: "developing", message: "Developing guidance is required" });
    }
  });

  return issues;
}

async function readResponse<T>(response: Response): Promise<RequestResult<T>> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "Unexpected server response" };
  }

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed";

    return { ok: false, error };
  }

  return { ok: true, data: payload as T };
}

export async function fetchRubricDetailRequest(
  fetchImpl: typeof fetch,
  rubricId: string,
): Promise<RequestResult<RubricWithCategories>> {
  const response = await fetchImpl(`/api/rubrics?rubricId=${encodeURIComponent(rubricId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return readResponse<RubricWithCategories>(response);
}

export async function previewRubricImportRequest(
  fetchImpl: typeof fetch,
  input: {
    content: string;
    fileName: string;
    sourceType: "csv_import" | "json_import";
  },
): Promise<RequestResult<RubricImportPreviewResponse>> {
  const response = await fetchImpl("/api/rubrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preview: true,
      sourceType: input.sourceType,
      fileName: input.fileName,
      content: input.content,
    }),
  });

  return readResponse<RubricImportPreviewResponse>(response);
}

export async function createRubricDraftRequest(
  fetchImpl: typeof fetch,
  input: {
    rubric: RubricInput;
    sourceType: RubricSourceType;
  },
): Promise<RequestResult<RubricWithCategories>> {
  const response = await fetchImpl("/api/rubrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: input.sourceType,
      rubric: input.rubric,
    }),
  });

  return readResponse<RubricWithCategories>(response);
}

export async function publishRubricRequest(
  fetchImpl: typeof fetch,
  rubricId: string,
): Promise<RequestResult<RubricWithCategories>> {
  const response = await fetchImpl(`/api/rubrics/${encodeURIComponent(rubricId)}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return readResponse<RubricWithCategories>(response);
}

export function RubricsPanel({
  defaultTemplate,
  initialActiveRubric,
  initialHistory,
}: RubricsPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("source");
  const [activeRubric, setActiveRubric] = useState<RubricWithCategories | null>(initialActiveRubric);
  const [history, setHistory] = useState(initialHistory);
  const [draft, setDraft] = useState<RubricInput | null>(null);
  const [draftSourceType, setDraftSourceType] = useState<RubricSourceType>("manual");
  const [draftSourceLabel, setDraftSourceLabel] = useState<string>("Not started");
  const [sourceIssues, setSourceIssues] = useState<RubricImportIssue[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>(
    initialHistory.find((entry) => !entry.isActive)?.id ?? "",
  );
  const [importMode, setImportMode] = useState<"csv_import" | "json_import">("csv_import");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [serverDraft, setServerDraft] = useState<RubricWithCategories | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const historicalVersions = useMemo(
    () => history.filter((entry) => !entry.isActive),
    [history],
  );
  const draftIssues = useMemo(() => collectDraftIssues(draft), [draft]);

  function resetServerDraft() {
    setServerDraft(null);
    setStatusMessage(null);
  }

  function beginDraft(nextDraft: RubricInput, sourceLabel: string, sourceType: RubricSourceType) {
    setDraft(copyRubricInput(nextDraft));
    setDraftSourceLabel(sourceLabel);
    setDraftSourceType(sourceType);
    setStep("edit");
    setErrorMessage(null);
    setStatusMessage(null);
    resetServerDraft();
  }

  function updateDraft(patch: (current: RubricInput) => RubricInput) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return patch(current);
    });
    resetServerDraft();
    setErrorMessage(null);
  }

  async function handleCloneHistory() {
    if (!selectedHistoryId) {
      setErrorMessage("Choose a historical version to clone.");
      return;
    }

    setErrorMessage(null);
    const result = await fetchRubricDetailRequest(fetch, selectedHistoryId);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    beginDraft(copyRubricToInput(result.data), `Cloned from ${result.data.name}`, "manual");
    setSourceIssues([]);
  }

  async function handleImportPreview() {
    if (!importFile) {
      setErrorMessage(`Choose a ${importMode === "csv_import" ? "CSV" : "JSON"} file to import.`);
      return;
    }

    setErrorMessage(null);
    const content = await importFile.text();
    const result = await previewRubricImportRequest(fetch, {
      content,
      fileName: importFile.name,
      sourceType: importMode,
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setSourceIssues(result.data.issues);
    beginDraft(result.data.rubric, importMode === "csv_import" ? "Imported CSV" : "Imported JSON", importMode);
    setStep("edit");
  }

  async function handlePreparePublish() {
    if (!draft) {
      setErrorMessage("Start a draft before preparing publish.");
      return;
    }

    if (draftIssues.length > 0) {
      setErrorMessage("Resolve draft validation issues before preparing publish.");
      setStep("review");
      return;
    }

    setErrorMessage(null);
    const result = await createRubricDraftRequest(fetch, {
      sourceType: draftSourceType,
      rubric: draft,
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setServerDraft(result.data);
    setHistory((current) => updateHistory(current, toSummary(result.data)));
    setStatusMessage("Draft created. Publish when ready.");
    setStep("publish");
  }

  async function handlePublish() {
    if (!serverDraft) {
      setErrorMessage("Prepare the server draft before publishing.");
      return;
    }

    setErrorMessage(null);
    const result = await publishRubricRequest(fetch, serverDraft.id);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setActiveRubric(result.data);
    setHistory((current) => publishHistory(current, result.data));
    setDraft(null);
    setServerDraft(null);
    setSourceIssues([]);
    setDraftSourceLabel("Not started");
    setStep("source");
    setStatusMessage(`Published ${result.data.name} as version ${result.data.version}.`);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Active Rubric</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {activeRubric ? activeRubric.name : "No active rubric yet"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#a9abb3]">
              {activeRubric
                ? activeRubric.description || "This version is currently attached to new scoring jobs."
                : "Publish the first rubric version to start attaching it to new scoring jobs."}
            </p>
          </div>
          {activeRubric ? (
            <div className="rounded-2xl border border-[#74b1ff]/20 bg-[#74b1ff]/10 px-4 py-3 text-right text-sm text-[#cfe4ff]">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Live</p>
              <p className="mt-2 font-semibold">Version {activeRubric.version}</p>
              <p className="mt-1 text-xs text-[#9fc4ff]">{activeRubric.categoryCount} categories</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex flex-wrap gap-2">
          {[
            ["source", "Choose Source"],
            ["edit", "Edit Draft"],
            ["review", "Review & Fix"],
            ["publish", "Publish"],
          ].map(([id, label]) => (
            <div
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${
                step === id
                  ? "bg-[#74b1ff] text-[#002345]"
                  : "border border-[#45484f]/20 bg-[#161a21]/60 text-[#a9abb3]"
              }`}
              key={id}
            >
              {label}
            </div>
          ))}
        </div>

        {statusMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {step === "source" ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <button
                className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5 text-left transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!activeRubric}
                onClick={() => {
                  if (!activeRubric) {
                    return;
                  }

                  setSourceIssues([]);
                  beginDraft(copyRubricToInput(activeRubric), "New Draft from Active", "manual");
                }}
                type="button"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Primary</p>
                <h3 className="mt-2 text-lg font-semibold text-white">New Draft from Active</h3>
                <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
                  Start from the currently published rubric without changing any historical scores.
                </p>
              </button>

              <button
                className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5 text-left transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/10"
                onClick={() => {
                  setSourceIssues([]);
                  beginDraft(defaultTemplate, "Started from Default Template", "manual");
                }}
                type="button"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Secondary</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Start from Default Template</h3>
                <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
                  Begin from the built-in Revenue Scorecard baseline and edit from there.
                </p>
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Secondary</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Clone Historical Version</h3>
                <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
                  Pull a prior version into the editor, make changes locally, and publish a new immutable version later.
                </p>
                <select
                  className="mt-4 w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-[#ecedf6] outline-none"
                  onChange={(event) => setSelectedHistoryId(event.target.value)}
                  value={selectedHistoryId}
                >
                  <option value="">Select a historical version</option>
                  {historicalVersions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      v{entry.version} · {entry.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="self-end rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110"
                onClick={() => void handleCloneHistory()}
                type="button"
              >
                Clone
              </button>
            </div>

            <div className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                    importMode === "csv_import"
                      ? "bg-[#74b1ff] text-[#002345]"
                      : "border border-[#45484f]/20 text-[#a9abb3]"
                  }`}
                  onClick={() => setImportMode("csv_import")}
                  type="button"
                >
                  Import CSV
                </button>
                <button
                  className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                    importMode === "json_import"
                      ? "bg-[#74b1ff] text-[#002345]"
                      : "border border-[#45484f]/20 text-[#a9abb3]"
                  }`}
                  onClick={() => setImportMode("json_import")}
                  type="button"
                >
                  Import JSON
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#a9abb3]">
                Upload a rubric file to preview the normalized draft locally. Invalid rows stay out of the draft and are reported for cleanup.
              </p>
              <input
                accept={importMode === "csv_import" ? ".csv,text/csv" : ".json,application/json"}
                className="mt-4 block w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-[#ecedf6]"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <button
                className="mt-4 rounded-xl border border-[#74b1ff]/25 bg-[#74b1ff]/10 px-4 py-2 text-sm font-semibold text-[#cfe4ff] transition hover:border-[#74b1ff]/45 hover:bg-[#74b1ff]/15"
                onClick={() => void handleImportPreview()}
                type="button"
              >
                Preview Import
              </button>
            </div>
          </div>
        ) : null}

        {step === "edit" && draft ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Draft Source</p>
              <p className="mt-2 text-sm text-[#ecedf6]">{draftSourceLabel}</p>
              {sourceIssues.length > 0 ? (
                <p className="mt-2 text-sm text-amber-200">
                  Import preview dropped {sourceIssues.length} invalid field issue{sourceIssues.length === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Rubric name</span>
                <input
                  className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                  onChange={(event) =>
                    updateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  value={draft.name}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Description</span>
                <input
                  className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                  onChange={(event) =>
                    updateDraft((current) => ({ ...current, description: event.target.value || null }))
                  }
                  value={draft.description ?? ""}
                />
              </label>
            </div>

            <div className="space-y-4">
              {draft.categories.map((category, index) => (
                <section
                  className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5"
                  key={`${category.slug || "category"}-${index}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">
                        Category {index + 1}
                      </p>
                      <p className="mt-2 text-sm text-[#a9abb3]">Edit category metadata and scoring guidance.</p>
                    </div>
                    <button
                      className="rounded-xl border border-red-500/25 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          categories: current.categories
                            .filter((_, categoryIndex) => categoryIndex !== index)
                            .map((entry, nextIndex) => ({ ...entry, sortOrder: nextIndex })),
                        }))
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Name</span>
                      <input
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            categories: current.categories.map((entry, categoryIndex) =>
                              categoryIndex === index ? { ...entry, name: event.target.value } : entry,
                            ),
                          }))
                        }
                        value={category.name}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Slug</span>
                      <input
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            categories: current.categories.map((entry, categoryIndex) =>
                              categoryIndex === index ? { ...entry, slug: event.target.value } : entry,
                            ),
                          }))
                        }
                        value={category.slug}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Weight</span>
                      <input
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                        min={1}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            categories: current.categories.map((entry, categoryIndex) =>
                              categoryIndex === index
                                ? { ...entry, weight: Number(event.target.value) || 0 }
                                : entry,
                            ),
                          }))
                        }
                        type="number"
                        value={category.weight}
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">Description</span>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          categories: current.categories.map((entry, categoryIndex) =>
                            categoryIndex === index ? { ...entry, description: event.target.value } : entry,
                          ),
                        }))
                      }
                      value={category.description}
                    />
                  </label>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {[
                      ["Excellent", "excellent"],
                      ["Proficient", "proficient"],
                      ["Developing", "developing"],
                    ].map(([label, field]) => (
                      <label className="space-y-2" key={field}>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">{label}</span>
                        <textarea
                          className="min-h-24 w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              categories: current.categories.map((entry, categoryIndex) =>
                                categoryIndex === index
                                  ? {
                                      ...entry,
                                      scoringCriteria: {
                                        ...entry.scoringCriteria,
                                        [field]: event.target.value,
                                      },
                                    }
                                  : entry,
                              ),
                            }))
                          }
                          value={category.scoringCriteria[field as "excellent" | "proficient" | "developing"]}
                        />
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a9abb3]">
                      Look For
                    </span>
                    <input
                      className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-3 text-sm text-[#ecedf6] outline-none"
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          categories: current.categories.map((entry, categoryIndex) =>
                            categoryIndex === index
                              ? {
                                  ...entry,
                                  scoringCriteria: {
                                    ...entry.scoringCriteria,
                                    lookFor: event.target.value
                                      .split("|")
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                      value={category.scoringCriteria.lookFor.join(" | ")}
                    />
                  </label>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl border border-[#45484f]/20 px-4 py-3 text-sm font-semibold text-[#a9abb3] transition hover:text-white"
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    categories: [...current.categories, createEmptyCategory(current.categories.length)],
                  }))
                }
                type="button"
              >
                Add Category
              </button>
              <button
                className="rounded-xl border border-[#45484f]/20 px-4 py-3 text-sm font-semibold text-[#a9abb3] transition hover:text-white"
                onClick={() => setStep("source")}
                type="button"
              >
                Back to Sources
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110"
                onClick={() => setStep("review")}
                type="button"
              >
                Review Draft
              </button>
            </div>
          </div>
        ) : null}

        {step === "review" && draft ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Review</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{draft.name || "Untitled draft"}</h3>
              <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
                {draft.categories.length} categories ready for publish review. Only the final publish action changes the active version.
              </p>
            </div>

            {draftIssues.length > 0 ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">
                <p className="font-semibold text-red-50">Fix before publish</p>
                <ul className="mt-3 space-y-2">
                  {draftIssues.map((issue, index) => (
                    <li key={`${issue.row ?? "global"}-${issue.field}-${index}`}>
                      Row {issue.row ?? "global"} · {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-emerald-100">
                The local draft is valid and ready to become a server-side draft.
              </div>
            )}

            {sourceIssues.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-100">
                <p className="font-semibold text-amber-50">Import warnings</p>
                <ul className="mt-3 space-y-2">
                  {sourceIssues.map((issue, index) => (
                    <li key={`${issue.row ?? "import"}-${issue.field}-${index}`}>
                      Row {issue.row ?? "global"} · {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl border border-[#45484f]/20 px-4 py-3 text-sm font-semibold text-[#a9abb3] transition hover:text-white"
                onClick={() => setStep("edit")}
                type="button"
              >
                Back to Edit
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110"
                onClick={() => void handlePreparePublish()}
                type="button"
              >
                Prepare Publish
              </button>
            </div>
          </div>
        ) : null}

        {step === "publish" ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">Publish</p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {serverDraft ? serverDraft.name : "Prepare a server draft first"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
                Creating a draft does not activate it. Only the publish button below makes the new version live.
              </p>
              {serverDraft ? (
                <div className="mt-4 rounded-2xl border border-[#74b1ff]/20 bg-[#74b1ff]/10 px-4 py-3 text-sm text-[#cfe4ff]">
                  Draft version {serverDraft.version} · {serverDraft.categoryCount} categories
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl border border-[#45484f]/20 px-4 py-3 text-sm font-semibold text-[#a9abb3] transition hover:text-white"
                onClick={() => setStep("review")}
                type="button"
              >
                Back to Review
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!serverDraft || isPending}
                onClick={() => void handlePublish()}
                type="button"
              >
                {isPending ? "Publishing..." : "Publish Draft"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Version History</p>
            <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
              Every published version stays pinned for historical call scores. Clone any prior version to branch new work.
            </p>
          </div>
          <span className="rounded-full border border-[#45484f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
            {history.length} versions
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-[#a9abb3]">No rubric versions yet.</p>
          ) : (
            history.map((entry) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-[#45484f]/20 bg-[#161a21]/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                key={entry.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      v{entry.version} · {entry.name}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                        entry.isActive
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "border border-[#45484f]/20 text-[#a9abb3]"
                      }`}
                    >
                      {entry.isActive ? "Active" : entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#a9abb3]">
                    {entry.description || "No description provided."}
                  </p>
                </div>
                <div className="text-sm text-[#a9abb3]">
                  <p>{entry.categoryCount} categories</p>
                  <p className="mt-1">Updated {formatDate(entry.updatedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
