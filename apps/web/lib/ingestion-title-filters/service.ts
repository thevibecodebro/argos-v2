import type {
  IngestionTitleFilterConfig,
  IngestionTitleFilterKind,
} from "@argos-v2/call-processing";
import {
  canonicalizeIngestionTitleText,
  normalizeIngestionTitleText,
} from "@argos-v2/call-processing";
import type { DashboardUserRecord } from "@/lib/dashboard/service";

type IngestionTitleFiltersResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

export type IngestionTitleFilterRecord = {
  kind: IngestionTitleFilterKind;
  phrase: string;
};

export type IngestionTitleFilterWrite = IngestionTitleFilterRecord & {
  normalizedPhrase: string;
};

export interface IngestionTitleFiltersRepository {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  listTitleFilters(orgId: string): Promise<IngestionTitleFilterRecord[]>;
  replaceTitleFilters(input: {
    createdBy: string;
    filters: IngestionTitleFilterWrite[];
    orgId: string;
  }): Promise<void>;
}

const adminError = {
  ok: false as const,
  status: 403 as const,
  error: "Only organization admins can manage ingestion title filters",
};

async function findAdminViewer(
  repository: IngestionTitleFiltersRepository,
  authUserId: string,
) {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return { ok: false as const, result: { ok: false as const, status: 404 as const, error: "User not found" } };
  }

  if (!viewer.org) {
    return {
      ok: false as const,
      result: {
        ok: false as const,
        status: 400 as const,
        error: "User must be in an organization",
      },
    };
  }

  if (viewer.role !== "admin") {
    return { ok: false as const, result: adminError };
  }

  return { ok: true as const, org: viewer.org, viewer };
}

function toConfig(records: IngestionTitleFilterRecord[]): IngestionTitleFilterConfig {
  const includePhrases = records
    .filter((record) => record.kind === "include")
    .map((record) => record.phrase);
  const excludePhrases = records
    .filter((record) => record.kind === "exclude")
    .map((record) => record.phrase);

  return {
    configured: includePhrases.length > 0,
    excludePhrases,
    includePhrases,
  };
}

function invalidInput(error: string) {
  return { ok: false as const, status: 400 as const, error };
}

function validatePhraseList(
  field: "includePhrases" | "excludePhrases",
  values: unknown[],
) {
  if (values.length > 50) {
    return invalidInput(`${field} cannot contain more than 50 phrases`);
  }

  const phrases: Array<{ normalizedPhrase: string; phrase: string }> = [];
  const normalizedPhrases = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      return invalidInput(`Each ${field} phrase must be a string from 1 to 80 characters`);
    }

    const phrase = canonicalizeIngestionTitleText(value);
    const characterCount = Array.from(phrase).length;

    if (characterCount < 1 || characterCount > 80) {
      return invalidInput(`Each ${field} phrase must be a string from 1 to 80 characters`);
    }

    const normalizedPhrase = normalizeIngestionTitleText(phrase);

    if (normalizedPhrases.has(normalizedPhrase)) {
      return invalidInput(`${field} contains normalized duplicates`);
    }

    normalizedPhrases.add(normalizedPhrase);
    phrases.push({ normalizedPhrase, phrase });
  }

  return { ok: true as const, phrases, normalizedPhrases };
}

export async function getOrganizationIngestionTitleFilters(
  repository: IngestionTitleFiltersRepository,
  authUserId: string,
): Promise<IngestionTitleFiltersResult<IngestionTitleFilterConfig>> {
  const access = await findAdminViewer(repository, authUserId);

  if (!access.ok) {
    return access.result;
  }

  const records = await repository.listTitleFilters(access.org.id);

  return {
    ok: true,
    data: toConfig(records),
  };
}

export async function replaceOrganizationIngestionTitleFilters(
  repository: IngestionTitleFiltersRepository,
  authUserId: string,
  input: unknown,
): Promise<IngestionTitleFiltersResult<IngestionTitleFilterConfig>> {
  const access = await findAdminViewer(repository, authUserId);

  if (!access.ok) {
    return access.result;
  }

  if (!input || typeof input !== "object") {
    return invalidInput("includePhrases and excludePhrases must be arrays");
  }

  const candidate = input as {
    excludePhrases?: unknown;
    includePhrases?: unknown;
  };

  if (!Array.isArray(candidate.includePhrases) || !Array.isArray(candidate.excludePhrases)) {
    return invalidInput("includePhrases and excludePhrases must be arrays");
  }

  const includes = validatePhraseList("includePhrases", candidate.includePhrases);

  if (!includes.ok) {
    return includes;
  }

  const excludes = validatePhraseList("excludePhrases", candidate.excludePhrases);

  if (!excludes.ok) {
    return excludes;
  }

  if (
    Array.from(includes.normalizedPhrases).some((phrase) =>
      excludes.normalizedPhrases.has(phrase),
    )
  ) {
    return invalidInput("A phrase cannot appear in both includePhrases and excludePhrases");
  }

  const filters: IngestionTitleFilterWrite[] = [
    ...includes.phrases.map((phrase) => ({ ...phrase, kind: "include" as const })),
    ...excludes.phrases.map((phrase) => ({ ...phrase, kind: "exclude" as const })),
  ];

  await repository.replaceTitleFilters({
    createdBy: access.viewer.id,
    filters,
    orgId: access.org.id,
  });

  return {
    ok: true,
    data: toConfig(filters),
  };
}
