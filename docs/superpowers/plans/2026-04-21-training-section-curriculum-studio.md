# Training Section Brand Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the authenticated `/training` page so it looks and behaves like the rest of Argos: a module-led learning surface with calmer supporting panels and manager tools hidden behind focused overlays.

**Architecture:** Keep the existing `/training` route, `PageFrame`, and `TrainingPanel` controller, but reshape the page from a right-rail workspace into a stacked shell with one clear lead stage, one quieter curriculum map, and one compact manager planning surface. Reuse the existing manager modal state already present in `TrainingPanel` and the overlay pattern already used in `call-detail-panel.tsx` so authoring and assignment flows move off the resting page without adding new dependencies.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript, Tailwind v4 utilities, Vitest server-render tests, existing training API/service layer.

---

## File Structure

### Existing files to modify

- `apps/web/components/training-panel.tsx`
  Responsibility: remain the stateful controller, but stop rendering the manager editor inline in the resting page and compose the new stacked shell plus overlay-based manager flows.
- `apps/web/components/training/training-course-shell.tsx`
  Responsibility: become a stacked page shell instead of the current wide stage-plus-rail layout.
- `apps/web/components/training/training-module-stage.tsx`
  Responsibility: become the clear lead surface with a stronger Argos-native hierarchy and a compact status strip.
- `apps/web/components/training/training-module-toc.tsx`
  Responsibility: become a calmer Dashboard-style support panel with cleaner module rows.
- `apps/web/components/training/training-manager-command-deck.tsx`
  Responsibility: become a compact resting planning surface instead of an always-expanded utility deck.
- `apps/web/components/training/training-quiz-editor.tsx`
  Responsibility: fit the overlay treatment used by create/edit flows instead of reading like an inline page takeover.
- `apps/web/components/training/training-manager-ai-tools.tsx`
  Responsibility: fit the same overlay treatment and reduced visual density.
- `apps/web/components/training/training-loading-shell.tsx`
  Responsibility: mirror the revised stacked shell rather than the current studio shell.
- `apps/web/app/(authenticated)/training/page.tsx`
  Responsibility: keep `PageFrame` and tighten header copy so it matches the revised brand-aligned direction.
- `apps/web/lib/training-panel.test.tsx`
  Responsibility: lock the new shell hierarchy, resting manager state, overlay regressions, empty states, and loading shell.

### New files to create

- `apps/web/components/training/training-manager-modal.tsx`
  Responsibility: house the reusable overlay container for create/edit/assign/generate manager flows using the same hand-rolled modal pattern already used in `call-detail-panel.tsx`.

### Existing files to reference

- `apps/web/components/call-detail-panel.tsx`
  Responsibility: reference-only source for the existing modal overlay pattern already accepted in the product.
- `apps/web/components/page-frame.tsx`
  Responsibility: route-level header styling that must remain untouched.

### Notes on boundaries

- Do not add any new UI library or dialog dependency.
- Do not move manager logic out of `TrainingPanel` unless the extracted piece is a pure presentational component.
- Keep the page stable at rest. Any heavy manager form must live in the overlay component, not in the main canvas.

---

### Task 1: Restack Training Into A Brand-Aligned Learning Shell

**Files:**
- Modify: `apps/web/lib/training-panel.test.tsx`
- Modify: `apps/web/components/training/training-course-shell.tsx`
- Modify: `apps/web/components/training/training-module-stage.tsx`
- Modify: `apps/web/components/training/training-module-toc.tsx`
- Modify: `apps/web/components/training-panel.tsx`

- [ ] **Step 1: Write the failing shell-hierarchy tests**

Update `apps/web/lib/training-panel.test.tsx` so the page is expected to render as a stacked shell instead of the current stage-plus-rail grid:

```ts
it("renders the course shell as stacked sections instead of a wide right-rail grid", () => {
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

  expect(html).toContain("Current curriculum");
  expect(html).toContain("Curriculum map");
  expect(html).not.toContain("xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]");
});

it("renders curriculum rows as navigation instead of numbered mini-cards", () => {
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

  expect(html).toContain("Current curriculum");
  expect(html).toContain("Discovery That Finds the Real Pain");
  expect(html).not.toContain(">Module 1<");
});
```

- [ ] **Step 2: Run the shell tests to verify they fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Expected HTML not to contain xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]
Expected HTML not to contain >Module 1<
```

- [ ] **Step 3: Implement the stacked shell and calmer support panels**

Update `apps/web/components/training/training-course-shell.tsx` so it renders a stacked shell:

```tsx
export function TrainingCourseShell({
  commandDeck,
  stage,
  tableOfContents,
}: TrainingCourseShellProps) {
  return (
    <div className="space-y-6">
      <main className="min-w-0">{stage}</main>
      <section>{tableOfContents}</section>
      {commandDeck ? <aside>{commandDeck}</aside> : null}
    </div>
  );
}
```

Update `apps/web/components/training/training-module-stage.tsx` so it becomes the clear lead surface instead of another generic slab:

```tsx
<section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(116,177,255,0.16),transparent_30%),linear-gradient(180deg,rgba(16,19,26,0.98),rgba(10,13,19,0.96))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)] sm:p-7">
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_24%,transparent_72%,rgba(255,255,255,0.02))]" />
  <div className="relative space-y-5">
    ...
  </div>
</section>
```

Update `apps/web/components/training/training-module-toc.tsx` so module items read like support-row navigation instead of stacked feature cards:

```tsx
<section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
    Curriculum map
  </p>
  <div className="mt-4 divide-y divide-white/6 overflow-hidden rounded-[1.15rem] border border-white/8 bg-white/[0.03]">
    {modules.map((module) => (
      <button ...>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{module.title}</p>
            <p className="mt-1 text-xs text-[#a9abb3]">{module.progress?.status ?? "assigned"}</p>
          </div>
          <span className="text-xs font-semibold text-[#74b1ff]">Open</span>
        </div>
      </button>
    ))}
  </div>
</section>
```

Update `apps/web/components/training-panel.tsx` so it composes the same order the spec requires:

```tsx
return (
  <TrainingCourseShell
    stage={stage}
    tableOfContents={tableOfContents}
    commandDeck={commandDeck}
  />
);
```

- [ ] **Step 4: Run the shell tests to verify they pass**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
✓ lib/training-panel.test.tsx
```

- [ ] **Step 5: Commit the shell hierarchy changes**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add \
  apps/web/components/training-panel.tsx \
  apps/web/components/training/training-course-shell.tsx \
  apps/web/components/training/training-module-stage.tsx \
  apps/web/components/training/training-module-toc.tsx \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: restack training into a brand-aligned shell"
```

---

### Task 2: Move Manager Authoring And Assignment Into Focused Overlays

**Files:**
- Modify: `apps/web/lib/training-panel.test.tsx`
- Create: `apps/web/components/training/training-manager-modal.tsx`
- Modify: `apps/web/components/training/training-manager-command-deck.tsx`
- Modify: `apps/web/components/training/training-quiz-editor.tsx`
- Modify: `apps/web/components/training/training-manager-ai-tools.tsx`
- Modify: `apps/web/components/training-panel.tsx`

- [ ] **Step 1: Write the failing manager-resting-state tests**

Update `apps/web/lib/training-panel.test.tsx` so manager initial render expects compact planning controls without the heavy inline tooling:

```ts
it("keeps the manager deck compact at rest", () => {
  const html = renderToStaticMarkup(
    <TrainingPanel
      aiAvailable
      canManage
      initialModules={baseModules}
      initialTeamProgress={initialTeamProgress}
      initialTeamRows={initialTeamRows}
      rubricCategories={[]}
    />,
  );

  expect(html).toContain("Create module");
  expect(html).toContain("Edit selected module");
  expect(html).toContain("Assign selected module");
  expect(html).toContain("Generate with AI");
  expect(html).not.toContain("Draft lesson content");
  expect(html).not.toContain("Quiz builder");
  expect(html).not.toContain("Select reps, set an optional due date");
});
```

- [ ] **Step 2: Run the manager-resting-state test to verify it fails**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Expected HTML not to contain "Draft lesson content"
Expected HTML not to contain "Quiz builder"
```

- [ ] **Step 3: Extract the manager overlay and remove the always-expanded deck**

Create `apps/web/components/training/training-manager-modal.tsx` using the same overlay pattern already used in `call-detail-panel.tsx`:

```tsx
type TrainingManagerModalProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function TrainingManagerModal({
  children,
  description,
  eyebrow,
  onClose,
  open,
  title,
}: TrainingManagerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[1.5rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.4)]">
        ...
      </div>
    </div>
  );
}
```

Update `apps/web/components/training/training-manager-command-deck.tsx` so it only renders the compact summary and action buttons at rest:

```tsx
export function TrainingManagerCommandDeck({...}: TrainingManagerCommandDeckProps) {
  return (
    <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        ...
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        ...
      </div>
      {feedback}
    </section>
  );
}
```

Update `apps/web/components/training-panel.tsx` so:

- `expandedPanel` is no longer passed into the resting deck
- create/edit/assign/generate content renders inside `TrainingManagerModal`
- the main page remains stable under the overlay

```tsx
const managerModal = (
  <TrainingManagerModal
    description={modalDescription}
    eyebrow={modalEyebrow}
    onClose={closeManagerModal}
    open={activeManagerModal !== null}
    title={modalTitle}
  >
    {activeManagerPanel}
  </TrainingManagerModal>
);

return (
  <>
    <TrainingCourseShell ... />
    {managerModal}
  </>
);
```

Update `apps/web/components/training/training-quiz-editor.tsx` and `apps/web/components/training/training-manager-ai-tools.tsx` so their container classes fit an overlay surface:

```tsx
className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4"
```

- [ ] **Step 4: Run the training panel tests to verify the manager resting state passes**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
✓ lib/training-panel.test.tsx
```

- [ ] **Step 5: Commit the manager overlay changes**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add \
  apps/web/components/training-panel.tsx \
  apps/web/components/training/training-manager-modal.tsx \
  apps/web/components/training/training-manager-command-deck.tsx \
  apps/web/components/training/training-quiz-editor.tsx \
  apps/web/components/training/training-manager-ai-tools.tsx \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: move training manager flows into overlays"
```

---

### Task 3: Tighten Copy, Empty States, And Loading Shell

**Files:**
- Modify: `apps/web/lib/training-panel.test.tsx`
- Modify: `apps/web/components/training-panel.tsx`
- Modify: `apps/web/components/training/training-loading-shell.tsx`
- Modify: `apps/web/app/(authenticated)/training/page.tsx`

- [ ] **Step 1: Write the failing state-and-copy tests**

Update `apps/web/lib/training-panel.test.tsx` so the revised route and state copy is enforced:

```ts
it("renders the manager empty state as planning guidance instead of a studio splash", () => {
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

  expect(html).toContain("Create your first module");
  expect(html).toContain("Generate a draft sequence with AI");
  expect(html).not.toContain("Build your curriculum");
});

it("renders the loading shell with the stacked training structure", () => {
  const html = renderToStaticMarkup(<TrainingLoading />);

  expect(html).toContain("Loading training");
  expect(html).toContain("Current curriculum");
  expect(html).toContain("Curriculum map");
  expect(html).not.toContain("Team pulse");
});
```

- [ ] **Step 2: Run the state-and-copy tests to verify they fail**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
```

Expected:

```text
FAIL  lib/training-panel.test.tsx
Expected HTML to contain "Create your first module"
Expected HTML not to contain "Team pulse"
```

- [ ] **Step 3: Implement the copy and loading-shell polish**

Update the manager empty state copy in `apps/web/components/training-panel.tsx`:

```tsx
<h4 className="mt-2 text-lg font-semibold text-white">Create your first module</h4>
<p className="mt-2 max-w-2xl text-sm leading-7 text-[#a9abb3]">
  Start with a single lesson or generate a draft sequence with AI. Once modules exist,
  assignment and editing flows stay available from the compact planning surface below.
</p>
```

Update the rep empty state so it stays calm and product-like:

```tsx
<h2 className="text-2xl font-semibold text-white">Nothing is assigned yet</h2>
<p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
  Your manager will place modules here when new training is ready. Check back soon to start practice.
</p>
```

Update `apps/web/components/training/training-loading-shell.tsx` so it mirrors the new stacked shell:

```tsx
export function TrainingLoadingShell() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Loading training</p>
        <div className="mt-4 h-40 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
      </section>
      <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
        <div className="mt-4 space-y-3">
          ...
        </div>
      </section>
    </div>
  );
}
```

Tighten the route header copy in `apps/web/app/(authenticated)/training/page.tsx`:

```tsx
<PageFrame
  actions={[{ href: "/highlights", label: "Open highlights" }]}
  description="Review assigned modules, complete lessons, and guide practice from one training surface."
  eyebrow="Training"
  title="Training"
>
```

- [ ] **Step 4: Run the training tests and typecheck**

Run:

```bash
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training-panel.test.tsx
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm test -- lib/training/service.test.ts
cd /Users/thevibecodebro/Projects/argos-v2/apps/web && npm run typecheck
```

Expected:

```text
✓ lib/training-panel.test.tsx
✓ lib/training/service.test.ts
> tsc --noEmit --incremental false
```

- [ ] **Step 5: Commit the state and loading polish**

```bash
cd /Users/thevibecodebro/Projects/argos-v2
git add \
  apps/web/app/'(authenticated)'/training/page.tsx \
  apps/web/components/training-panel.tsx \
  apps/web/components/training/training-loading-shell.tsx \
  apps/web/lib/training-panel.test.tsx
git commit -m "feat: polish training brand-aligned states"
```

---

## Self-Review

### Spec coverage

- `PageFrame` remains the route header: covered in Task 3.
- Lead module stage becomes the clear anchor: covered in Task 1.
- Curriculum map becomes a calmer support panel: covered in Task 1.
- Manager tools are compact at rest and open on demand: covered in Task 2.
- Empty states, loading shell, and tighter copy: covered in Task 3.
- Rep/manager separation stays intact: regression coverage stays in `lib/training-panel.test.tsx` across all tasks.

### Placeholder scan

- No `TODO` or `TBD` markers remain.
- Each task lists explicit files, code targets, commands, and commit messages.

### Type consistency

- The existing `ManagerModal` state in `training-panel.tsx` remains the state source.
- The new `TrainingManagerModal` is intentionally presentational only.
- The shell remains orchestrated by `TrainingPanel`; no competing container is introduced.
