# Training Section Curriculum Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the authenticated `/training` page into an Argos-native curriculum studio with a module-led stage, rep-only learner flow, and a balanced manager planning deck.

**Architecture:** Keep the existing `/training` route and `TrainingPanel` controller, but split the current monolith into focused Training UI primitives: stage, curriculum map, manager status band, manager command deck, and loading shell. Extend the existing team-progress payload to expose `dueDate` and `assignedAt` in the per-module manager shell so the stage can show assignment coverage and due-soon context without adding new persistence work.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript, Tailwind v4 utilities already used in the repo, Vitest server-render tests, existing training service/repository layer.

---

## File Structure

### Existing files to modify

- `apps/web/lib/training/service.ts`
  Responsibility: expose `dueDate` and `assignedAt` in `TrainingRepModuleProgress` for manager-stage metrics.
- `apps/web/lib/training/service.test.ts`
  Responsibility: lock the expanded team-progress shell shape before UI work starts.
- `apps/web/components/training-panel.tsx`
  Responsibility: remain the client-side controller for selection, stage subview, manager panel state, submit flows, and shell composition.
- `apps/web/components/training/training-course-shell.tsx`
  Responsibility: become the Stage + Command Deck layout wrapper instead of the current rail-plus-content shell.
- `apps/web/components/training/training-manager-ai-tools.tsx`
  Responsibility: fit the new manager command deck tone and compact action layout.
- `apps/web/components/training/training-quiz-editor.tsx`
  Responsibility: fit the quieter inline command-surface treatment used by create/edit flows.
- `apps/web/lib/training-panel.test.tsx`
  Responsibility: static markup and helper tests for rep shell, manager shell, empty states, and command deck.
- `apps/web/app/(authenticated)/training/page.tsx`
  Responsibility: keep `PageFrame`, update Training description copy if needed, and import the loading shell through the route segment.

### New files to create

- `apps/web/components/training/training-stage-state.ts`
  Responsibility: pure helper logic for module subview resolution and primary CTA labels.
- `apps/web/components/training/training-module-stage.tsx`
  Responsibility: module-led editorial stage for lesson and quiz subviews.
- `apps/web/components/training/training-module-toc.tsx`
  Responsibility: curriculum map / table-of-contents rail for module selection and rep progress context.
- `apps/web/components/training/training-manager-stage-metrics.ts`
  Responsibility: pure helper logic for assignment coverage, completion rate, and due-soon counts.
- `apps/web/components/training/training-manager-status-band.tsx`
  Responsibility: compact manager pulse band rendered inside the stage.
- `apps/web/components/training/training-manager-command-deck.tsx`
  Responsibility: manager-only planning deck, action buttons, summary cards, and inline panel host.
- `apps/web/components/training/training-loading-shell.tsx`
  Responsibility: skeleton shell that mirrors stage, curriculum map, and command deck.
- `apps/web/app/(authenticated)/training/loading.tsx`
  Responsibility: route-level loading UI that returns `TrainingLoadingShell`.

### Existing files to delete

- `apps/web/components/training/training-workspace-nav.tsx`
  Responsibility removed: the spec replaces page-level workspace modes with module-local subviews and contextual manager surfaces.

### Notes on boundaries

- `training-panel.tsx` stays the orchestrator, but visual sections move into the new `training/*` files so the controller stops mixing UI composition with every view detail.
- Do not add new UI libraries. Use the current shell tokens and Material Symbols already present in the app.
- Keep manager forms inline to the command deck. Do not reintroduce page-level tabs or a second internal navigation system.

---

### Task 1: Extend Team Progress Payload For Manager Stage Metrics

**Files:**
- Modify: `apps/web/lib/training/service.test.ts`
- Modify: `apps/web/lib/training/service.ts`

- [ ] **Step 1: Write the failing service test for due-date metadata in manager progress**

Add a case to `apps/web/lib/training/service.test.ts` under `describe("getTrainingTeamProgress", ...)` that proves the service returns `dueDate` and `assignedAt` on each `moduleProgress` row:

```ts
it("includes dueDate and assignedAt in rep module progress for manager shells", async () => {
  mockAccessRepository({
    actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
    memberships: [
      { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
      { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ],
    grants: [
      { orgId: "org-1", teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_training" },
    ],
  });

  const repository = createRepository({
    countModulesByOrgId: vi.fn().mockResolvedValue(1),
    findModulesByOrgId: vi.fn().mockResolvedValue([
      {
        id: "module-1",
        orgId: "org-1",
        title: "Discovery",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Desc",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-21T00:00:00.000Z"),
      },
    ]),
    findProgressByModuleId: vi.fn().mockResolvedValue([
      {
        id: "progress-1",
        repId: "rep-1",
        moduleId: "module-1",
        status: "assigned",
        score: null,
        attempts: 0,
        completedAt: null,
        assignedBy: "mgr-1",
        assignedAt: new Date("2026-04-21T12:00:00.000Z"),
        dueDate: new Date("2026-04-24T12:00:00.000Z"),
      },
    ]),
    findTeamProgressByOrgId: vi.fn().mockResolvedValue([
      {
        repId: "rep-1",
        firstName: "Riley",
        lastName: "Stone",
        email: "riley@example.com",
        assigned: 1,
        passed: 0,
        completionRate: 0,
      },
    ]),
  });

  const result = await getTrainingTeamProgress(repository, "mgr-1");

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected manager progress payload");
  expect(result.data.progress.repProgress).toEqual([
    {
      repId: "rep-1",
      firstName: "Riley",
      lastName: "Stone",
      moduleProgress: [
        {
          moduleId: "module-1",
          moduleTitle: "Discovery",
          status: "assigned",
          score: null,
          attempts: 0,
          assignedAt: "2026-04-21T12:00:00.000Z",
          dueDate: "2026-04-24T12:00:00.000Z",
        },
      ],
    },
  ]);
});
```

- [ ] **Step 2: Run the service tests to verify the new case fails**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
FAIL  lib/training/service.test.ts
Expected object to contain dueDate and assignedAt, but those keys are missing from moduleProgress
```

- [ ] **Step 3: Implement the expanded `TrainingRepModuleProgress` shape**

Update `apps/web/lib/training/service.ts` so the team-progress shell includes the missing scheduling metadata:

```ts
export type TrainingRepModuleProgress = {
  moduleId: string;
  moduleTitle: string;
  status: string;
  score: number | null;
  attempts: number;
  assignedAt: string | null;
  dueDate: string | null;
};
```

Inside `getTrainingTeamProgress`, expand the module-progress serializer:

```ts
return [
  {
    moduleId: module.id,
    moduleTitle: module.title ?? "",
    status: entry.status,
    score: entry.score,
    attempts: entry.attempts,
    assignedAt: entry.assignedAt?.toISOString() ?? null,
    dueDate: entry.dueDate?.toISOString() ?? null,
  },
];
```

- [ ] **Step 4: Run the service tests to verify the payload now passes**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
```

Expected:

```text
✓ lib/training/service.test.ts
```

- [ ] **Step 5: Commit the team-progress payload change**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/lib/training/service.ts apps/web/lib/training/service.test.ts
git commit -m "feat: expose training schedule metadata in team progress"
```

---

### Task 2: Replace Workspace Modes With A Rep-Focused Stage And Curriculum Map

**Files:**
- Create: `apps/web/components/training/training-stage-state.ts`
- Create: `apps/web/components/training/training-module-stage.tsx`
- Create: `apps/web/components/training/training-module-toc.tsx`
- Modify: `apps/web/components/training-panel.tsx`
- Modify: `apps/web/components/training/training-course-shell.tsx`
- Modify: `apps/web/lib/training-panel.test.tsx`
- Delete: `apps/web/components/training/training-workspace-nav.tsx`

- [ ] **Step 1: Write the failing learner-shell tests**

Replace the old workspace-nav expectations in `apps/web/lib/training-panel.test.tsx` with learner-shell expectations:

```ts
import {
  getTrainingStagePrimaryAction,
  resolveTrainingStageView,
} from "../components/training/training-stage-state";

it("keeps the lesson view active when a module has no quiz", () => {
  expect(resolveTrainingStageView("quiz", false)).toBe("lesson");
});

it("uses module-driven primary actions for reps", () => {
  expect(
    getTrainingStagePrimaryAction({
      canManage: false,
      stageView: "lesson",
      hasQuiz: true,
      progress: null,
    }),
  ).toEqual({ label: "Resume lesson", nextView: "lesson" });
});

it("renders the rep shell as a curriculum studio instead of workspace tabs", () => {
  const html = renderToStaticMarkup(
    <TrainingPanel
      aiAvailable={false}
      canManage={false}
      initialModules={baseModules}
      initialTeamProgress={initialTeamProgress}
      initialTeamRows={initialTeamRows}
      rubricCategories={[]}
    />,
  );

  expect(html).toContain("Curriculum map");
  expect(html).toContain("Lesson");
  expect(html).toContain("Quiz");
  expect(html).toContain("Resume lesson");
  expect(html).not.toContain("Course overview");
  expect(html).not.toContain("Quick switcher");
  expect(html).not.toContain("Training workspace quick switcher");
});
```

- [ ] **Step 2: Run the panel tests to verify the new shell cases fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Cannot find module '../components/training/training-stage-state'
```

- [ ] **Step 3: Implement the new stage-state helper, stage component, TOC component, and shell wiring**

Create `apps/web/components/training/training-stage-state.ts`:

```ts
import type { TrainingModuleSummary } from "@/lib/training/service";

export type TrainingStageView = "lesson" | "quiz";

export function resolveTrainingStageView(requested: TrainingStageView, hasQuiz: boolean) {
  return requested === "quiz" && !hasQuiz ? "lesson" : requested;
}

export function getTrainingStagePrimaryAction(input: {
  canManage: boolean;
  hasQuiz: boolean;
  progress: TrainingModuleSummary["progress"];
  stageView: TrainingStageView;
}) {
  if (input.canManage) {
    return { label: "Review module", nextView: input.stageView };
  }

  if (!input.hasQuiz) {
    return { label: "Resume lesson", nextView: "lesson" as const };
  }

  if (input.progress?.status === "passed" || input.progress?.status === "failed") {
    return { label: "Review answers", nextView: "quiz" as const };
  }

  if (input.progress?.status === "in_progress") {
    return { label: "Open quiz", nextView: "quiz" as const };
  }

  return { label: "Resume lesson", nextView: "lesson" as const };
}
```

Create `apps/web/components/training/training-module-stage.tsx`:

```tsx
"use client";

import type { TrainingModuleSummary } from "@/lib/training/service";
import type { TrainingStageView } from "./training-stage-state";

export function TrainingModuleStage({
  canManage,
  selectedModule,
  stageView,
  stageBand,
  statusMessage,
  onSelectView,
  primaryAction,
  primaryActionDisabled,
  onPrimaryAction,
  quizContent,
}: {
  canManage: boolean;
  selectedModule: TrainingModuleSummary | null;
  stageView: TrainingStageView;
  stageBand?: React.ReactNode;
  statusMessage?: string | null;
  onSelectView: (view: TrainingStageView) => void;
  primaryAction: string;
  primaryActionDisabled?: boolean;
  onPrimaryAction: () => void;
  quizContent: React.ReactNode;
}) {
  if (!selectedModule) {
    return (
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-sm text-[#a9abb3]">No module selected.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Current curriculum</p>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{selectedModule.title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[#a9abb3]">{selectedModule.description}</p>
          </div>
          <div className="rounded-full border border-[#45484f]/15 bg-[#161a21]/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a9abb3]">
            {selectedModule.skillCategory}
          </div>
        </div>

        {stageBand}

        <div className="inline-flex rounded-full border border-[#45484f]/15 bg-[#161a21]/70 p-1">
          <button className={stageView === "lesson" ? "rounded-full bg-[#74b1ff]/12 px-4 py-2 text-xs font-semibold text-[#74b1ff]" : "px-4 py-2 text-xs font-semibold text-[#a9abb3]"} onClick={() => onSelectView("lesson")} type="button">Lesson</button>
          {selectedModule.hasQuiz ? (
            <button className={stageView === "quiz" ? "rounded-full bg-[#74b1ff]/12 px-4 py-2 text-xs font-semibold text-[#74b1ff]" : "px-4 py-2 text-xs font-semibold text-[#a9abb3]"} onClick={() => onSelectView("quiz")} type="button">Quiz</button>
          ) : null}
        </div>

        <div className="rounded-[1.25rem] border border-[#45484f]/10 bg-[#161a21]/45 p-5">
          {stageView === "lesson" ? (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[#ecedf6]">{selectedModule.description}</p>
              <p className="text-xs text-[#a9abb3]">
                {canManage
                  ? "Managers review the lesson while planning assignments and edits from the command deck."
                  : "Work through the lesson, then open the quiz when you are ready."}
              </p>
            </div>
          ) : (
            quizContent
          )}
        </div>

        {statusMessage ? <div className="rounded-xl border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-3 text-sm text-[#ecedf6]">{statusMessage}</div> : null}

        <button className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50" disabled={primaryActionDisabled} onClick={onPrimaryAction} type="button">
          {primaryAction}
        </button>
      </div>
    </section>
  );
}
```

Create `apps/web/components/training/training-module-toc.tsx`:

```tsx
"use client";

import type { TrainingModuleSummary } from "@/lib/training/service";

export function TrainingModuleToc({
  modules,
  selectedModuleId,
  onSelectModule,
}: {
  modules: TrainingModuleSummary[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
      <div className="mt-4 space-y-2">
        {modules.map((module, index) => (
          <button
            className={module.id === selectedModuleId ? "w-full rounded-[1.15rem] border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-4 text-left" : "w-full rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 px-4 py-4 text-left transition hover:border-[#74b1ff]/25"}
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            type="button"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#74b1ff]">Module {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-white">{module.title}</p>
            <p className="mt-2 text-xs text-[#a9abb3]">{module.progress?.status ?? "assigned"}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
```

Update `apps/web/components/training/training-course-shell.tsx` to accept `stage`, `tableOfContents`, and `commandDeck` instead of the old manager-actions-plus-rail contract:

```tsx
export function TrainingCourseShell({
  commandDeck,
  stage,
  tableOfContents,
}: {
  commandDeck?: ReactNode;
  stage: ReactNode;
  tableOfContents: ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
      <main className="min-w-0">{stage}</main>
      <aside className="space-y-5">
        {tableOfContents}
        {commandDeck}
      </aside>
    </div>
  );
}
```

Update `apps/web/components/training-panel.tsx` to remove `activeSection` and `TrainingWorkspaceNav`, replace it with `stageView`, and wire the new components:

```ts
import { TrainingModuleStage } from "./training/training-module-stage";
import { TrainingModuleToc } from "./training/training-module-toc";
import {
  getTrainingStagePrimaryAction,
  resolveTrainingStageView,
  type TrainingStageView,
} from "./training/training-stage-state";

const [stageView, setStageView] = useState<TrainingStageView>("lesson");

function selectModule(moduleId: string) {
  setSelectedModuleId(moduleId);
  setAnswers({});
  setStatusMessage(null);
  setStageView("lesson");
}

const resolvedStageView = resolveTrainingStageView(stageView, selectedModule?.hasQuiz ?? false);
const primaryAction = getTrainingStagePrimaryAction({
  canManage,
  hasQuiz: selectedModule?.hasQuiz ?? false,
  progress: selectedModule?.progress ?? null,
  stageView: resolvedStageView,
});
```

Delete the old workspace nav file:

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git rm apps/web/components/training/training-workspace-nav.tsx
```

- [ ] **Step 4: Run the panel tests to verify the learner shell now passes**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
✓ lib/training-panel.test.tsx
```

- [ ] **Step 5: Commit the learner-shell refactor**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/components/training-panel.tsx \
  apps/web/components/training/training-course-shell.tsx \
  apps/web/components/training/training-module-stage.tsx \
  apps/web/components/training/training-module-toc.tsx \
  apps/web/components/training/training-stage-state.ts \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: reshape training into a curriculum studio shell"
```

---

### Task 3: Add The Manager Hybrid Stage Band And Command Deck

**Files:**
- Create: `apps/web/components/training/training-manager-stage-metrics.ts`
- Create: `apps/web/components/training/training-manager-status-band.tsx`
- Create: `apps/web/components/training/training-manager-command-deck.tsx`
- Modify: `apps/web/components/training-panel.tsx`
- Modify: `apps/web/components/training/training-manager-ai-tools.tsx`
- Modify: `apps/web/lib/training-panel.test.tsx`

- [ ] **Step 1: Write the failing manager-shell tests**

Extend `apps/web/lib/training-panel.test.tsx` with both pure metric coverage and static markup assertions:

```ts
import { getTrainingManagerStageMetrics } from "../components/training/training-manager-stage-metrics";

it("calculates assignment coverage and due-soon counts for the selected module", () => {
  expect(
    getTrainingManagerStageMetrics({
      now: new Date("2026-04-21T12:00:00.000Z"),
      selectedModuleId: "module-1",
      repProgress: [
        {
          repId: "rep-1",
          firstName: "Maya",
          lastName: "Chen",
          moduleProgress: [
            {
              moduleId: "module-1",
              moduleTitle: "Discovery",
              status: "assigned",
              score: null,
              attempts: 0,
              assignedAt: "2026-04-21T09:00:00.000Z",
              dueDate: "2026-04-23T09:00:00.000Z",
            },
          ],
        },
      ],
    }),
  ).toEqual({
    assignedCount: 1,
    completionRate: 0,
    dueSoonCount: 1,
  });
});

it("renders the manager shell with a status band and planning deck instead of section headings", () => {
  const html = renderToStaticMarkup(
    <TrainingPanel
      aiAvailable
      canManage
      initialModules={baseModules}
      initialTeamProgress={{
        modules: initialTeamProgress.modules,
        repProgress: [
          {
            ...initialTeamProgress.repProgress[0],
            moduleProgress: [
              {
                ...initialTeamProgress.repProgress[0]!.moduleProgress[0]!,
                assignedAt: "2026-04-21T09:00:00.000Z",
                dueDate: "2026-04-23T09:00:00.000Z",
              },
            ],
          },
        ],
      }}
      initialTeamRows={initialTeamRows}
      rubricCategories={[]}
    />,
  );

  expect(html).toContain("Assignment coverage");
  expect(html).toContain("Team pulse");
  expect(html).toContain("Create module");
  expect(html).toContain("Draft lesson content");
  expect(html).not.toContain("Assignments");
  expect(html).not.toContain("Team Progress");
  expect(html).not.toContain("AI tools");
});
```

- [ ] **Step 2: Run the panel tests to verify the manager-shell cases fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Cannot find module '../components/training/training-manager-stage-metrics'
```

- [ ] **Step 3: Implement manager metrics, stage band, and planning deck**

Create `apps/web/components/training/training-manager-stage-metrics.ts`:

```ts
import type { TrainingTeamProgressShell } from "@/lib/training/service";

export function getTrainingManagerStageMetrics({
  now = new Date(),
  selectedModuleId,
  repProgress,
}: {
  now?: Date;
  selectedModuleId: string | null;
  repProgress: TrainingTeamProgressShell["repProgress"];
}) {
  if (!selectedModuleId) {
    return { assignedCount: 0, completionRate: 0, dueSoonCount: 0 };
  }

  const entries = repProgress.flatMap((rep) =>
    rep.moduleProgress.filter((entry) => entry.moduleId === selectedModuleId),
  );

  const assignedCount = entries.length;
  const completedCount = entries.filter((entry) => entry.status === "passed").length;
  const dueSoonCount = entries.filter((entry) => {
    if (!entry.dueDate || entry.status === "passed") {
      return false;
    }
    const dueAt = new Date(entry.dueDate).getTime();
    const delta = dueAt - now.getTime();
    return delta >= 0 && delta <= 1000 * 60 * 60 * 24 * 3;
  }).length;

  return {
    assignedCount,
    completionRate: assignedCount === 0 ? 0 : Math.round((completedCount / assignedCount) * 100),
    dueSoonCount,
  };
}
```

Create `apps/web/components/training/training-manager-status-band.tsx`:

```tsx
"use client";

export function TrainingManagerStatusBand({
  assignedCount,
  completionRate,
  dueSoonCount,
}: {
  assignedCount: number;
  completionRate: number;
  dueSoonCount: number;
}) {
  return (
    <div className="grid gap-3 rounded-[1.25rem] border border-[#74b1ff]/12 bg-[#74b1ff]/6 p-4 sm:grid-cols-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Assignment coverage</p>
        <p className="mt-2 text-xl font-semibold text-white">{assignedCount}</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Completion rate</p>
        <p className="mt-2 text-xl font-semibold text-white">{completionRate}%</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Due soon</p>
        <p className="mt-2 text-xl font-semibold text-white">{dueSoonCount}</p>
      </div>
    </div>
  );
}
```

Create `apps/web/components/training/training-manager-command-deck.tsx`:

```tsx
"use client";

import type { TrainingModuleSummary, TrainingTeamProgressShell, TrainingTeamProgress } from "@/lib/training/service";

export function TrainingManagerCommandDeck({
  aiAvailable,
  expandedPanel,
  onOpenCreate,
  onOpenEdit,
  onOpenAssign,
  onOpenGenerate,
  selectedModule,
  teamRows,
  teamProgress,
}: {
  aiAvailable: boolean;
  expandedPanel?: React.ReactNode;
  onOpenCreate: () => void;
  onOpenEdit: () => void;
  onOpenAssign: () => void;
  onOpenGenerate: () => void;
  selectedModule: TrainingModuleSummary | null;
  teamRows: TrainingTeamProgress[];
  teamProgress: TrainingTeamProgressShell;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team pulse</p>
      <div className="mt-4 grid gap-3">
        <button className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10" onClick={onOpenCreate} type="button">Create module</button>
        <button className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10" disabled={!selectedModule} onClick={onOpenEdit} type="button">Edit selected module</button>
        <button className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10" disabled={!selectedModule} onClick={onOpenAssign} type="button">Assign selected module</button>
        <button className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-left text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50" disabled={!aiAvailable || !selectedModule} onClick={onOpenGenerate} type="button">Generate with AI</button>
      </div>
      <div className="mt-5 rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Quiet summary</p>
        <p className="mt-2 text-sm text-[#ecedf6]">{teamRows.length} reps in scope</p>
        <p className="mt-1 text-sm text-[#a9abb3]">{teamProgress.modules.length} modules in circulation</p>
      </div>
      {expandedPanel ? <div className="mt-5">{expandedPanel}</div> : null}
    </section>
  );
}
```

Update `apps/web/components/training/training-manager-ai-tools.tsx` so its eyebrow and tone fit the command deck:

```tsx
<section className="rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 p-4">
  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Draft lesson content</p>
```

Wire the new manager pieces into `apps/web/components/training-panel.tsx`:

```ts
import { getTrainingManagerStageMetrics } from "./training/training-manager-stage-metrics";
import { TrainingManagerStatusBand } from "./training/training-manager-status-band";
import { TrainingManagerCommandDeck } from "./training/training-manager-command-deck";

const metrics = getTrainingManagerStageMetrics({
  selectedModuleId,
  repProgress: teamProgress.repProgress,
});

const managerStageBand = canManage ? (
  <TrainingManagerStatusBand
    assignedCount={metrics.assignedCount}
    completionRate={metrics.completionRate}
    dueSoonCount={metrics.dueSoonCount}
  />
) : null;
```

- [ ] **Step 4: Run the panel tests to verify the manager shell now passes**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
✓ lib/training-panel.test.tsx
```

- [ ] **Step 5: Commit the manager shell work**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/components/training-panel.tsx \
  apps/web/components/training/training-manager-ai-tools.tsx \
  apps/web/components/training/training-manager-command-deck.tsx \
  apps/web/components/training/training-manager-stage-metrics.ts \
  apps/web/components/training/training-manager-status-band.tsx \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: add manager planning deck to training studio"
```

---

### Task 4: Move Manager Forms Inline And Add Empty, Loading, And Mobile Polish

**Files:**
- Create: `apps/web/components/training/training-loading-shell.tsx`
- Create: `apps/web/app/(authenticated)/training/loading.tsx`
- Modify: `apps/web/components/training-panel.tsx`
- Modify: `apps/web/components/training/training-quiz-editor.tsx`
- Modify: `apps/web/components/training/training-manager-ai-tools.tsx`
- Modify: `apps/web/app/(authenticated)/training/page.tsx`
- Modify: `apps/web/lib/training-panel.test.tsx`

- [ ] **Step 1: Write the failing empty-state and loading-shell tests**

Add these cases to `apps/web/lib/training-panel.test.tsx`:

```ts
import TrainingLoading from "../app/(authenticated)/training/loading";

it("renders the studio empty state for managers with no modules", () => {
  const html = renderToStaticMarkup(
    <TrainingPanel
      aiAvailable
      canManage
      initialModules={[]}
      initialTeamProgress={{ modules: [], repProgress: [] }}
      initialTeamRows={[]}
      rubricCategories={[]}
    />,
  );

  expect(html).toContain("Build your curriculum");
  expect(html).toContain("Create module");
  expect(html).toContain("Generate with AI");
});

it("renders the rep waiting state when nothing is assigned yet", () => {
  const html = renderToStaticMarkup(
    <TrainingPanel
      aiAvailable={false}
      canManage={false}
      initialModules={[]}
      initialTeamProgress={{ modules: [], repProgress: [] }}
      initialTeamRows={[]}
      rubricCategories={[]}
    />,
  );

  expect(html).toContain("No training is assigned yet");
  expect(html).not.toContain("Create module");
});

it("renders a loading shell that mirrors the stage and command deck", () => {
  const html = renderToStaticMarkup(<TrainingLoading />);
  expect(html).toContain("Loading training");
  expect(html).toContain("Curriculum map");
  expect(html).toContain("Team pulse");
});
```

- [ ] **Step 2: Run the panel tests to verify the empty/loading cases fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Cannot find module '../app/(authenticated)/training/loading'
```

- [ ] **Step 3: Implement inline manager panels, studio empty states, and route loading shell**

Keep manager create/edit/assign/generate surfaces inside the command deck instead of page takeovers by rendering the existing form blocks as `expandedPanel` content in `TrainingManagerCommandDeck`.

Refactor `apps/web/components/training-panel.tsx` so the command deck owns the manager panel slot:

```ts
const expandedManagerPanel = activeManagerModal === "create" || activeManagerModal === "edit"
  ? (
      <div className="rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 p-4">
        <p className="text-sm font-semibold text-white">
          {activeManagerModal === "edit" ? "Edit selected module" : "Create module"}
        </p>
        {/* reuse existing module form fields here */}
      </div>
    )
  : activeManagerModal === "assign"
    ? (
        <div className="rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 p-4">
          <p className="text-sm font-semibold text-white">Assign selected module</p>
          {/* reuse existing assign checklist here */}
        </div>
      )
    : activeManagerModal === "generate"
      ? <TrainingManagerAiTools ... />
      : null;
```

Update the empty states in `apps/web/components/training-panel.tsx`:

```tsx
if (modules.length === 0 && canManage) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-8 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Curriculum studio</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Build your curriculum</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
          Start with a manual module or generate a first draft from the command deck.
        </p>
      </section>
      <TrainingManagerCommandDeck ... />
    </div>
  );
}

if (modules.length === 0) {
  return (
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-8 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Training</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">No training is assigned yet</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
        Your manager will add modules here when the next curriculum is ready.
      </p>
    </section>
  );
}
```

Create `apps/web/components/training/training-loading-shell.tsx`:

```tsx
export function TrainingLoadingShell() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Loading training</p>
        <div className="mt-5 space-y-4">
          <div className="h-9 w-1/2 rounded-full bg-white/8" />
          <div className="h-4 w-full rounded-full bg-white/8" />
          <div className="h-4 w-5/6 rounded-full bg-white/8" />
          <div className="h-56 rounded-[1.25rem] border border-[#45484f]/10 bg-[#161a21]/45" />
        </div>
      </section>
      <aside className="space-y-5">
        <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
          <div className="mt-4 space-y-3">
            <div className="h-20 rounded-[1.15rem] bg-white/8" />
            <div className="h-20 rounded-[1.15rem] bg-white/8" />
          </div>
        </section>
        <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team pulse</p>
          <div className="mt-4 space-y-3">
            <div className="h-11 rounded-xl bg-white/8" />
            <div className="h-11 rounded-xl bg-white/8" />
            <div className="h-11 rounded-xl bg-white/8" />
          </div>
        </section>
      </aside>
    </div>
  );
}
```

Create `apps/web/app/(authenticated)/training/loading.tsx`:

```tsx
import { TrainingLoadingShell } from "@/components/training/training-loading-shell";

export default function Loading() {
  return (
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      <TrainingLoadingShell />
    </section>
  );
}
```

Update the page description copy in `apps/web/app/(authenticated)/training/page.tsx` so the frame matches the new tone:

```tsx
<PageFrame
  actions={[{ href: "/highlights", label: "Open highlights" }]}
  description="Review curriculum, assign modules, and guide practice from one training studio."
  eyebrow="Training"
  title="Training"
>
```

- [ ] **Step 4: Run the panel tests, service tests, and typecheck to verify the redesign is stable**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts lib/training-panel.test.tsx
cd /Users/thevibecodebro/Projects/argos-v2 && npm run typecheck:web
```

Expected:

```text
✓ lib/training/service.test.ts
✓ lib/training-panel.test.tsx
> @argos-v2/web typecheck
> tsc --noEmit --incremental false
```

- [ ] **Step 5: Commit the polish and loading shell**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add apps/web/components/training-panel.tsx \
  apps/web/components/training/training-loading-shell.tsx \
  apps/web/components/training/training-manager-ai-tools.tsx \
  apps/web/components/training/training-quiz-editor.tsx \
  apps/web/app/(authenticated)/training/loading.tsx \
  apps/web/app/(authenticated)/training/page.tsx \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: polish training studio states and loading shell"
```

---

## Self-Review

### Spec coverage

- Shell direction covered by Task 2 through the stage, TOC rail, and shell wrapper.
- Manager hybrid stage and command deck covered by Task 3.
- Inline manager actions covered by Task 4.
- Empty, loading, and mobile-aware shell ordering covered by Task 4.
- Strict rep/manager visibility split covered by the markup tests in Tasks 2 and 3.
- Due-soon manager pulse requirement covered by Task 1 plus the metrics helper in Task 3.

### Placeholder scan

Search the plan for the red-flag filler phrases called out by the skill instructions. There should be none in the implementation tasks.

### Type consistency

- `TrainingStageView` is always `"lesson" | "quiz"`.
- Manager pulse helper is always `getTrainingManagerStageMetrics`.
- The expanded team-progress shape always uses `assignedAt` and `dueDate` as ISO strings or `null`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-training-section-curriculum-studio.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
