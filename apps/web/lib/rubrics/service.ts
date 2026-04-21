import type { RubricInput, RubricSourceType, RubricWithCategories } from "./types";
import type { RubricsRepository } from "./repository";

export type { RubricsRepository } from "./repository";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404 | 409 | 500; error: string };

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateRubricInput(input: unknown): ServiceResult<RubricInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, status: 400, error: "Rubric payload must be an object" };
  }

  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const description = typeof candidate.description === "string" ? candidate.description.trim() : "";
  const categories = Array.isArray(candidate.categories) ? candidate.categories : [];

  if (!name) {
    return { ok: false, status: 400, error: "Rubric name is required" };
  }

  if (!categories.length) {
    return { ok: false, status: 400, error: "At least one category is required" };
  }

  const normalizedCategories: RubricInput["categories"] = [];
  const seenSlugs = new Set<string>();

  for (const [index, category] of categories.entries()) {
    if (!category || typeof category !== "object") {
      return { ok: false, status: 400, error: `Category ${index + 1} must be an object` };
    }

    const entry = category as Record<string, unknown>;
    const slug = normalizeSlug(typeof entry.slug === "string" ? entry.slug : typeof entry.name === "string" ? entry.name : "");
    const categoryName = typeof entry.name === "string" ? entry.name.trim() : "";
    const categoryDescription = typeof entry.description === "string" ? entry.description.trim() : "";
    const weight = typeof entry.weight === "number" ? entry.weight : Number(entry.weight);
    const scoringCriteria = entry.scoringCriteria as
      | {
          excellent?: unknown;
          proficient?: unknown;
          developing?: unknown;
          lookFor?: unknown;
        }
      | undefined;

    if (!slug) {
      return { ok: false, status: 400, error: `Category ${index + 1} slug is required` };
    }

    if (seenSlugs.has(slug)) {
      return { ok: false, status: 400, error: `Category slug "${slug}" must be unique` };
    }
    seenSlugs.add(slug);

    if (!categoryName) {
      return { ok: false, status: 400, error: `Category ${index + 1} name is required` };
    }

    if (!categoryDescription) {
      return { ok: false, status: 400, error: `Category ${index + 1} description is required` };
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      return { ok: false, status: 400, error: `Category ${index + 1} weight must be positive` };
    }

    const excellent = typeof scoringCriteria?.excellent === "string" ? scoringCriteria.excellent.trim() : "";
    const proficient = typeof scoringCriteria?.proficient === "string" ? scoringCriteria.proficient.trim() : "";
    const developing = typeof scoringCriteria?.developing === "string" ? scoringCriteria.developing.trim() : "";
    const lookFor = Array.isArray(scoringCriteria?.lookFor)
      ? (scoringCriteria?.lookFor as unknown[]).filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean)
      : [];

    if (!excellent || !proficient || !developing) {
      return {
        ok: false,
        status: 400,
        error: `Category ${index + 1} scoring guidance is required`,
      };
    }

    normalizedCategories.push({
      slug,
      name: categoryName,
      description: categoryDescription,
      weight,
      scoringCriteria: {
        excellent,
        proficient,
        developing,
        lookFor,
      },
      sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
    });
  }

  return {
    ok: true,
    data: {
      name,
      description: description || null,
      categories: normalizedCategories,
    },
  };
}

export async function loadActiveRubric(repository: RubricsRepository, orgId: string) {
  return repository.findActiveRubricByOrgId(orgId);
}

export async function getActiveRubric(
  repository: RubricsRepository,
  orgId: string,
): Promise<ServiceResult<RubricWithCategories>> {
  const rubric = await loadActiveRubric(repository, orgId);

  if (!rubric) {
    return {
      ok: false,
      status: 404,
      error: "Active rubric not found",
    };
  }

  return {
    ok: true,
    data: rubric,
  };
}

export async function loadRubricHistory(repository: RubricsRepository, orgId: string) {
  return repository.findRubricHistoryByOrgId(orgId);
}

export async function createDraftRubric(
  repository: RubricsRepository,
  input: {
    orgId: string;
    createdBy: string;
    sourceType: RubricSourceType;
    rubric: RubricInput;
  },
): Promise<RubricWithCategories> {
  return repository.createDraftRubric({
    orgId: input.orgId,
    createdBy: input.createdBy,
    sourceType: input.sourceType,
    input: input.rubric,
  });
}

export async function publishRubric(
  repository: RubricsRepository,
  input: {
    orgId: string;
    rubricId: string;
    publishedBy: string;
  },
) {
  return repository.publishDraftRubric(input);
}
