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
type GuidanceField = "excellent" | "proficient" | "developing";

const BUILDER_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "source", label: "Choose Source" },
  { id: "edit", label: "Edit Draft" },
  { id: "review", label: "Review & Fix" },
  { id: "publish", label: "Publish" },
];

const GUIDANCE_FIELDS: Array<{ field: GuidanceField; label: string }> = [
  { field: "excellent", label: "Excellent" },
  { field: "proficient", label: "Proficient" },
  { field: "developing", label: "Developing" },
];

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
    <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start" data-rubric-builder-rail="">
        <section className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Source and versions</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Scoring sources</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
            Choose the source for the next scoring draft without changing the live version.
          </p>

          <div className="mt-5 rounded-2xl border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--forge-gold)]">Active Rubric</p>
            <p className="mt-2 text-sm font-semibold text-[var(--forge-text)]">
              {activeRubric ? activeRubric.name : "No active rubric yet"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
              {activeRubric
                ? `Version ${activeRubric.version} · ${activeRubric.categoryCount} categories`
                : "Publish the first rubric version to start attaching it to new scoring jobs."}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
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
              New Draft from Active
            </button>
            <button
              className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10"
              onClick={() => {
                setSourceIssues([]);
                beginDraft(defaultTemplate, "Started from Default Template", "manual");
              }}
              type="button"
            >
              Start from Default Template
            </button>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Clone or import</p>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--forge-muted)]">Clone Historical Version</span>
            <select
              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none"
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
          </label>
          <button
            className="mt-3 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10"
            onClick={() => void handleCloneHistory()}
            type="button"
          >
            Clone
          </button>

          <div className="mt-5 flex gap-2">
            <button
              className={`flex-1 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                importMode === "csv_import"
                  ? "bg-[var(--forge-gold)] text-[#170d07]"
                  : "border border-[var(--forge-border-strong)]/20 text-[var(--forge-muted)]"
              }`}
              onClick={() => setImportMode("csv_import")}
              type="button"
            >
              Import CSV
            </button>
            <button
              className={`flex-1 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                importMode === "json_import"
                  ? "bg-[var(--forge-gold)] text-[#170d07]"
                  : "border border-[var(--forge-border-strong)]/20 text-[var(--forge-muted)]"
              }`}
              onClick={() => setImportMode("json_import")}
              type="button"
            >
              Import JSON
            </button>
          </div>
          <input
            accept={importMode === "csv_import" ? ".csv,text/csv" : ".json,application/json"}
            className="mt-3 block w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)]"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <button
            className="mt-3 w-full rounded-xl border border-[var(--forge-gold)]/25 bg-[var(--forge-gold)]/10 px-4 py-3 text-left text-sm font-semibold text-[var(--forge-text)] transition hover:border-[var(--forge-gold)]/45 hover:bg-[var(--forge-gold)]/15"
            onClick={() => void handleImportPreview()}
            type="button"
          >
            Preview Import
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Version History</p>
            <span className="text-xs font-semibold text-[var(--forge-muted)]">{history.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--forge-muted)]">No rubric versions yet.</p>
            ) : (
              history.map((entry) => (
                <div
                  className="rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-3 py-3"
                  key={entry.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">v{entry.version} · {entry.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                        entry.isActive
                          ? "bg-[rgba(139,215,168,0.15)] text-[var(--forge-success)]"
                          : "border border-[var(--forge-border-strong)]/20 text-[var(--forge-muted)]"
                      }`}
                    >
                      {entry.isActive ? "Active" : entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--forge-muted)]">
                    {entry.categoryCount} categories · Updated {formatDate(entry.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <main className="min-w-0" data-rubric-category-editor="">
        <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--forge-gold)]">Category editor</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {draft ? draft.name || "Untitled rubric draft" : activeRubric?.name ?? "No scoring draft selected"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--forge-muted)]">
                {draft
                  ? "Edit scoring categories as compact rows, then use readiness controls to prepare and publish."
                  : "Choose a source to start a scoring draft. The current active rubric is shown below for reference."}
              </p>
            </div>
            <span className="rounded-full border border-[var(--forge-border-strong)]/15 bg-[var(--forge-surface-2)]/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--forge-muted)]">
              {draft ? `${draft.categories.length} draft categories` : `${activeRubric?.categoryCount ?? 0} active categories`}
            </span>
          </div>

          {draft ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/55 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--forge-gold)]">Draft Source</p>
                <p className="mt-2 text-sm text-[var(--forge-text)]">{draftSourceLabel}</p>
                {sourceIssues.length > 0 ? (
                  <p className="mt-2 text-sm text-[var(--forge-ember)]">
                    Import preview dropped {sourceIssues.length} invalid field issue{sourceIssues.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Rubric name</span>
                  <input
                    className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-3 text-sm text-[var(--forge-text)] outline-none"
                    onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
                    value={draft.name}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Description</span>
                  <input
                    className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-3 text-sm text-[var(--forge-text)] outline-none"
                    onChange={(event) =>
                      updateDraft((current) => ({ ...current, description: event.target.value || null }))
                    }
                    value={draft.description ?? ""}
                  />
                </label>
              </div>

              <div className="space-y-3">
                {draft.categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/40 p-5 text-sm text-[var(--forge-muted)]">
                    No categories in this draft yet.
                  </div>
                ) : (
                  draft.categories.map((category, index) => (
                    <section
                      className="rounded-2xl border border-[var(--forge-border-strong)]/14 bg-[var(--forge-surface-2)]/55 p-4"
                      key={`${category.slug || "category"}-${index}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                          Category {index + 1}
                        </p>
                        <button
                          className="rounded-xl border border-[rgba(255,113,108,0.26)] px-3 py-2 text-sm font-medium text-[var(--forge-danger)] transition hover:bg-[rgba(255,113,108,0.1)]"
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

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Name</span>
                          <input
                            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Slug</span>
                          <input
                            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Weight</span>
                          <input
                            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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

                      <label className="mt-3 block space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Description</span>
                        <textarea
                          className="min-h-20 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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

                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        {GUIDANCE_FIELDS.map(({ field, label }) => (
                          <label className="space-y-2" key={field}>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">
                              {label}
                            </span>
                            <textarea
                              className="min-h-20 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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
                              value={category.scoringCriteria[field]}
                            />
                          </label>
                        ))}
                      </div>

                      <label className="mt-3 block space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">
                          Look For
                        </span>
                        <input
                          className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none"
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
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 px-4 py-3 text-sm font-semibold text-[var(--forge-muted)] transition hover:text-white"
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
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 px-4 py-3 text-sm font-semibold text-[var(--forge-muted)] transition hover:text-white"
                  onClick={() => setStep("source")}
                  type="button"
                >
                  Back to Sources
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-dashed border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/40 p-5">
                <h4 className="text-lg font-semibold text-white">Choose a source to start a scoring draft.</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--forge-muted)]">
                  Use the rail to start from the active rubric, the default template, a historical version, or an import preview.
                </p>
              </div>

              {activeRubric?.categories.length ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                    Published scoring categories
                  </p>
                  {activeRubric.categories.map((category, index) => (
                    <div
                      className="rounded-2xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/55 p-4"
                      key={category.id}
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Name</p>
                          <p className="mt-1 text-sm font-semibold text-white">{category.name || `Category ${index + 1}`}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Slug</p>
                          <p className="mt-1 text-sm text-[var(--forge-text)]">{category.slug}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--forge-muted)]">Weight</p>
                          <p className="mt-1 text-sm text-[var(--forge-text)]">{category.weight}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">{category.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start" data-rubric-readiness-panel="">
        <section className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Readiness panel</p>
          <div className="mt-4 grid gap-2">
            {BUILDER_STEPS.map((item) => (
              <div
                aria-current={step === item.id ? "step" : undefined}
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                  step === item.id
                    ? "bg-[var(--forge-gold)] text-[#170d07]"
                    : "border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/60 text-[var(--forge-muted)]"
                }`}
                key={item.id}
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Draft status</p>
            <p className="mt-2 text-sm font-semibold text-[var(--forge-text)]">
              {draft ? `${draft.categories.length} categories in draft` : "No draft started"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{draftSourceLabel}</p>
          </div>

          {statusMessage ? (
            <div className="mt-4 rounded-2xl border border-[rgba(139,215,168,0.24)] bg-[rgba(139,215,168,0.1)] px-4 py-3 text-sm text-[var(--forge-success)]">
              {statusMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-[rgba(255,113,108,0.26)] bg-[rgba(255,113,108,0.1)] px-4 py-3 text-sm text-[var(--forge-danger)]">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Validation issues</p>
              {draftIssues.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--forge-danger)]">
                  {draftIssues.map((issue, index) => (
                    <li key={`${issue.row ?? "global"}-${issue.field}-${index}`}>
                      Row {issue.row ?? "global"} · {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--forge-muted)]">
                  {draft ? "No validation issues." : "Start a draft to run validation."}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Import warnings</p>
              {sourceIssues.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--forge-ember)]">
                  {sourceIssues.map((issue, index) => (
                    <li key={`${issue.row ?? "import"}-${issue.field}-${index}`}>
                      Row {issue.row ?? "global"} · {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--forge-muted)]">No import warnings.</p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Server draft</p>
              <p className="mt-2 text-sm text-[var(--forge-muted)]">
                {serverDraft
                  ? `Draft version ${serverDraft.version} · ${serverDraft.categoryCount} categories`
                  : "Prepare publish to create a server draft."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!draft}
              onClick={() => setStep("review")}
              type="button"
            >
              Review Draft
            </button>
            <button
              className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-4 py-3 text-left text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!draft || isPending}
              onClick={() => void handlePreparePublish()}
              type="button"
            >
              Prepare Publish
            </button>
            {draft && step !== "edit" ? (
              <button
                className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10"
                onClick={() => setStep("edit")}
                type="button"
              >
                Back to Edit
              </button>
            ) : null}
            {draft && step === "publish" ? (
              <button
                className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/10"
                onClick={() => setStep("review")}
                type="button"
              >
                Back to Review
              </button>
            ) : null}
            <button
              className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-4 py-3 text-left text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!serverDraft || isPending}
              onClick={() => void handlePublish()}
              type="button"
            >
              {isPending ? "Publishing..." : "Publish Draft"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
