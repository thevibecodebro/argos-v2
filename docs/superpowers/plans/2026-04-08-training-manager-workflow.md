# Training Manager Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore manager training authoring, AI curriculum generation, assignment management, and richer team progress in the current `/training` experience.

**Architecture:** Extend the existing training service and repository layers first, then expose the new capabilities through Next route handlers, and finally restore the manager UI inside the current `TrainingPanel`. The work stays within the current access-control model and uses the existing `training_modules` and `training_progress` tables rather than adding new schema.

**Tech Stack:** Next.js 15 route handlers, React 19 client components, TypeScript, Vitest, Drizzle/Supabase repository abstractions, existing access service, OpenAI server integration patterns already used in the repo.

---

## File Structure

### Existing files to modify

- `apps/web/lib/training/service.ts`
  Responsibility: training orchestration, access checks, AI availability/generation helpers, assignment rules.
- `apps/web/lib/training/service.test.ts`
  Responsibility: service-layer permission and workflow tests.
- `apps/web/lib/training/repository.ts`
  Responsibility: Drizzle repository implementation and expanded interface support.
- `apps/web/lib/training/supabase-repository.ts`
  Responsibility: Supabase fallback implementation matching the repository contract.
- `apps/web/app/api/training/modules/route.ts`
  Responsibility: list modules and create modules.
- `apps/web/app/api/training/modules/[id]/route.ts`
  Responsibility: get module detail and patch module content.
- `apps/web/app/api/training/team-progress/route.ts`
  Responsibility: team progress retrieval for richer manager progress payloads.
- `apps/web/components/training-panel.tsx`
  Responsibility: learner flow plus restored manager controls and modals.
- `apps/web/package.json`
  Responsibility: test/typecheck commands only if a new helper script becomes necessary. Avoid touching unless required.

### New files to create

- `apps/web/app/api/training/ai-status/route.ts`
  Responsibility: expose AI availability.
- `apps/web/app/api/training/modules/generate/route.ts`
  Responsibility: generate draft training modules through the service layer.
- `apps/web/app/api/training/modules/[id]/assign/route.ts`
  Responsibility: assign a module to multiple reps.
- `apps/web/app/api/training/modules/[id]/assign/[repId]/route.ts`
  Responsibility: unassign a module from a single rep if status is still `assigned`.
- `apps/web/lib/training/routes.test.ts`
  Responsibility: route-level request validation and response-shape tests for the new training endpoints.
- `apps/web/lib/training-panel.test.tsx`
  Responsibility: UI-level checks for manager-only controls and disabled AI state.

### Notes on boundaries

- Keep access decisions in `service.ts`, not in route handlers or the component.
- Keep repository methods narrow and persistence-focused.
- Do not split `training-panel.tsx` unless the file becomes materially unmaintainable during implementation.

---

### Task 1: Expand The Training Service Contract With Failing Tests

**Files:**
- Modify: `apps/web/lib/training/service.test.ts`
- Modify: `apps/web/lib/training/service.ts`

- [ ] **Step 1: Write the failing service tests for manager workflows**

Add tests for:
- manager create allowed with `manage_team_training`
- rep create denied
- manager update allowed
- AI unavailable result when env is missing
- assignment scoped to accessible reps
- unassign blocked after progress starts

Use test shapes like:

```ts
it("allows a manager with manage_team_training to create a module", async () => {
  mockAccessRepository({
    actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
    memberships: [
      { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
      { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ],
    grants: [
      { orgId: "org-1", teamId: "team-a", userId: "mgr-1", permissionKey: "manage_team_training" },
    ],
  });

  const repository = createRepository({
    countModulesByOrgId: vi.fn().mockResolvedValue(3),
    createModule: vi.fn().mockResolvedValue({
      id: "module-4",
      orgId: "org-1",
      title: "New Module",
      skillCategory: "Discovery",
      videoUrl: null,
      description: "Desc",
      quizData: null,
      orderIndex: 4,
      createdAt: new Date("2026-04-08T00:00:00.000Z"),
    }),
  });

  const result = await createTrainingModule(repository, "mgr-1", {
    title: "New Module",
    skillCategory: "Discovery",
    videoUrl: null,
    description: "Desc",
    quizData: null,
  });

  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run the service tests to verify the new cases fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
FAIL  lib/training/service.test.ts
ReferenceError or TypeScript/runtime failures because createTrainingModule/updateTrainingModule/assignTrainingModule/unassignTrainingModule/getTrainingAiStatus do not exist yet
```

- [ ] **Step 3: Add the new repository interface types and exported service signatures**

In `apps/web/lib/training/service.ts`, extend `TrainingRepository` and export the new service functions before implementing their logic.

Add signatures shaped like:

```ts
export async function createTrainingModule(
  repository: TrainingRepository,
  authUserId: string,
  input: {
    title: string;
    skillCategory: string;
    videoUrl: string | null;
    description: string | null;
    quizData: TrainingModuleRecord["quizData"];
  },
): Promise<ServiceResult<{ module: TrainingModuleSummary }>> {
  throw new Error("not implemented");
}
```

Add repository signatures shaped like:

```ts
createModule(input: {
  orgId: string;
  title: string;
  description: string | null;
  skillCategory: string;
  videoUrl: string | null;
  quizData: TrainingModuleRecord["quizData"];
  orderIndex: number;
}): Promise<TrainingModuleRecord>;
```

- [ ] **Step 4: Run the service tests again to verify they still fail for missing behavior, not missing symbols**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
FAIL  lib/training/service.test.ts
Tests fail on "not implemented" or incorrect return values, confirming the test harness is wired correctly
```

- [ ] **Step 5: Commit the red test scaffolding**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/lib/training/service.ts apps/web/lib/training/service.test.ts
git commit -m "test: scaffold training manager service coverage"
```

---

### Task 2: Implement Manager Service Logic To Make The Service Tests Pass

**Files:**
- Modify: `apps/web/lib/training/service.ts`
- Modify: `apps/web/lib/training/service.test.ts`

- [ ] **Step 1: Implement the minimal permission helpers for manager content actions**

Add focused helpers rather than spreading role checks:

```ts
function canManageTraining(access: AccessContext) {
  if (access.actor.role === "admin") {
    return true;
  }

  if (access.actor.role === "executive") {
    return true;
  }

  return getAccessibleRepIds(access, ["manage_team_training"]).size > 0;
}
```

Add helper for accessible rep IDs used by assignment:

```ts
function getManageableTrainingRepIds(access: AccessContext, orgRepIds: string[]) {
  if (access.actor.role === "admin" || access.actor.role === "executive") {
    return new Set(orgRepIds);
  }

  return getAccessibleRepIds(access, ["manage_team_training"]);
}
```

- [ ] **Step 2: Implement `createTrainingModule`, `updateTrainingModule`, and `getTrainingAiStatus`**

Minimal implementation shape:

```ts
export async function createTrainingModule(repository, authUserId, input) {
  const accessResult = await getAccessContext(authUserId);
  if (!accessResult.ok) return accessResult;

  const access = accessResult.data;
  if (!access.actor.orgId || !canManageTraining(access)) {
    return { ok: false, status: 403, error: "You do not have permission to manage training" };
  }

  const orderIndex = (await repository.countModulesByOrgId(access.actor.orgId)) + 1;
  const module = await repository.createModule({
    orgId: access.actor.orgId,
    title: input.title,
    description: input.description,
    skillCategory: input.skillCategory,
    videoUrl: input.videoUrl,
    quizData: input.quizData,
    orderIndex,
  });

  return { ok: true, data: { module: serializeModule(module, null) } };
}
```

For AI status:

```ts
export async function getTrainingAiStatus() {
  return {
    ok: true as const,
    data: {
      available: Boolean(process.env.OPENAI_API_KEY),
    },
  };
}
```

If the app uses a different env var for server-side OpenAI elsewhere, align this helper with that existing pattern instead of inventing a new one.

- [ ] **Step 3: Implement generation, assignment, and unassignment logic**

Generation shape:

```ts
export async function generateTrainingModules(authUserId, input) {
  const accessResult = await getAccessContext(authUserId);
  if (!accessResult.ok) return accessResult;

  if (!canManageTraining(accessResult.data)) {
    return { ok: false, status: 403, error: "You do not have permission to manage training" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, status: 422, error: "AI curriculum generation is unavailable until OpenAI is configured" };
  }

  // Call OpenAI and normalize response
}
```

Assignment shape:

```ts
export async function assignTrainingModule(repository, authUserId, moduleId, input) {
  const accessResult = await getAccessContext(authUserId);
  if (!accessResult.ok) return accessResult;

  const access = accessResult.data;
  if (!access.actor.orgId || !canManageTraining(access)) {
    return { ok: false, status: 403, error: "You do not have permission to manage training" };
  }

  const orgRepIds = await repository.findRepIdsByOrgId(access.actor.orgId);
  const allowedRepIds = getManageableTrainingRepIds(access, orgRepIds);
  const repIds = input.repIds.filter((repId) => allowedRepIds.has(repId));

  if (repIds.length !== input.repIds.length) {
    return { ok: false, status: 403, error: "One or more reps are outside your training scope" };
  }

  await repository.assignModuleToReps({
    moduleId,
    repIds,
    assignedBy: access.actor.id,
    dueDate: input.dueDate ?? null,
  });

  return { ok: true, data: { assignedRepIds: repIds } };
}
```

Unassignment shape:

```ts
export async function unassignTrainingModule(repository, authUserId, moduleId, repId) {
  const accessResult = await getAccessContext(authUserId);
  if (!accessResult.ok) return accessResult;

  const removed = await repository.removeAssignedModule(repId, moduleId);
  if (!removed) {
    return {
      ok: false,
      status: 400,
      error: "This module can’t be unassigned because the rep has already started it",
    };
  }

  return { ok: true, data: { repId, moduleId } };
}
```

- [ ] **Step 4: Run the service tests and make them pass**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
PASS  lib/training/service.test.ts
```

- [ ] **Step 5: Commit the service implementation**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/lib/training/service.ts apps/web/lib/training/service.test.ts
git commit -m "feat: add training manager service workflows"
```

---

### Task 3: Implement Repository Support For Module Writes And Assignments

**Files:**
- Modify: `apps/web/lib/training/repository.ts`
- Modify: `apps/web/lib/training/supabase-repository.ts`
- Test: `apps/web/lib/training/service.test.ts`

- [ ] **Step 1: Add repository methods to the concrete implementations**

Drizzle implementation methods:

```ts
async createModule(input) {
  const [module] = await this.db
    .insert(trainingModulesTable)
    .values(input)
    .returning();

  return module;
}

async updateModule(input) {
  const [module] = await this.db
    .update(trainingModulesTable)
    .set(input.patch)
    .where(and(
      eq(trainingModulesTable.orgId, input.orgId),
      eq(trainingModulesTable.id, input.moduleId),
    ))
    .returning();

  return module ?? null;
}
```

Assignment semantics:

```ts
async removeAssignedModule(repId: string, moduleId: string) {
  const existing = await this.db
    .select({ id: trainingProgressTable.id, status: trainingProgressTable.status })
    .from(trainingProgressTable)
    .where(and(
      eq(trainingProgressTable.repId, repId),
      eq(trainingProgressTable.moduleId, moduleId),
    ))
    .limit(1);

  if (!existing[0] || existing[0].status !== "assigned") {
    return false;
  }

  await this.db
    .delete(trainingProgressTable)
    .where(eq(trainingProgressTable.id, existing[0].id));

  return true;
}
```

- [ ] **Step 2: Mirror the same methods in the Supabase repository**

Keep shapes aligned with the Drizzle repository:

```ts
async createModule(input) {
  const { data, error } = await supabase
    .from("training_modules")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return mapTrainingModuleRecord(data);
}
```

```ts
async assignModuleToReps(input) {
  for (const repId of input.repIds) {
    const { data: existing } = await supabase
      .from("training_progress")
      .select("id")
      .eq("rep_id", repId)
      .eq("module_id", input.moduleId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("training_progress").insert({
        rep_id: repId,
        module_id: input.moduleId,
        status: "assigned",
        assigned_by: input.assignedBy,
        assigned_at: new Date().toISOString(),
        due_date: input.dueDate,
      });
    }
  }
}
```

- [ ] **Step 3: Run the service tests again as regression protection**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
PASS  lib/training/service.test.ts
```

- [ ] **Step 4: Commit the repository work**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/lib/training/repository.ts apps/web/lib/training/supabase-repository.ts
git commit -m "feat: add training repository write operations"
```

---

### Task 4: Add Route Tests For The New Training Endpoints

**Files:**
- Create: `apps/web/lib/training/routes.test.ts`
- Modify: `apps/web/app/api/training/modules/route.ts`
- Modify: `apps/web/app/api/training/modules/[id]/route.ts`
- Create: `apps/web/app/api/training/ai-status/route.ts`
- Create: `apps/web/app/api/training/modules/generate/route.ts`
- Create: `apps/web/app/api/training/modules/[id]/assign/route.ts`
- Create: `apps/web/app/api/training/modules/[id]/assign/[repId]/route.ts`

- [ ] **Step 1: Write failing route tests before route implementation**

Cover:
- unauthorized access returns `401`
- `POST /api/training/modules` validates body
- `PATCH /api/training/modules/[id]` validates body
- AI status returns `{ available }`
- generate route returns `422` when unavailable
- assign route rejects invalid `repIds`
- delete assign route calls unassign service with the path params

Use a pattern like:

```ts
vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/training/service", () => ({
  createTrainingModule: vi.fn(),
  getTrainingAiStatus: vi.fn(),
  generateTrainingModules: vi.fn(),
  assignTrainingModule: vi.fn(),
  unassignTrainingModule: vi.fn(),
}));
```

- [ ] **Step 2: Run the new route test file and verify it fails**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/routes.test.ts
```

Expected:

```text
FAIL  lib/training/routes.test.ts
Missing route modules or unsupported HTTP methods
```

- [ ] **Step 3: Implement the route handlers with minimal validation**

`apps/web/app/api/training/modules/route.ts`:

```ts
export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) return unauthorizedJson();

  const body = await request.json();
  if (typeof body.title !== "string" || typeof body.skillCategory !== "string") {
    return Response.json({ error: "title and skillCategory are required" }, { status: 400 });
  }

  return fromServiceResult(await createTrainingModule(createTrainingRepository(), authUser.id, {
    title: body.title.trim(),
    skillCategory: body.skillCategory.trim(),
    videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
    description: typeof body.description === "string" ? body.description : null,
    quizData: body.quizData ?? null,
  }));
}
```

Create the additional routes with the same pattern: auth gate, lightweight payload validation, delegate to the training service, return `fromServiceResult`.

- [ ] **Step 4: Run the route tests until green**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/routes.test.ts
```

Expected:

```text
PASS  lib/training/routes.test.ts
```

- [ ] **Step 5: Commit the route layer**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/app/api/training apps/web/lib/training/routes.test.ts
git commit -m "feat: add training manager api routes"
```

---

### Task 5: Restore The Manager UI In TrainingPanel With Failing UI Tests First

**Files:**
- Create: `apps/web/lib/training-panel.test.tsx`
- Modify: `apps/web/components/training-panel.tsx`

- [ ] **Step 1: Write failing UI tests for manager-only controls and disabled AI state**

Add tests for:
- reps do not see `Create module`
- managers do see `Create module`
- managers see `Generate with AI`
- AI button is disabled when unavailable

Test shape:

```tsx
it("shows a disabled AI action when AI generation is unavailable", () => {
  render(
    <TrainingPanel
      canManage
      aiAvailable={false}
      initialModules={[]}
      initialTeamRows={[]}
      initialTeamProgress={{ modules: [], repProgress: [] }}
    />
  );

  expect(screen.getByRole("button", { name: /generate with ai/i })).toBeDisabled();
  expect(screen.getByText(/unavailable until openai is configured/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI test file to verify it fails**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
TrainingPanel props or UI controls do not exist yet
```

- [ ] **Step 3: Extend `TrainingPanel` props and render the manager toolbar**

Add the new props at the top of the component:

```ts
type TrainingPanelProps = {
  canManage: boolean;
  aiAvailable: boolean;
  initialModules: TrainingModuleSummary[];
  initialTeamRows: TrainingTeamProgress[];
  initialTeamProgress: {
    modules: Array<{ id: string; title: string }>;
    repProgress: Array<{
      repId: string;
      firstName: string | null;
      lastName: string | null;
      moduleProgress: Array<{
        moduleId: string;
        moduleTitle: string;
        status: string;
        score: number | null;
        attempts: number;
      }>;
    }>;
  };
};
```

Render the toolbar minimally first:

```tsx
{canManage ? (
  <div className="mb-4 flex flex-wrap gap-3">
    <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#10131a]">
      Create module
    </button>
    <button
      type="button"
      disabled={!aiAvailable}
      className="rounded-xl border border-[#45484f]/20 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      Generate with AI
    </button>
    {!aiAvailable ? (
      <p className="basis-full text-xs text-[#a9abb3]">
        AI curriculum generation is unavailable until OpenAI is configured.
      </p>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 4: Add the create/edit/assign modal state and richer team progress rendering**

Follow the current component style and keep the fetch calls local:

```ts
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null);
const [isAiModalOpen, setIsAiModalOpen] = useState(false);
```

For manager progress, replace the aggregate list with a table-like rendering:

```tsx
{canManage ? (
  <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team Progress</p>
    {initialTeamProgress.modules.length ? (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-[#ecedf6]">
          <thead>...</thead>
          <tbody>...</tbody>
        </table>
      </div>
    ) : (
      <div className="mt-4 rounded-xl border border-dashed border-[#45484f]/20 px-4 py-6 text-sm text-[#a9abb3]">
        Create or generate modules to start tracking team progress.
      </div>
    )}
  </section>
) : null}
```

- [ ] **Step 5: Run the UI tests until green**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
PASS  lib/training-panel.test.tsx
```

- [ ] **Step 6: Commit the UI shell restore**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/components/training-panel.tsx apps/web/lib/training-panel.test.tsx
git commit -m "feat: restore training manager panel controls"
```

---

### Task 6: Wire Server Data Into The Training Page And Finish The Manager Modals

**Files:**
- Modify: `apps/web/app/(authenticated)/training/page.tsx`
- Modify: `apps/web/components/training-panel.tsx`
- Test: `apps/web/lib/training-panel.test.tsx`

- [ ] **Step 1: Add page-level data loading for AI status and richer team progress**

Update the page loader to fetch all manager data in parallel:

```ts
const [modulesResult, teamProgressResult, aiStatusResult] = await Promise.all([
  getTrainingModules(repository, authUser.id),
  getTrainingTeamProgress(repository, authUser.id),
  getTrainingAiStatus(),
]);
```

Pass props to the panel:

```tsx
<TrainingPanel
  canManage={modulesResult.data.canManage}
  aiAvailable={aiStatusResult.ok ? aiStatusResult.data.available : false}
  initialModules={modulesResult.data.modules}
  initialTeamRows={teamProgressResult.ok ? teamProgressResult.data.rows : []}
  initialTeamProgress={teamProgressResult.ok ? teamProgressResult.data.progress : { modules: [], repProgress: [] }}
/>
```

If the existing `getTrainingTeamProgress` return shape only exposes aggregate rows, expand it here first in the service and tests rather than reshaping in the page component.

- [ ] **Step 2: Implement the create/edit/generate/assign modal fetch flows**

Use local handlers consistent with the existing progress submit pattern:

```ts
const response = await fetch("/api/training/modules", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

```ts
const response = await fetch("/api/training/modules/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    topic,
    targetRole,
    moduleCount,
    skillFocus,
  }),
});
```

Keep draft generation client-side until the manager explicitly saves reviewed modules.

- [ ] **Step 3: Run the focused service, route, and UI tests together**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts lib/training/routes.test.ts lib/training-panel.test.tsx
```

Expected:

```text
PASS  lib/training/service.test.ts
PASS  lib/training/routes.test.ts
PASS  lib/training-panel.test.tsx
```

- [ ] **Step 4: Run a full web test sweep and typecheck**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm run typecheck
```

Expected:

```text
All Vitest suites pass
TypeScript exits with code 0
```

- [ ] **Step 5: Commit the end-to-end feature wiring**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/app/(authenticated)/training/page.tsx apps/web/components/training-panel.tsx apps/web/lib/training/service.ts apps/web/lib/training/repository.ts apps/web/lib/training/supabase-repository.ts apps/web/app/api/training apps/web/lib/training/routes.test.ts apps/web/lib/training-panel.test.tsx
git commit -m "feat: restore training manager workflow"
```

---

## Self-Review

### Spec coverage

- Manager create/edit flow: covered by Tasks 1, 2, 4, 5, and 6.
- AI availability and disabled UI state: covered by Tasks 2, 4, 5, and 6.
- Assignment and unassignment rules: covered by Tasks 1, 2, 3, 4, and 6.
- Richer manager team progress: covered by Tasks 5 and 6.
- Route and validation coverage: covered by Task 4.
- Final verification: covered by Task 6.

No gaps remain relative to the approved spec.

### Placeholder scan

- No `TODO`, `TBD`, or deferred placeholders remain.
- Each task includes concrete file paths, code direction, commands, and expected outcomes.

### Type consistency

- `aiAvailable` is used consistently as a boolean page-to-panel prop.
- The plan consistently treats assignment removal as valid only for `status === "assigned"`.
- Service method names are consistent across tests, routes, and UI wiring.
