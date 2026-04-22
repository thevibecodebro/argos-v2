# Rubrics Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin-only `/settings/rubric` workflow for creating, importing, reviewing, and publishing immutable rubric versions without mutating historical call scores.

**Architecture:** Keep the server page thin and aligned with existing settings routes. Put rubric import parsing and rubric lookup in `lib/rubrics`, expose those capabilities through two small API routes, and drive the wizard UI from a dedicated `RubricsPanel` client component that keeps the draft local through edit/review, creates the server-side draft only when the admin advances into Publish, and then publishes that draft ID.

**Tech Stack:** Next.js App Router, React 19 server/client components, Vitest, existing `lib/rubrics` service/repository layer, `NextResponse`, and `router.refresh()` for post-mutation sync.

---

## File Structure

**Create:**

- `apps/web/lib/rubrics/import.ts`
- `apps/web/lib/rubrics/import.test.ts`
- `apps/web/lib/rubrics/service.test.ts`
- `apps/web/app/api/rubrics/route.ts`
- `apps/web/app/api/rubrics/[id]/publish/route.ts`
- `apps/web/lib/rubrics/routes.test.ts`
- `apps/web/components/settings/rubrics-panel.tsx`
- `apps/web/lib/rubrics-panel.test.tsx`
- `apps/web/app/(authenticated)/settings/rubric/page.tsx`
- `apps/web/lib/rubrics-page.test.tsx`
- `apps/web/lib/settings-nav.test.tsx`

**Modify:**

- `apps/web/lib/rubrics/types.ts`
- `apps/web/lib/rubrics/service.ts`
- `apps/web/lib/rubrics/repository.ts`

**Responsibilities:**

- `import.ts` parses CSV/JSON into a draftable rubric payload and collects fixable import issues.
- `types.ts` holds the import issue and API payload types the page, routes, and tests share.
- `service.ts` stays as the domain entry point for active/history lookup, direct rubric lookup by ID, draft creation, and publish.
- `repository.ts` gains a single-org-safe `findRubricById` read path.
- `/api/rubrics` handles initial reads, historical rubric detail reads, import preview, and final draft creation from the local wizard state.
- `/api/rubrics/[id]/publish` handles publish-only mutation.
- `RubricsPanel` owns the wizard steps and request helpers.
- `settings/rubric/page.tsx` mirrors the other settings pages: auth gate, admin gate, server bootstrap, `PageFrame`.

### Task 1: Rubric Domain and Import Parsing

**Files:**
- Create: `apps/web/lib/rubrics/import.test.ts`
- Create: `apps/web/lib/rubrics/service.test.ts`
- Create: `apps/web/lib/rubrics/import.ts`
- Modify: `apps/web/lib/rubrics/types.ts`
- Modify: `apps/web/lib/rubrics/service.ts`
- Modify: `apps/web/lib/rubrics/repository.ts`

- [ ] **Step 1: Write the failing import parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseCsvRubricImport, parseJsonRubricImport } from "./import";

describe("parseCsvRubricImport", () => {
  it("keeps valid rows and reports invalid rows separately", () => {
    const result = parseCsvRubricImport(
      [
        "name,slug,description,weight,excellent,proficient,developing,lookFor",
        "\"Build Rapport\",rapport,\"Opens with relevant context\",5,\"Strong opener\",\"Solid opener\",\"Weak opener\",\"Professional tone|Relevant context\"",
        "\"\",broken,\"Missing name\",0,\"\",\"\",\"\",\"\"",
      ].join("\n"),
      "Imported CSV Rubric",
    );

    expect(result.rubric.name).toBe("Imported CSV Rubric");
    expect(result.rubric.categories).toHaveLength(1);
    expect(result.rubric.categories[0]).toMatchObject({
      slug: "rapport",
      name: "Build Rapport",
      weight: 5,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: 3,
        field: "name",
      }),
      expect.objectContaining({
        row: 3,
        field: "weight",
      }),
    ]);
  });
});

describe("parseJsonRubricImport", () => {
  it("accepts a rubric-shaped JSON payload and reports invalid categories", () => {
    const result = parseJsonRubricImport(
      JSON.stringify({
        name: "Imported JSON Rubric",
        description: "Imported from JSON",
        categories: [
          {
            slug: "discovery",
            name: "Discovery",
            description: "Depth of discovery",
            weight: 15,
            scoringCriteria: {
              excellent: "Uncovers pain and urgency",
              proficient: "Finds some pain",
              developing: "Stays surface level",
              lookFor: ["Pain", "Urgency"],
            },
          },
          {
            slug: "",
            name: "",
            description: "",
            weight: 0,
            scoringCriteria: {},
          },
        ],
      }),
      "fallback.json",
    );

    expect(result.rubric.name).toBe("Imported JSON Rubric");
    expect(result.rubric.categories).toHaveLength(1);
    expect(result.issues).toEqual([
      expect.objectContaining({ row: 2, field: "slug" }),
      expect.objectContaining({ row: 2, field: "name" }),
      expect.objectContaining({ row: 2, field: "weight" }),
    ]);
  });
});
```

- [ ] **Step 2: Run the import parser tests to verify they fail**

Run: `npm run test:web -- import.test.ts`

Expected: FAIL with module-not-found or missing export errors for `./import`.

- [ ] **Step 3: Write the failing service tests for lookup and publish invariants**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  getRubricById,
  getActiveRubric,
  loadRubricHistory,
  publishRubric,
  type RubricsRepository,
} from "./service";

function createRepository(
  overrides: Partial<RubricsRepository> = {},
): RubricsRepository {
  return {
    createDraftRubric: vi.fn(),
    findActiveRubricByOrgId: vi.fn(),
    findRubricHistoryByOrgId: vi.fn(),
    findCategoriesByRubricId: vi.fn(),
    findRubricById: vi.fn(),
    publishDraftRubric: vi.fn(),
    ...overrides,
  };
}

describe("getRubricById", () => {
  it("returns the requested historical rubric detail", async () => {
    const repository = createRepository({
      findRubricById: vi.fn().mockResolvedValue({
        id: "rubric-6",
        orgId: "org-1",
        version: 6,
        name: "Revenue Scorecard v6",
        description: "Historical rubric",
        status: "draft",
        isActive: false,
        isTemplate: false,
        createdBy: "user-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        categoryCount: 2,
        categories: [],
      }),
    });

    const result = await getRubricById(repository, "org-1", "rubric-6");

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: "rubric-6",
        version: 6,
      }),
    });
  });
});

describe("publishRubric", () => {
  it("returns the published draft and leaves history lookup available", async () => {
    const repository = createRepository({
      publishDraftRubric: vi.fn().mockResolvedValue({
        id: "rubric-7",
        orgId: "org-1",
        version: 7,
        name: "Revenue Scorecard v7",
        description: null,
        status: "active",
        isActive: true,
        isTemplate: false,
        createdBy: "user-1",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        categoryCount: 7,
        categories: [],
      }),
      findRubricHistoryByOrgId: vi.fn().mockResolvedValue([
        { id: "rubric-7", version: 7, name: "Revenue Scorecard v7", isActive: true, status: "active", isTemplate: false, orgId: "org-1", description: null, createdBy: "user-1", createdAt: "2026-04-22T00:00:00.000Z", updatedAt: "2026-04-22T00:00:00.000Z", categoryCount: 7 },
        { id: "rubric-6", version: 6, name: "Revenue Scorecard v6", isActive: false, status: "draft", isTemplate: false, orgId: "org-1", description: null, createdBy: "user-1", createdAt: "2026-04-20T00:00:00.000Z", updatedAt: "2026-04-20T00:00:00.000Z", categoryCount: 7 },
      ]),
    });

    const publishResult = await publishRubric(repository, {
      orgId: "org-1",
      rubricId: "rubric-7",
      publishedBy: "user-1",
    });
    const history = await loadRubricHistory(repository, "org-1");

    expect(publishResult).toEqual(
      expect.objectContaining({
        id: "rubric-7",
        isActive: true,
      }),
    );
    expect(history).toHaveLength(2);
  });
});
```

- [ ] **Step 4: Run the rubric service tests to verify they fail**

Run: `npm run test:web -- service.test.ts`

Expected: FAIL with `findRubricById` missing from `RubricsRepository` and `getRubricById` missing from `./service`.

- [ ] **Step 5: Implement the shared rubric import/result types**

```ts
export type RubricImportIssue = {
  row: number;
  field: string;
  message: string;
};

export type RubricImportResult = {
  rubric: RubricInput;
  issues: RubricImportIssue[];
};

export type PreviewRubricImportRequest =
  | {
      mode: "import_csv";
      preview: true;
      sourceType: "csv_import";
      fileName: string;
      content: string;
    }
  | {
      mode: "import_json";
      preview: true;
      sourceType: "json_import";
      fileName: string;
      content: string;
    };

export type CreateRubricDraftRequest = {
  mode: "manual";
  sourceType: "manual" | "csv_import" | "json_import";
  rubric: RubricInput;
};
```

- [ ] **Step 6: Implement the import parser module**

```ts
import { validateRubricInput } from "./service";
import type { RubricCategoryInput, RubricImportIssue, RubricImportResult } from "./types";

function toFallbackName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Imported Rubric";
}

export function parseCsvRubricImport(content: string, fallbackName: string): RubricImportResult {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",").map((value) => value.trim());
  const issues: RubricImportIssue[] = [];
  const categories: RubricCategoryInput[] = [];

  rows.forEach((row, index) => {
    const values = row.split(",").map((value) => value.trim().replace(/^\"|\"$/g, ""));
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const weight = Number(record.weight);

    if (!record.name) issues.push({ row: index + 2, field: "name", message: "Category name is required" });
    if (!record.description) issues.push({ row: index + 2, field: "description", message: "Description is required" });
    if (!Number.isFinite(weight) || weight <= 0) issues.push({ row: index + 2, field: "weight", message: "Weight must be positive" });
    if (!record.excellent) issues.push({ row: index + 2, field: "excellent", message: "Excellent guidance is required" });
    if (!record.proficient) issues.push({ row: index + 2, field: "proficient", message: "Proficient guidance is required" });
    if (!record.developing) issues.push({ row: index + 2, field: "developing", message: "Developing guidance is required" });

    if (issues.some((issue) => issue.row === index + 2)) {
      return;
    }

    categories.push({
      slug: record.slug || record.name,
      name: record.name,
      description: record.description,
      weight,
      scoringCriteria: {
        excellent: record.excellent,
        proficient: record.proficient,
        developing: record.developing,
        lookFor: record.lookFor ? record.lookFor.split("|").map((value) => value.trim()).filter(Boolean) : [],
      },
      sortOrder: index,
    });
  });

  return {
    rubric: {
      name: fallbackName,
      description: null,
      categories,
    },
    issues,
  };
}

export function parseJsonRubricImport(content: string, fileName: string): RubricImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      rubric: { name: toFallbackName(fileName), description: null, categories: [] },
      issues: [{ row: 1, field: "file", message: "JSON could not be parsed" }],
    };
  }

  const candidate = parsed as { name?: unknown; description?: unknown; categories?: unknown[] };
  const name = typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : toFallbackName(fileName);
  const categories = Array.isArray(candidate.categories) ? candidate.categories : [];
  const issues: RubricImportIssue[] = [];
  const normalized: RubricCategoryInput[] = [];

  categories.forEach((entry, index) => {
    const result = validateRubricInput({
      name,
      description: typeof candidate.description === "string" ? candidate.description : null,
      categories: [entry],
    });

    if (!result.ok) {
      issues.push({ row: index + 1, field: "category", message: result.error });
      return;
    }

    normalized.push(result.data.categories[0]);
  });

  return {
    rubric: {
      name,
      description: typeof candidate.description === "string" ? candidate.description : null,
      categories: normalized,
    },
    issues,
  };
}
```

- [ ] **Step 7: Implement `findRubricById` in the repository and `getRubricById` in the service**

```ts
// repository.ts
findRubricById(orgId: string, rubricId: string): Promise<RubricWithCategories | null>;

async findRubricById(orgId: string, rubricId: string) {
  const { data, error } = await this.supabase
    .from("rubrics")
    .select("id, org_id, version, name, description, is_active, is_template, created_by, created_at, updated_at")
    .eq("id", rubricId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const categories = await this.fetchCategories(data.id);
  return {
    ...toRubricSummary(data, categories.length),
    categories,
  };
}

// service.ts
export async function getRubricById(
  repository: RubricsRepository,
  orgId: string,
  rubricId: string,
) {
  const rubric = await repository.findRubricById(orgId, rubricId);

  if (!rubric) {
    return { ok: false as const, status: 404 as const, error: "Rubric not found" };
  }

  return { ok: true as const, data: rubric };
}
```

- [ ] **Step 8: Run the new domain tests to verify they pass**

Run: `npm run test:web -- import.test.ts service.test.ts`

Expected: PASS with the new import and service tests green.

- [ ] **Step 9: Commit the domain layer**

```bash
git add apps/web/lib/rubrics/types.ts apps/web/lib/rubrics/import.ts apps/web/lib/rubrics/import.test.ts apps/web/lib/rubrics/service.ts apps/web/lib/rubrics/service.test.ts apps/web/lib/rubrics/repository.ts
git commit -m "feat: add rubric import and lookup helpers"
```

### Task 2: Rubrics API Routes

**Files:**
- Create: `apps/web/lib/rubrics/routes.test.ts`
- Create: `apps/web/app/api/rubrics/route.ts`
- Create: `apps/web/app/api/rubrics/[id]/publish/route.ts`
- Modify: `apps/web/lib/rubrics/service.ts`

- [ ] **Step 1: Write the failing API route tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createRubricsRepository = vi.fn();
const createUsersRepository = vi.fn();
const getCurrentUserDetails = vi.fn();
const getActiveRubric = vi.fn();
const loadRubricHistory = vi.fn();
const getRubricById = vi.fn();
const createDraftRubric = vi.fn();
const publishRubric = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({ getAuthenticatedSupabaseUser }));
vi.mock("@/lib/rubrics/create-repository", () => ({ createRubricsRepository }));
vi.mock("@/lib/users/create-repository", () => ({ createUsersRepository }));
vi.mock("@/lib/users/service", () => ({ getCurrentUserDetails }));
vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric,
  loadRubricHistory,
  getRubricById,
  createDraftRubric,
  publishRubric,
  validateRubricInput: (value: unknown) => ({ ok: true, data: value }),
}));

describe("rubrics routes", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createRubricsRepository.mockReturnValue({});
    createUsersRepository.mockReturnValue({});
    getCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        profileImageUrl: null,
        role: "admin",
        orgId: "org-1",
        displayNameSet: true,
        org: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: "2026-04-01T00:00:00.000Z",
        },
      },
    });
    getActiveRubric.mockResolvedValue({ ok: false, status: 404, error: "Active rubric not found" });
    loadRubricHistory.mockResolvedValue([]);
  });

  it("returns 401 when the viewer is unauthenticated", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValueOnce(null);
    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(new Request("http://localhost:3100/api/rubrics"));
    expect(response.status).toBe(401);
  });

  it("returns active rubric and history on GET", async () => {
    getActiveRubric.mockResolvedValueOnce({ ok: true, data: { id: "rubric-7", version: 7, name: "Revenue Scorecard", description: null, status: "active", isActive: true, isTemplate: false, orgId: "org-1", createdBy: "user-1", createdAt: "2026-04-22T00:00:00.000Z", updatedAt: "2026-04-22T00:00:00.000Z", categoryCount: 1, categories: [] } });
    loadRubricHistory.mockResolvedValueOnce([{ id: "rubric-7", version: 7, name: "Revenue Scorecard", description: null, status: "active", isActive: true, isTemplate: false, orgId: "org-1", createdBy: "user-1", createdAt: "2026-04-22T00:00:00.000Z", updatedAt: "2026-04-22T00:00:00.000Z", categoryCount: 1 }]);

    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(new Request("http://localhost:3100/api/rubrics"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      activeRubric: expect.objectContaining({ id: "rubric-7" }),
      history: [expect.objectContaining({ id: "rubric-7" })],
    });
  });

  it("returns a selected historical rubric detail when a rubricId query is present", async () => {
    getRubricById.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "rubric-4",
        version: 4,
        name: "Revenue Scorecard v4",
        description: null,
        categories: [
          {
            id: "cat-1",
            rubricId: "rubric-4",
            slug: "rapport",
            name: "Build Rapport",
            description: "Open strong",
            weight: 5,
            sortOrder: 0,
            scoringCriteria: {
              excellent: "Great",
              proficient: "Good",
              developing: "Weak",
              lookFor: ["Context"],
            },
            createdAt: "2026-04-20T00:00:00.000Z",
          },
        ],
      },
    });
    createDraftRubric.mockResolvedValueOnce({
      id: "rubric-8",
      version: 8,
      name: "Revenue Scorecard v4",
      description: null,
      categories: [],
    });

    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(
      new Request("http://localhost:3100/api/rubrics?rubricId=rubric-4"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      selectedRubric: expect.objectContaining({ id: "rubric-4" }),
    });
  });

  it("previews imported CSV categories without creating a draft", async () => {
    const route = await import("../../app/api/rubrics/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import_csv",
          preview: true,
          sourceType: "csv_import",
          fileName: "rubric.csv",
          content: "name,slug,description,weight,excellent,proficient,developing,lookFor\nBuild Rapport,rapport,Open strong,5,Great,Good,Weak,Context",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rubric: expect.objectContaining({ name: "rubric" }),
      issues: [],
    });
    expect(createDraftRubric).not.toHaveBeenCalled();
  });

  it("creates a draft from the local wizard payload", async () => {
    createDraftRubric.mockResolvedValueOnce({
      id: "rubric-8",
      version: 8,
      name: "Revenue Scorecard v8",
      description: null,
      categories: [],
    });

    const route = await import("../../app/api/rubrics/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          sourceType: "csv_import",
          rubric: {
            name: "Revenue Scorecard v8",
            description: null,
            categories: [],
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createDraftRubric).toHaveBeenCalled();
  });

  it("publishes a draft through the publish route", async () => {
    publishRubric.mockResolvedValueOnce({
      id: "rubric-8",
      version: 8,
      name: "Revenue Scorecard v8",
      isActive: true,
    });

    const route = await import("../../app/api/rubrics/[id]/publish/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/rubrics/rubric-8/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "rubric-8" }) },
    );

    expect(response.status).toBe(200);
    expect(publishRubric).toHaveBeenCalledWith({}, expect.objectContaining({ rubricId: "rubric-8" }));
  });
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm run test:web -- routes.test.ts`

Expected: FAIL with module-not-found for `app/api/rubrics/route.ts` and `app/api/rubrics/[id]/publish/route.ts`.

- [ ] **Step 3: Implement the `GET /api/rubrics` and `POST /api/rubrics` route**

```ts
import { unauthorizedJson } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";
import {
  createDraftRubric,
  getActiveRubric,
  getRubricById,
  loadRubricHistory,
  validateRubricInput,
} from "@/lib/rubrics/service";
import { parseCsvRubricImport, parseJsonRubricImport } from "@/lib/rubrics/import";
import type {
  CreateRubricDraftRequest,
  PreviewRubricImportRequest,
  RubricInput,
} from "@/lib/rubrics/types";

async function requireAdmin() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) return { ok: false as const, response: unauthorizedJson() };

  const viewer = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!viewer?.ok || viewer.data.role !== "admin") {
    return { ok: false as const, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, authUser, viewer: viewer.data };
}

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const repository = createRubricsRepository();
  if (!access.viewer.orgId) {
    return Response.json({ error: "You are not part of an organization" }, { status: 400 });
  }

  const rubricId = new URL(request.url).searchParams.get("rubricId");
  const [activeResult, history, selectedResult] = await Promise.all([
    getActiveRubric(repository, access.viewer.orgId),
    loadRubricHistory(repository, access.viewer.orgId),
    rubricId ? getRubricById(repository, access.viewer.orgId, rubricId) : Promise.resolve(null),
  ]);

  return Response.json({
    activeRubric: activeResult.ok ? activeResult.data : null,
    history,
    selectedRubric: selectedResult && selectedResult.ok ? selectedResult.data : null,
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  if (!access.viewer.orgId) {
    return Response.json({ error: "You are not part of an organization" }, { status: 400 });
  }

  let body: CreateRubricDraftRequest | PreviewRubricImportRequest;
  try {
    body = (await request.json()) as CreateRubricDraftRequest | PreviewRubricImportRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repository = createRubricsRepository();
  if (body.mode === "import_csv") {
    const parsed = parseCsvRubricImport(body.content, body.fileName.replace(/\.[^.]+$/, "") || "Imported Rubric");
    return Response.json(parsed);
  }

  if (body.mode === "import_json") {
    const parsed = parseJsonRubricImport(body.content, body.fileName);
    return Response.json(parsed);
  }

  const validated = validateRubricInput(body.rubric);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: validated.status });

  const created = await createDraftRubric(repository, {
    orgId: access.viewer.orgId,
    createdBy: access.viewer.id,
    sourceType: body.sourceType,
    rubric: validated.data,
  });

  return Response.json({ draft: created, issues: [] });
}
```

- [ ] **Step 4: Implement the publish route**

```ts
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";
import { publishRubric } from "@/lib/rubrics/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) return unauthorizedJson();

  const viewer = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!viewer?.ok || viewer.data.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  return fromServiceResult(
    await publishRubric(createRubricsRepository(), {
      orgId: viewer.data.orgId,
      rubricId: id,
      publishedBy: viewer.data.id,
    }),
  );
}
```

- [ ] **Step 5: Run the route tests to verify they pass**

Run: `npm run test:web -- routes.test.ts`

Expected: PASS with unauthorized, GET bootstrap, clone-history POST, and publish POST coverage green.

- [ ] **Step 6: Commit the routes**

```bash
git add apps/web/app/api/rubrics/route.ts apps/web/app/api/rubrics/[id]/publish/route.ts apps/web/lib/rubrics/routes.test.ts apps/web/lib/rubrics/service.ts
git commit -m "feat: add rubric settings api routes"
```

### Task 3: Rubrics Wizard Panel

**Files:**
- Create: `apps/web/lib/rubrics-panel.test.tsx`
- Create: `apps/web/components/settings/rubrics-panel.tsx`

- [ ] **Step 1: Write the failing panel tests**

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  RubricsPanel,
  createRubricDraftRequest,
  previewRubricImportRequest,
  publishRubricDraftRequest,
} from "../components/settings/rubrics-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const activeRubric = {
  id: "rubric-7",
  version: 7,
  name: "Revenue Scorecard",
  description: "Current live rubric",
  status: "active" as const,
  isActive: true,
  isTemplate: false,
  orgId: "org-1",
  createdBy: "user-1",
  createdAt: "2026-04-22T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
  categoryCount: 1,
  categories: [],
};

describe("RubricsPanel", () => {
  it("renders the wizard and history affordances", () => {
    const html = renderToStaticMarkup(
      createElement(RubricsPanel, {
        activeRubric,
        history: [activeRubric],
      }),
    );

    expect(html).toContain("Choose Source");
    expect(html).toContain("New Draft from Active");
    expect(html).toContain("Start from Default Template");
    expect(html).toContain("Clone Historical Version");
    expect(html).toContain("Import CSV");
    expect(html).toContain("Import JSON");
    expect(html).toContain("Version History");
  });

  it("posts draft creation requests to the rubrics API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ draft: { id: "rubric-8" }, issues: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      createRubricDraftRequest(fetchMock as typeof fetch, {
        mode: "manual",
        sourceType: "manual",
        rubric: {
          name: "Revenue Scorecard v8",
          description: null,
          categories: [],
        },
      }),
    ).resolves.toEqual({
      ok: true,
      data: { draft: { id: "rubric-8" }, issues: [] },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "manual",
        sourceType: "manual",
        rubric: {
          name: "Revenue Scorecard v8",
          description: null,
          categories: [],
        },
      }),
    });
  });

  it("posts import preview requests to the rubrics API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rubric: { name: "rubric" }, issues: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      previewRubricImportRequest(fetchMock as typeof fetch, {
        mode: "import_csv",
        preview: true,
        sourceType: "csv_import",
        fileName: "rubric.csv",
        content: "name,slug,description,weight,excellent,proficient,developing,lookFor",
      }),
    ).resolves.toEqual({
      ok: true,
      data: { rubric: { name: "rubric" }, issues: [] },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "import_csv",
        preview: true,
        sourceType: "csv_import",
        fileName: "rubric.csv",
        content: "name,slug,description,weight,excellent,proficient,developing,lookFor",
      }),
    });
  });

  it("posts publish requests to the publish endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "rubric-8", isActive: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      publishRubricDraftRequest(fetchMock as typeof fetch, "rubric-8"),
    ).resolves.toEqual({
      ok: true,
      data: { id: "rubric-8", isActive: true },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics/rubric-8/publish", {
      method: "POST",
    });
  });
});
```

- [ ] **Step 2: Run the panel tests to verify they fail**

Run: `npm run test:web -- rubrics-panel.test.tsx`

Expected: FAIL with module-not-found for `../components/settings/rubrics-panel`.

- [ ] **Step 3: Implement the request helpers and the wizard shell**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_SCORING_CATEGORIES } from "@/lib/calls/rubric";
import type {
  CreateRubricDraftRequest,
  PreviewRubricImportRequest,
  RubricCategoryInput,
  RubricImportIssue,
  RubricInput,
  RubricSummary,
  RubricWithCategories,
} from "@/lib/rubrics/types";

type RubricsPanelProps = {
  activeRubric: RubricWithCategories | null;
  history: RubricSummary[];
};

type DraftResponse = {
  draft: RubricWithCategories;
  issues: RubricImportIssue[];
};

function createTemplateDraft(): RubricInput {
  return {
    name: "Revenue Scorecard",
    description: null,
    categories: CALL_SCORING_CATEGORIES.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      weight: category.weight,
      scoringCriteria: category.scoringCriteria,
      sortOrder: index,
    })),
  };
}

function toDraftInput(rubric: RubricWithCategories): RubricInput {
  return {
    name: rubric.name,
    description: rubric.description,
    categories: rubric.categories.map(({ id: _id, rubricId: _rubricId, createdAt: _createdAt, ...category }) => category),
  };
}

export async function previewRubricImportRequest(fetchImpl: typeof fetch, payload: PreviewRubricImportRequest) {
  const response = await fetchImpl("/api/rubrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return response.ok ? { ok: true as const, data } : { ok: false as const, error: data.error ?? "Import preview failed" };
}

export async function createRubricDraftRequest(fetchImpl: typeof fetch, payload: CreateRubricDraftRequest) {
  const response = await fetchImpl("/api/rubrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return response.ok ? { ok: true as const, data } : { ok: false as const, error: data.error ?? "Draft creation failed" };
}

export async function publishRubricDraftRequest(fetchImpl: typeof fetch, rubricId: string) {
  const response = await fetchImpl(`/api/rubrics/${rubricId}/publish`, { method: "POST" });
  const data = await response.json();
  return response.ok ? { ok: true as const, data } : { ok: false as const, error: data.error ?? "Publish failed" };
}

export function RubricsPanel({ activeRubric, history }: RubricsPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<"source" | "edit" | "review" | "publish">("source");
  const [selectedSource, setSelectedSource] = useState<
    "clone_active" | "clone_history" | "clone_template" | "import_csv" | "import_json"
  >(
    activeRubric ? "clone_active" : "clone_template",
  );
  const [draftInput, setDraftInput] = useState<RubricInput | null>(null);
  const [draftRecord, setDraftRecord] = useState<RubricWithCategories | null>(null);
  const [issues, setIssues] = useState<RubricImportIssue[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const activeSummary = useMemo(
    () => activeRubric ? `v${activeRubric.version} · ${activeRubric.categoryCount} categories` : "No active rubric yet",
    [activeRubric],
  );

  async function handleChooseSource() {
    if (selectedSource === "clone_active" && activeRubric) {
      setDraftInput(toDraftInput(activeRubric));
      setIssues([]);
      setStep("edit");
      return;
    }

    if (selectedSource === "clone_template") {
      setDraftInput(createTemplateDraft());
      setIssues([]);
      setStep("edit");
      return;
    }

    if (selectedSource === "clone_history" && selectedHistoryId) {
      const response = await fetch(`/api/rubrics?rubricId=${selectedHistoryId}`);
      const data = await response.json();
      if (!response.ok || !data.selectedRubric) return;
      setDraftInput(toDraftInput(data.selectedRubric));
      setIssues([]);
      setStep("edit");
      return;
    }
  }

  async function handlePreviewImport(fileName: string, content: string) {
    const result = await previewRubricImportRequest(fetch, {
      mode: selectedSource,
      preview: true,
      sourceType: selectedSource === "import_csv" ? "csv_import" : "json_import",
      fileName,
      content,
    } as PreviewRubricImportRequest);

    if (!result.ok) return;

    setDraftInput(result.data.rubric);
    setIssues(result.data.issues);
    setStep(result.data.issues.length > 0 ? "review" : "edit");
  }

  async function handlePreparePublish() {
    if (!draftInput) return;

    const result = await createRubricDraftRequest(fetch, {
      mode: "manual",
      sourceType: selectedSource === "import_csv" ? "csv_import" : selectedSource === "import_json" ? "json_import" : "manual",
      rubric: draftInput,
    });

    if (!result.ok) return;

    setDraftRecord(result.data.draft);
    setStep("publish");
  }

  async function handlePublish() {
    if (!draftRecord) return;
    const result = await publishRubricDraftRequest(fetch, draftRecord.id);
    if (!result.ok) return;
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Active Rubric</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{activeRubric?.name ?? "No active rubric"}</h2>
        <p className="mt-2 text-sm text-[#a9abb3]">{activeSummary}</p>
      </section>

      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Choose Source</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["clone_active", "clone_history", "clone_template", "import_csv", "import_json"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setSelectedSource(mode)}>
              {mode}
            </button>
          ))}
        </div>
        <button className="mt-5" type="button" onClick={() => void handleChooseSource()}>
          Continue
        </button>
      </section>

      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Version History</p>
        <ul className="mt-4 space-y-2">
          {history.map((entry) => (
            <li key={entry.id}>{entry.name} · v{entry.version}</li>
          ))}
        </ul>
      </section>

      {step === "review" && issues.length > 0 ? (
        <section>
          <h3>Review &amp; Fix</h3>
          {issues.map((issue) => <p key={`${issue.row}-${issue.field}`}>{issue.field}: {issue.message}</p>)}
          <button type="button" onClick={() => void handlePreparePublish()}>Continue to Publish</button>
        </section>
      ) : null}

      {step === "publish" && draftRecord ? (
        <section>
          <h3>Publish</h3>
          <p>Publishing affects future scoring only.</p>
          <button type="button" onClick={() => void handlePublish()}>Publish Draft</button>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the panel tests to verify they pass**

Run: `npm run test:web -- rubrics-panel.test.tsx`

Expected: PASS with render coverage and request helper coverage green.

- [ ] **Step 5: Commit the panel**

```bash
git add apps/web/components/settings/rubrics-panel.tsx apps/web/lib/rubrics-panel.test.tsx
git commit -m "feat: add rubric settings wizard panel"
```

### Task 4: Settings Route and Route-Surface Regression Coverage

**Files:**
- Create: `apps/web/app/(authenticated)/settings/rubric/page.tsx`
- Create: `apps/web/lib/rubrics-page.test.tsx`
- Create: `apps/web/lib/settings-nav.test.tsx`

- [ ] **Step 1: Write the failing page and nav regression tests**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SettingsRubricPage from "../app/(authenticated)/settings/rubric/page";
import { SettingsNav } from "../components/settings/settings-nav";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/settings/rubric",
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser: vi.fn().mockResolvedValue({ id: "auth-user-1" }),
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      id: "user-1",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      role: "admin",
      orgId: "org-1",
      displayNameSet: true,
      org: {
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    },
  }),
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric: vi.fn().mockResolvedValue({ ok: false, status: 404, error: "Active rubric not found" }),
  loadRubricHistory: vi.fn().mockResolvedValue([]),
}));

describe("SettingsRubricPage", () => {
  it("renders the Rubrics settings route", async () => {
    const html = renderToStaticMarkup(await SettingsRubricPage());
    expect(html).toContain("Rubrics");
    expect(html).toContain("Choose Source");
    expect(html).toContain("Version History");
  });
});

describe("SettingsNav", () => {
  it("keeps the Rubrics settings link visible for admins", () => {
    const html = renderToStaticMarkup(<SettingsNav role="admin" />);
    expect(html).toContain('href="/settings/rubric"');
  });
});
```

- [ ] **Step 2: Run the page and nav tests to verify they fail**

Run: `npm run test:web -- rubrics-page.test.tsx settings-nav.test.tsx`

Expected: FAIL with module-not-found for `app/(authenticated)/settings/rubric/page.tsx`.

- [ ] **Step 3: Implement the server page**

```tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { RubricsPanel } from "@/components/settings/rubrics-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric, loadRubricHistory } from "@/lib/rubrics/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsRubricPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const viewer = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!viewer?.ok) redirect("/settings");
  if (viewer.data.role !== "admin") redirect("/settings");

  const repository = createRubricsRepository();
  const [activeResult, history] = await Promise.all([
    getActiveRubric(repository, viewer.data.orgId),
    loadRubricHistory(repository, viewer.data.orgId),
  ]);

  return (
    <PageFrame
      description="Create, import, review, and publish immutable rubric versions for future call scoring."
      headerMode="hidden"
      eyebrow="Settings"
      title="Rubrics"
    >
      <RubricsPanel
        activeRubric={activeResult.ok ? activeResult.data : null}
        history={history}
      />
    </PageFrame>
  );
}
```

- [ ] **Step 4: Run the page/nav tests to verify they pass**

Run: `npm run test:web -- rubrics-page.test.tsx settings-nav.test.tsx`

Expected: PASS with the server route rendering and admin nav link coverage green.

- [ ] **Step 5: Run the full targeted Rubrics verification set**

Run: `npm run test:web -- import.test.ts service.test.ts routes.test.ts rubrics-panel.test.tsx rubrics-page.test.tsx settings-nav.test.tsx`

Expected: PASS with all new rubric-focused tests green.

- [ ] **Step 6: Run the web typecheck**

Run: `npm run typecheck:web`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit the route/page surface**

```bash
git add apps/web/app/(authenticated)/settings/rubric/page.tsx apps/web/lib/rubrics-page.test.tsx apps/web/lib/settings-nav.test.tsx
git commit -m "feat: add rubrics settings page"
```

## Self-Review

### Spec coverage

- Immutable versioning: covered in Task 1 service tests and Task 2 publish route.
- Draft does not become active until publish: covered in Task 1 and publish flow in Tasks 2-4.
- Default clone-from-active flow: covered in Task 3 panel state.
- Clone-from-history: covered in Tasks 1-2 and surfaced in Task 3.
- CSV/JSON partial-success import: covered in Task 1 parser tests and Task 2 draft route.
- Admin-only page and API routes: covered in Tasks 2 and 4.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Every task has explicit files, code, commands, and expected results.

### Type consistency

- Shared request types are introduced in `types.ts` before route and panel steps use them.
- `findRubricById` is added to the repository before service and route tasks depend on it.
- Route path names are consistent: `/api/rubrics` and `/api/rubrics/[id]/publish`.
