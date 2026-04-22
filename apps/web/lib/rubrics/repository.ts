import { getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  RubricCategoryInput,
  RubricCategoryRecord,
  RubricInput,
  RubricSummary,
  RubricWithCategories,
} from "./types";

type RubricRow = Database["public"]["Tables"]["rubrics"]["Row"];
type RubricCategoryRow = Database["public"]["Tables"]["rubric_categories"]["Row"];

export interface RubricsRepository {
  createDraftRubric(input: {
    orgId: string;
    createdBy: string;
    input: RubricInput;
    sourceType: "manual" | "csv_import" | "json_import";
  }): Promise<RubricWithCategories>;
  findActiveRubricByOrgId(orgId: string): Promise<RubricWithCategories | null>;
  findRubricById(orgId: string, rubricId: string): Promise<RubricWithCategories | null>;
  findRubricHistoryByOrgId(orgId: string): Promise<RubricSummary[]>;
  findCategoriesByRubricId(rubricId: string): Promise<RubricCategoryRecord[]>;
  publishDraftRubric(input: {
    orgId: string;
    rubricId: string;
    publishedBy: string;
  }): Promise<RubricWithCategories | null>;
}

function toRubricStatus(row: Pick<RubricRow, "is_active" | "is_template">) {
  if (row.is_active) {
    return "active" as const;
  }

  if (row.is_template) {
    return "template" as const;
  }

  return "draft" as const;
}

function toRubricSummary(row: RubricRow, categoryCount = 0): RubricSummary {
  return {
    id: row.id,
    orgId: row.org_id,
    version: row.version,
    name: row.name,
    description: row.description,
    status: toRubricStatus(row),
    isActive: row.is_active,
    isTemplate: row.is_template,
    createdBy: row.created_by,
    createdAt: toDate(row.created_at)?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: toDate(row.updated_at)?.toISOString() ?? new Date(0).toISOString(),
    categoryCount,
  };
}

function toRubricCategoryRecord(row: RubricCategoryRow): RubricCategoryRecord {
  const scoringCriteria = (row.scoring_criteria ?? {}) as Json;
  const criteria = typeof scoringCriteria === "object" && scoringCriteria !== null
    ? (scoringCriteria as {
        excellent?: string;
        proficient?: string;
        developing?: string;
        lookFor?: unknown;
      })
    : {};

  return {
    id: row.id,
    rubricId: row.rubric_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    weight: Number(row.weight),
    sortOrder: row.sort_order,
    scoringCriteria: {
      excellent: typeof criteria.excellent === "string" ? criteria.excellent : "",
      proficient: typeof criteria.proficient === "string" ? criteria.proficient : "",
      developing: typeof criteria.developing === "string" ? criteria.developing : "",
      lookFor: Array.isArray(criteria.lookFor)
        ? (criteria.lookFor as unknown[]).filter((value) => typeof value === "string")
        : [],
    },
    createdAt: toDate(row.created_at)?.toISOString() ?? new Date(0).toISOString(),
  };
}

function normalizeCategoryInput(category: RubricCategoryInput) {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
    weight: category.weight,
    sort_order: category.sortOrder ?? 0,
    scoring_criteria: category.scoringCriteria,
  };
}

export class SupabaseRubricsRepository implements RubricsRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  private async fetchCategories(rubricId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("rubric_categories")
      .select("id, rubric_id, slug, name, description, weight, sort_order, scoring_criteria, created_at")
      .eq("rubric_id", rubricId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(toRubricCategoryRecord);
  }

  async createDraftRubric(input: {
    orgId: string;
    createdBy: string;
    input: RubricInput;
    sourceType: "manual" | "csv_import" | "json_import";
  }) {
    const supabase: any = this.supabase;
    const { data: existing, error: existingError } = await supabase
      .from("rubrics")
      .select("version")
      .eq("org_id", input.orgId)
      .order("version", { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const nextVersion = Number(existing?.[0]?.version ?? 0) + 1;

    const { data: rubric, error: rubricError } = await supabase
      .from("rubrics")
      .insert({
        org_id: input.orgId,
        version: nextVersion,
        name: input.input.name,
        description: input.input.description,
        is_active: false,
        is_template: false,
        created_by: input.createdBy,
      })
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .single();

    if (rubricError) {
      throw new Error(rubricError.message);
    }

    const categoryRows = input.input.categories.map(normalizeCategoryInput);
    const { error: categoryError } = await supabase.from("rubric_categories").insert(
      categoryRows.map((category) => ({
        rubric_id: rubric.id,
        ...category,
      })),
    );

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    const categories = await this.fetchCategories(rubric.id);
    return {
      ...toRubricSummary(rubric, categories.length),
      categories,
    };
  }

  async findActiveRubricByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("rubrics")
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const categories = await this.fetchCategories(data.id);
    return {
      ...toRubricSummary(data, categories.length),
      categories,
    };
  }

  async findRubricById(orgId: string, rubricId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("rubrics")
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .eq("id", rubricId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const categories = await this.fetchCategories(data.id);
    return {
      ...toRubricSummary(data, categories.length),
      categories,
    };
  }

  async findRubricHistoryByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("rubrics")
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .eq("org_id", orgId)
      .order("version", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rubricIds = (data ?? []).map((row: RubricRow) => row.id);
    const categoryCounts = new Map<string, number>();

    if (rubricIds.length) {
      const { data: categories, error: categoryError } = await supabase
        .from("rubric_categories")
        .select("rubric_id")
        .in("rubric_id", rubricIds);

      if (categoryError) {
        throw new Error(categoryError.message);
      }

      for (const category of categories ?? []) {
        categoryCounts.set(category.rubric_id, (categoryCounts.get(category.rubric_id) ?? 0) + 1);
      }
    }

    return (data ?? []).map((row: RubricRow) => toRubricSummary(row, categoryCounts.get(row.id) ?? 0));
  }

  async findCategoriesByRubricId(rubricId: string) {
    return this.fetchCategories(rubricId);
  }

  async publishDraftRubric(input: {
    orgId: string;
    rubricId: string;
    publishedBy: string;
  }) {
    const supabase: any = this.supabase;
    const { data: rubric, error: rubricError } = await supabase
      .from("rubrics")
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .eq("id", input.rubricId)
      .eq("org_id", input.orgId)
      .maybeSingle();

    if (rubricError) {
      throw new Error(rubricError.message);
    }

    if (!rubric) {
      return null;
    }

    const { error: resetError } = await supabase
      .from("rubrics")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("org_id", input.orgId);

    if (resetError) {
      throw new Error(resetError.message);
    }

    const { error: publishError } = await supabase
      .from("rubrics")
      .update({
        is_active: true,
        is_template: false,
        created_by: rubric.created_by ?? input.publishedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.rubricId)
      .eq("org_id", input.orgId);

    if (publishError) {
      throw new Error(publishError.message);
    }

    const categories = await this.fetchCategories(input.rubricId);
    const { data: publishedRubric, error: publishedError } = await supabase
      .from("rubrics")
      .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
      .eq("id", input.rubricId)
      .maybeSingle();

    if (publishedError) {
      throw new Error(publishedError.message);
    }

    if (!publishedRubric) {
      return null;
    }

    return {
      ...toRubricSummary(publishedRubric, categories.length),
      categories,
    };
  }
}
