import type {
  RubricCategoryInput,
  RubricImportIssue,
  RubricImportResult,
  RubricInput,
} from "./types";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRubricName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Imported rubric";
  }

  return trimmed.replace(/\.[a-z0-9]+$/i, "").trim() || "Imported rubric";
}

function createEmptyRubric(name: string): RubricInput {
  return {
    name: normalizeRubricName(name),
    description: null,
    categories: [],
  };
}

function toString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function buildIssue(row: number | null, field: string, message: string): RubricImportIssue {
  return { row, field, message };
}

function parseWeight(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normalizeImportedCategory(
  candidate: Record<string, unknown>,
  row: number,
  sortOrder: number,
) {
  const issues: RubricImportIssue[] = [];
  const name = toString(candidate.name);
  const slug = normalizeSlug(toString(candidate.slug) || name);
  const weight = parseWeight(candidate.weight);

  if (!slug) {
    issues.push(buildIssue(row, "slug", "Slug is required"));
  }

  if (!name) {
    issues.push(buildIssue(row, "name", "Name is required"));
  }

  if (weight === null) {
    issues.push(buildIssue(row, "weight", "Weight must be a positive number"));
  }

  if (issues.length) {
    return { category: null, issues };
  }

  const normalizedWeight = weight ?? 0;
  const category: RubricCategoryInput = {
    slug,
    name,
    description: toString(candidate.description),
    weight: normalizedWeight,
    scoringCriteria: {
      excellent: toString(candidate.excellent),
      proficient: toString(candidate.proficient),
      developing: toString(candidate.developing),
      lookFor: toStringArray(candidate.lookFor),
    },
    sortOrder,
  };

  return { category, issues };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvRows(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitCsvLine);
}

export function parseCsvRubricImport(content: string, fallbackName: string): RubricImportResult {
  const rows = parseCsvRows(content);
  const rubric = createEmptyRubric(fallbackName);
  const issues: RubricImportIssue[] = [];

  if (!rows.length) {
    return {
      rubric,
      issues: [buildIssue(null, "file", "CSV file is empty")],
    };
  }

  const [header, ...entries] = rows;
  const headerMap = new Map(
    header.map((column, index) => [column.replace(/^\uFEFF/, "").trim().toLowerCase(), index]),
  );

  if (!headerMap.has("name") || !headerMap.has("slug") || !headerMap.has("weight")) {
    return {
      rubric,
      issues: [buildIssue(null, "file", "CSV headers must include name, slug, and weight")],
    };
  }

  for (const [index, row] of entries.entries()) {
    const rowNumber = index + 2;
    const record: Record<string, unknown> = {
      name: row[headerMap.get("name") ?? -1] ?? "",
      slug: row[headerMap.get("slug") ?? -1] ?? "",
      description: row[headerMap.get("description") ?? -1] ?? "",
      weight: row[headerMap.get("weight") ?? -1] ?? "",
      excellent: row[headerMap.get("excellent") ?? -1] ?? "",
      proficient: row[headerMap.get("proficient") ?? -1] ?? "",
      developing: row[headerMap.get("developing") ?? -1] ?? "",
      lookFor: row[headerMap.get("lookfor") ?? -1] ?? row[headerMap.get("lookFor") ?? -1] ?? "",
    };

    const normalized = normalizeImportedCategory(record, rowNumber, rubric.categories.length);
    issues.push(...normalized.issues);

    if (normalized.category) {
      rubric.categories.push(normalized.category);
    }
  }

  return { rubric, issues };
}

export function parseJsonRubricImport(content: string, fallbackName: string): RubricImportResult {
  const rubric = createEmptyRubric(fallbackName);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return {
      rubric,
      issues: [buildIssue(null, "file", "JSON file could not be parsed")],
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      rubric,
      issues: [buildIssue(null, "file", "JSON payload must be an object")],
    };
  }

  const candidate = parsed as Record<string, unknown>;
  rubric.name = normalizeRubricName(toString(candidate.name) || fallbackName);
  rubric.description = toString(candidate.description) || null;

  if (!Array.isArray(candidate.categories)) {
    return {
      rubric,
      issues: [buildIssue(null, "categories", "JSON payload must include a categories array")],
    };
  }

  const issues: RubricImportIssue[] = [];

  for (const [index, entry] of candidate.categories.entries()) {
    if (!entry || typeof entry !== "object") {
      issues.push(buildIssue(index + 1, "category", "Category must be an object"));
      continue;
    }

    const category = entry as Record<string, unknown>;
    const scoringCriteria =
      category.scoringCriteria && typeof category.scoringCriteria === "object"
        ? (category.scoringCriteria as Record<string, unknown>)
        : {};

    const normalized = normalizeImportedCategory(
      {
        ...category,
        excellent: scoringCriteria.excellent,
        proficient: scoringCriteria.proficient,
        developing: scoringCriteria.developing,
        lookFor: scoringCriteria.lookFor,
      },
      index + 1,
      rubric.categories.length,
    );

    issues.push(...normalized.issues);
    if (normalized.category) {
      rubric.categories.push(normalized.category);
    }
  }

  return { rubric, issues };
}
