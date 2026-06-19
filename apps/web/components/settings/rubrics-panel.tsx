"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ForgeReadinessPanel, ForgeStatusPanel } from "../forge";
import {
  SettingsDrawerButton,
  SettingsDrawerGroup,
  SettingsEditorDrawer,
  SettingsEditorPanel,
  SettingsEditorWorkbench,
} from "./settings-workbench";
import {
  SettingsMetaRow,
  SettingsSectionHeader,
  SettingsTableShell,
} from "./settings-readability";
import type {
  RubricImportIssue,
  RubricInput,
  RubricSourceType,
  RubricSummary,
  RubricWithCategories,
} from "@/lib/rubrics/types";

type RequestResult<T> = { ok: true; data: T } | { ok: false; error: string };

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

const RUBRIC_FIELD_FOCUS_CLASS =
  "outline-none transition focus-visible:border-[var(--forge-gold)] focus-visible:ring-2 focus-visible:ring-[var(--forge-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--forge-surface)]";
const RUBRIC_RAIL_FIELD_CLASS = `w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] ${RUBRIC_FIELD_FOCUS_CLASS}`;
const RUBRIC_RAIL_FILE_FIELD_CLASS = `mt-3 block w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] ${RUBRIC_FIELD_FOCUS_CLASS}`;
const RUBRIC_DRAFT_FIELD_CLASS = `w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-3 text-sm text-[var(--forge-text)] ${RUBRIC_FIELD_FOCUS_CLASS}`;
const RUBRIC_CATEGORY_FIELD_CLASS = `w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2.5 text-sm text-[var(--forge-text)] ${RUBRIC_FIELD_FOCUS_CLASS}`;
const RUBRIC_CATEGORY_TEXTAREA_CLASS = `min-h-20 ${RUBRIC_CATEGORY_FIELD_CLASS}`;

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
  return [summary, ...existing].sort(
    (left, right) => right.version - left.version,
  );
}

function publishHistory(
  history: RubricSummary[],
  rubric: RubricWithCategories,
) {
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
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function collectDraftIssues(rubric: RubricInput | null) {
  if (!rubric) {
    return [];
  }

  const issues: RubricImportIssue[] = [];
  const name = rubric.name.trim();

  if (!name) {
    issues.push({
      row: null,
      field: "name",
      message: "Rubric name is required",
    });
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
      issues.push({
        row,
        field: "slug",
        message: `Slug "${slug}" must be unique`,
      });
    } else {
      seenSlugs.add(slug);
    }

    if (!nameValue) {
      issues.push({ row, field: "name", message: "Category name is required" });
    }

    if (!description) {
      issues.push({
        row,
        field: "description",
        message: "Category description is required",
      });
    }

    if (!Number.isFinite(category.weight) || category.weight <= 0) {
      issues.push({
        row,
        field: "weight",
        message: "Weight must be a positive number",
      });
    }

    if (!excellent) {
      issues.push({
        row,
        field: "excellent",
        message: "Excellent guidance is required",
      });
    }

    if (!proficient) {
      issues.push({
        row,
        field: "proficient",
        message: "Proficient guidance is required",
      });
    }

    if (!developing) {
      issues.push({
        row,
        field: "developing",
        message: "Developing guidance is required",
      });
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
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
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
  const response = await fetchImpl(
    `/api/rubrics?rubricId=${encodeURIComponent(rubricId)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

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
  const response = await fetchImpl(
    `/api/rubrics/${encodeURIComponent(rubricId)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  return readResponse<RubricWithCategories>(response);
}

export function RubricsPanel({
  defaultTemplate,
  initialActiveRubric,
  initialHistory,
}: RubricsPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("source");
  const [activeRubric, setActiveRubric] = useState<RubricWithCategories | null>(
    initialActiveRubric,
  );
  const [history, setHistory] = useState(initialHistory);
  const [draft, setDraft] = useState<RubricInput | null>(null);
  const [draftSourceType, setDraftSourceType] =
    useState<RubricSourceType>("manual");
  const [draftSourceLabel, setDraftSourceLabel] =
    useState<string>("Not started");
  const [sourceIssues, setSourceIssues] = useState<RubricImportIssue[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>(
    initialHistory.find((entry) => !entry.isActive)?.id ?? "",
  );
  const [importMode, setImportMode] = useState<"csv_import" | "json_import">(
    "csv_import",
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [serverDraft, setServerDraft] = useState<RubricWithCategories | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rubricRequestStatus, setRubricRequestStatus] = useState<
    "idle" | "prepare" | "publish"
  >("idle");
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

  function beginDraft(
    nextDraft: RubricInput,
    sourceLabel: string,
    sourceType: RubricSourceType,
  ) {
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

    beginDraft(
      copyRubricToInput(result.data),
      `Cloned from ${result.data.name}`,
      "manual",
    );
    setSourceIssues([]);
  }

  async function handleImportPreview() {
    if (!importFile) {
      setErrorMessage(
        `Choose a ${importMode === "csv_import" ? "CSV" : "JSON"} file to import.`,
      );
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
    beginDraft(
      result.data.rubric,
      importMode === "csv_import" ? "Imported CSV" : "Imported JSON",
      importMode,
    );
    setStep("edit");
  }

  async function handlePreparePublish() {
    if (!draft) {
      setErrorMessage("Start a draft before preparing publish.");
      return;
    }

    if (draftIssues.length > 0) {
      setErrorMessage(
        "Resolve draft validation issues before preparing publish.",
      );
      setStep("review");
      return;
    }

    setErrorMessage(null);
    setRubricRequestStatus("prepare");
    const result = await createRubricDraftRequest(fetch, {
      sourceType: draftSourceType,
      rubric: draft,
    }).finally(() => setRubricRequestStatus("idle"));

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
    setRubricRequestStatus("publish");
    const result = await publishRubricRequest(fetch, serverDraft.id).finally(
      () => setRubricRequestStatus("idle"),
    );

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
    setStatusMessage(
      `Published ${result.data.name} as version ${result.data.version}.`,
    );
    startTransition(() => {
      router.refresh();
    });
  }

  const isRubricBusy = rubricRequestStatus !== "idle" || isPending;
  const rubricPendingStatusMessage =
    rubricRequestStatus === "prepare"
      ? "Preparing rubric draft."
      : rubricRequestStatus === "publish"
        ? "Publishing rubric draft."
        : isPending
          ? "Refreshing rubric workspace."
          : "";

  const builderDrawer = (
    <SettingsEditorDrawer data-rubric-builder-drawer="">
      <div className="space-y-5">
        <SettingsSectionHeader
          description="Choose the next draft source without changing the live version."
          eyebrow="Source and versions"
          title="Scoring sources"
        />
        <SettingsDrawerGroup label="Active version">
          <div className="rounded-2xl border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 px-4 py-3">
            <p className="text-xs font-medium text-[var(--forge-gold)]">
              Active Rubric
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--forge-text)]">
              {activeRubric ? activeRubric.name : "No active rubric yet"}
            </p>
            {activeRubric ? (
              <div className="mt-2">
                <SettingsMetaRow
                  label="Version"
                  value={`v${activeRubric.version}`}
                />
                <SettingsMetaRow
                  label="Categories"
                  value={activeRubric.categoryCount}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
                Publish the first rubric version to start attaching it to new
                scoring jobs.
              </p>
            )}
          </div>
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label="Source options">
          <SettingsDrawerButton
            disabled={!activeRubric}
            icon="content_copy"
            onClick={() => {
              if (!activeRubric) {
                return;
              }

              setSourceIssues([]);
              beginDraft(
                copyRubricToInput(activeRubric),
                "New Draft from Active",
                "manual",
              );
            }}
            type="button"
          >
            New Draft from Active
          </SettingsDrawerButton>
          <SettingsDrawerButton
            icon="auto_fix"
            onClick={() => {
              setSourceIssues([]);
              beginDraft(
                defaultTemplate,
                "Started from Default Template",
                "manual",
              );
            }}
            type="button"
          >
            Start from Default Template
          </SettingsDrawerButton>
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label="Clone or import">
          <label className="block space-y-2 px-3">
            <span className="text-xs font-medium text-[var(--forge-muted)]">
              Clone Historical Version
            </span>
            <select
              className={RUBRIC_RAIL_FIELD_CLASS}
              data-rubric-focus-hardened="true"
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
          <SettingsDrawerButton
            className="mt-3"
            icon="account_tree"
            onClick={() => void handleCloneHistory()}
            type="button"
          >
            Clone
          </SettingsDrawerButton>

          <div className="mt-5 space-y-1">
            <SettingsDrawerButton
              active={importMode === "csv_import"}
              icon="table"
              onClick={() => setImportMode("csv_import")}
              type="button"
            >
              Import CSV
            </SettingsDrawerButton>
            <SettingsDrawerButton
              active={importMode === "json_import"}
              icon="data_object"
              onClick={() => setImportMode("json_import")}
              type="button"
            >
              Import JSON
            </SettingsDrawerButton>
          </div>
          <input
            accept={
              importMode === "csv_import"
                ? ".csv,text/csv"
                : ".json,application/json"
            }
            aria-label={`Import ${importMode === "csv_import" ? "CSV" : "JSON"} rubric file`}
            className={RUBRIC_RAIL_FILE_FIELD_CLASS}
            data-rubric-focus-hardened="true"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <SettingsDrawerButton
            className="mt-3"
            icon="preview"
            onClick={() => void handleImportPreview()}
            type="button"
          >
            Preview Import
          </SettingsDrawerButton>
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label={`Version History (${history.length})`}>
          <SettingsTableShell className="space-y-2 p-3">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--forge-muted)]">
                No rubric versions yet.
              </p>
            ) : (
              history.map((entry) => (
                <div
                  className="rounded-xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-3 py-3"
                  key={entry.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                      v{entry.version} · {entry.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.isActive
                          ? "bg-[color-mix(in_srgb,var(--forge-success)_15%,transparent)] text-[var(--forge-success)]"
                          : "border border-[var(--forge-border-strong)]/20 text-[var(--forge-muted)]"
                      }`}
                    >
                      {entry.isActive ? "Active" : entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--forge-muted)]">
                    {entry.categoryCount} categories · Updated{" "}
                    {formatDate(entry.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </SettingsTableShell>
        </SettingsDrawerGroup>

        <section className="space-y-5" data-rubric-readiness-panel="">
          <SettingsSectionHeader
            eyebrow="Admin controls"
            title="Readiness panel"
          />
          <div aria-live="polite" className="sr-only" role="status">
            {rubricPendingStatusMessage}
          </div>

          {statusMessage ? (
            <ForgeStatusPanel
              announce="polite"
              description={statusMessage}
              icon="check_circle"
              title="Rubric updated"
              tone="success"
            />
          ) : null}

          {errorMessage ? (
            <ForgeStatusPanel
              announce="assertive"
              description={errorMessage}
              icon="warning"
              title="Rubric update failed"
              tone="danger"
            />
          ) : null}

          <nav
            aria-label="Rubric admin controls"
            className="space-y-5"
            data-settings-nav-theme="forge"
          >
            <SettingsDrawerGroup label="Workflow">
              {BUILDER_STEPS.map((item) => {
                const disabled = item.id !== "source" && !draft;

                return (
                  <SettingsDrawerButton
                    active={step === item.id}
                    aria-current={step === item.id ? "step" : undefined}
                    disabled={disabled}
                    icon={
                      item.id === "source"
                        ? "input"
                        : item.id === "edit"
                          ? "edit_note"
                          : item.id === "review"
                            ? "rule"
                            : "publish"
                    }
                    key={item.id}
                    onClick={() => setStep(item.id)}
                    type="button"
                  >
                    {item.label}
                  </SettingsDrawerButton>
                );
              })}
            </SettingsDrawerGroup>

            <SettingsDrawerGroup label="Readiness">
              <ForgeReadinessPanel
                description={draftSourceLabel}
                items={[
                  { label: "Validation issues", value: draftIssues.length },
                  { label: "Import warnings", value: sourceIssues.length },
                  {
                    label: "Server draft",
                    value: serverDraft
                      ? `v${serverDraft.version}`
                      : "Not prepared",
                  },
                ]}
                label="Draft status"
                statusLabel={
                  draftIssues.length > 0
                    ? "Needs fixes"
                    : draft
                      ? "Ready to review"
                      : "Not started"
                }
                statusTone={
                  draftIssues.length > 0
                    ? "danger"
                    : draft
                      ? "success"
                      : "muted"
                }
                tone={
                  draftIssues.length > 0 ? "danger" : draft ? "gold" : "muted"
                }
                value={
                  draft
                    ? `${draft.categories.length} categories`
                    : "No draft started"
                }
              />
              <div className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 py-3">
                <p className="text-xs font-medium text-[var(--forge-muted)]">
                  Validation issues
                </p>
                {draftIssues.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-[var(--forge-danger)]">
                    {draftIssues.map((issue, index) => (
                      <li
                        key={`${issue.row ?? "global"}-${issue.field}-${index}`}
                      >
                        Row {issue.row ?? "global"} · {issue.field}:{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
                    {draft
                      ? "No validation issues."
                      : "Start a draft to run validation."}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 py-3">
                <p className="text-xs font-medium text-[var(--forge-muted)]">
                  Import warnings
                </p>
                {sourceIssues.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-[var(--forge-ember)]">
                    {sourceIssues.map((issue, index) => (
                      <li
                        key={`${issue.row ?? "import"}-${issue.field}-${index}`}
                      >
                        Row {issue.row ?? "global"} · {issue.field}:{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
                    No import warnings.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 py-3">
                <p className="text-xs font-medium text-[var(--forge-muted)]">
                  Server draft
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
                  {serverDraft
                    ? `Draft version ${serverDraft.version} · ${serverDraft.categoryCount} categories`
                    : "Prepare publish to create a server draft."}
                </p>
              </div>
            </SettingsDrawerGroup>

            <SettingsDrawerGroup label="Publish controls">
              <div
                className="space-y-1"
                data-rubric-publish-controls="streamlined"
              >
                <SettingsDrawerButton
                  active={Boolean(draft) && !serverDraft}
                  disabled={!draft || isRubricBusy}
                  icon="task_alt"
                  onClick={() => void handlePreparePublish()}
                  type="button"
                >
                  Prepare Publish
                </SettingsDrawerButton>
                {draft && step !== "edit" ? (
                  <SettingsDrawerButton
                    icon="edit_note"
                    onClick={() => setStep("edit")}
                    type="button"
                  >
                    Back to Edit
                  </SettingsDrawerButton>
                ) : null}
                {draft && step === "publish" ? (
                  <SettingsDrawerButton
                    icon="rule"
                    onClick={() => setStep("review")}
                    type="button"
                  >
                    Back to Review
                  </SettingsDrawerButton>
                ) : null}
                <SettingsDrawerButton
                  active={Boolean(serverDraft)}
                  disabled={!serverDraft || isRubricBusy}
                  icon="publish"
                  onClick={() => void handlePublish()}
                  type="button"
                >
                  {rubricRequestStatus === "publish"
                    ? "Publishing..."
                    : "Publish Draft"}
                </SettingsDrawerButton>
              </div>
            </SettingsDrawerGroup>
          </nav>
        </section>
      </div>
    </SettingsEditorDrawer>
  );

  return (
    <SettingsEditorWorkbench drawer={builderDrawer} workbench="rubrics">
      <main className="min-w-0" data-rubric-category-editor="">
        <SettingsEditorPanel>
          <SettingsSectionHeader
            actions={
              <span className="rounded-full border border-[var(--forge-border-strong)]/15 bg-[var(--forge-surface-2)]/70 px-3 py-1 text-xs font-medium text-[var(--forge-muted)]">
                {draft
                  ? `${draft.categories.length} draft categories`
                  : `${activeRubric?.categoryCount ?? 0} active categories`}
              </span>
            }
            description={
              draft
                ? "Edit scoring categories as compact rows, then use readiness controls to prepare and publish."
                : "Choose a source to start a scoring draft. The current active rubric is shown below for reference."
            }
            eyebrow="Category editor"
            title={
              draft
                ? draft.name || "Untitled rubric draft"
                : (activeRubric?.name ?? "No scoring draft selected")
            }
          />

          {draft ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/55 p-4">
                <p className="text-xs font-medium text-[var(--forge-gold)]">
                  Draft Source
                </p>
                <p className="mt-2 text-sm text-[var(--forge-text)]">
                  {draftSourceLabel}
                </p>
                {sourceIssues.length > 0 ? (
                  <p className="mt-2 text-sm text-[var(--forge-ember)]">
                    Import preview dropped {sourceIssues.length} invalid field
                    issue{sourceIssues.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-[var(--forge-muted)]">
                    Rubric name
                  </span>
                  <input
                    className={RUBRIC_DRAFT_FIELD_CLASS}
                    data-rubric-focus-hardened="true"
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    value={draft.name}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium text-[var(--forge-muted)]">
                    Description
                  </span>
                  <input
                    className={RUBRIC_DRAFT_FIELD_CLASS}
                    data-rubric-focus-hardened="true"
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        description: event.target.value || null,
                      }))
                    }
                    value={draft.description ?? ""}
                  />
                </label>
              </div>

              <SettingsTableShell className="space-y-3 p-3">
                {draft.categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/40 p-5 text-sm text-[var(--forge-muted)]">
                    No categories in this draft yet.
                  </div>
                ) : (
                  draft.categories.map((category, index) => (
                    <details
                      className="group rounded-2xl border border-[var(--forge-border-strong)]/14 bg-[var(--forge-surface-2)]/55"
                      data-rubric-category-row=""
                      key={`${category.slug || "category"}-${index}`}
                      open={index === 0}
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--forge-gold)]">
                            Category {index + 1}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-[var(--forge-text)]">
                            {category.name || "Untitled category"} ·{" "}
                            {category.slug || "missing-slug"} · weight{" "}
                            {category.weight}
                          </p>
                        </div>
                      </summary>

                      <div className="border-t border-[var(--forge-border-strong)]/10 px-4 pb-4 pt-3">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-[var(--forge-muted)]">
                              Name
                            </span>
                            <input
                              className={RUBRIC_CATEGORY_FIELD_CLASS}
                              data-rubric-focus-hardened="true"
                              onChange={(event) =>
                                updateDraft((current) => ({
                                  ...current,
                                  categories: current.categories.map(
                                    (entry, categoryIndex) =>
                                      categoryIndex === index
                                        ? { ...entry, name: event.target.value }
                                        : entry,
                                  ),
                                }))
                              }
                              value={category.name}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-[var(--forge-muted)]">
                              Slug
                            </span>
                            <input
                              className={RUBRIC_CATEGORY_FIELD_CLASS}
                              data-rubric-focus-hardened="true"
                              onChange={(event) =>
                                updateDraft((current) => ({
                                  ...current,
                                  categories: current.categories.map(
                                    (entry, categoryIndex) =>
                                      categoryIndex === index
                                        ? { ...entry, slug: event.target.value }
                                        : entry,
                                  ),
                                }))
                              }
                              value={category.slug}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-[var(--forge-muted)]">
                              Weight
                            </span>
                            <input
                              className={RUBRIC_CATEGORY_FIELD_CLASS}
                              data-rubric-focus-hardened="true"
                              min={1}
                              onChange={(event) =>
                                updateDraft((current) => ({
                                  ...current,
                                  categories: current.categories.map(
                                    (entry, categoryIndex) =>
                                      categoryIndex === index
                                        ? {
                                            ...entry,
                                            weight:
                                              Number(event.target.value) || 0,
                                          }
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
                          <span className="text-xs font-medium text-[var(--forge-muted)]">
                            Description
                          </span>
                          <textarea
                            className={RUBRIC_CATEGORY_TEXTAREA_CLASS}
                            data-rubric-focus-hardened="true"
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                categories: current.categories.map(
                                  (entry, categoryIndex) =>
                                    categoryIndex === index
                                      ? {
                                          ...entry,
                                          description: event.target.value,
                                        }
                                      : entry,
                                ),
                              }))
                            }
                            value={category.description}
                          />
                        </label>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
                          {GUIDANCE_FIELDS.map(({ field, label }) => (
                            <label className="space-y-2" key={field}>
                              <span className="text-xs font-medium text-[var(--forge-muted)]">
                                {label}
                              </span>
                              <textarea
                                className={RUBRIC_CATEGORY_TEXTAREA_CLASS}
                                data-rubric-focus-hardened="true"
                                onChange={(event) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    categories: current.categories.map(
                                      (entry, categoryIndex) =>
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
                          <span className="text-xs font-medium text-[var(--forge-muted)]">
                            Look For
                          </span>
                          <input
                            className={RUBRIC_CATEGORY_FIELD_CLASS}
                            data-rubric-focus-hardened="true"
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                categories: current.categories.map(
                                  (entry, categoryIndex) =>
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

                        <div className="mt-4 flex justify-end border-t border-[var(--forge-border-strong)]/10 pt-4">
                          <button
                            className="rounded-xl border border-[color-mix(in_srgb,var(--forge-danger)_26%,transparent)] px-3 py-2 text-sm font-medium text-[var(--forge-danger)] transition hover:bg-[color-mix(in_srgb,var(--forge-danger)_10%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--forge-danger)]/35"
                            data-rubric-category-remove-action="body"
                            onClick={() => {
                              updateDraft((current) => ({
                                ...current,
                                categories: current.categories
                                  .filter(
                                    (_, categoryIndex) =>
                                      categoryIndex !== index,
                                  )
                                  .map((entry, nextIndex) => ({
                                    ...entry,
                                    sortOrder: nextIndex,
                                  })),
                              }));
                            }}
                            type="button"
                          >
                            Remove category
                          </button>
                        </div>
                      </div>
                    </details>
                  ))
                )}
              </SettingsTableShell>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 px-4 py-3 text-sm font-semibold text-[var(--forge-muted)] transition hover:text-[var(--forge-text)]"
                  onClick={() =>
                    updateDraft((current) => ({
                      ...current,
                      categories: [
                        ...current.categories,
                        createEmptyCategory(current.categories.length),
                      ],
                    }))
                  }
                  type="button"
                >
                  Add Category
                </button>
                <button
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 px-4 py-3 text-sm font-semibold text-[var(--forge-muted)] transition hover:text-[var(--forge-text)]"
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
                <h4 className="text-lg font-semibold text-[var(--forge-text)]">
                  Choose a source to start a scoring draft.
                </h4>
                <p className="mt-2 text-sm leading-7 text-[var(--forge-muted)]">
                  Use the drawer to start from the active rubric, the default
                  template, a historical version, or an import preview.
                </p>
              </div>

              {activeRubric?.categories.length ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[var(--forge-gold)]">
                    Published scoring categories
                  </p>
                  <SettingsTableShell className="space-y-3 p-3">
                    {activeRubric.categories.map((category, index) => (
                      <div
                        className="rounded-2xl border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/55 p-4"
                        data-rubric-category-row=""
                        key={category.id}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                          <div>
                            <p className="text-xs font-medium text-[var(--forge-muted)]">
                              Name
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--forge-text)]">
                              {category.name || `Category ${index + 1}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[var(--forge-muted)]">
                              Slug
                            </p>
                            <p className="mt-1 text-sm text-[var(--forge-text)]">
                              {category.slug}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[var(--forge-muted)]">
                              Weight
                            </p>
                            <p className="mt-1 text-sm text-[var(--forge-text)]">
                              {category.weight}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">
                          {category.description}
                        </p>
                      </div>
                    ))}
                  </SettingsTableShell>
                </div>
              ) : null}
            </div>
          )}
        </SettingsEditorPanel>
      </main>
    </SettingsEditorWorkbench>
  );
}
