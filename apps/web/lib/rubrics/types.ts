export type RubricStatus = "active" | "draft" | "template";

export type RubricSourceType = "manual" | "csv_import" | "json_import";

export type RubricScoringCriteria = {
  excellent: string;
  proficient: string;
  developing: string;
  lookFor: string[];
};

export type RubricCategoryInput = {
  slug: string;
  name: string;
  description: string;
  weight: number;
  scoringCriteria: RubricScoringCriteria;
  sortOrder?: number;
};

export type RubricInput = {
  name: string;
  description: string | null;
  categories: RubricCategoryInput[];
};

export type RubricCategoryRecord = {
  id: string;
  rubricId: string;
  slug: string;
  name: string;
  description: string;
  weight: number;
  sortOrder: number;
  scoringCriteria: RubricScoringCriteria;
  createdAt: string;
};

export type RubricSummary = {
  id: string;
  orgId: string | null;
  version: number;
  name: string;
  description: string | null;
  status: RubricStatus;
  isActive: boolean;
  isTemplate: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryCount: number;
};

export type RubricWithCategories = RubricSummary & {
  categories: RubricCategoryRecord[];
};

