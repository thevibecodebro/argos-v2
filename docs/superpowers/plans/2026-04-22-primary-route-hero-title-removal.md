# Primary Route Hero Title Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant large hero titles from the six primary authenticated routes while keeping route actions visible and leaving settings/detail/provisioning states unchanged.

**Architecture:** Add an opt-in hidden-header mode to `PageFrame` so shared top-level routes can drop their eyebrow/title/description block without changing default behavior elsewhere. Remove the remaining bespoke hero copy directly in `dashboard`, `calls`, and `highlights`, and lock the approved scope with focused Vitest coverage.

**Tech Stack:** Next.js App Router, React 19 server components, Tailwind CSS utilities, Vitest, GitNexus CLI/MCP

---

## File Map

- Modify: `apps/web/components/page-frame.tsx`
- Modify: `apps/web/app/(authenticated)/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/leaderboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/training/page.tsx`
- Modify: `apps/web/app/(authenticated)/dashboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/calls/page.tsx`
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
- Create: `apps/web/lib/page-frame.test.tsx`
- Create: `apps/web/lib/primary-route-hero-removal.test.ts`

---

### Task 1: Add Hidden-Header Support To `PageFrame`

**Files:**
- Modify: `apps/web/components/page-frame.tsx`
- Create: `apps/web/lib/page-frame.test.tsx`

- [ ] **Step 1: Run GitNexus impact analysis for `PageFrame`**

```bash
npx gitnexus impact PageFrame --direction upstream
```

Expected: `risk: LOW`. If GitNexus reports `HIGH` or `CRITICAL`, stop and review the blast radius before editing.

- [ ] **Step 2: Write the failing `PageFrame` test**

Create `apps/web/lib/page-frame.test.tsx` with:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageFrame } from "../components/page-frame";

describe("PageFrame", () => {
  it("renders header copy by default", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Training",
        description: "Review assigned modules, complete lessons, and guide practice from one training surface.",
        eyebrow: "Training",
        actions: [{ href: "/highlights", label: "Open highlights" }],
        children: createElement("div", null, "Training body"),
      }),
    );

    expect(html).toContain("Training");
    expect(html).toContain("Review assigned modules, complete lessons, and guide practice from one training surface.");
    expect(html).toContain("Open highlights");
    expect(html).toContain("Training body");
  });

  it("keeps route actions while hiding the hero copy in hidden mode", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Leaderboard",
        description: "Compare top-quality, top-volume, and most-improved slices across your team.",
        eyebrow: "Performance",
        headerMode: "hidden",
        actions: [{ href: "/team", label: "Open team view" }],
        children: createElement("div", null, "Leaderboard body"),
      }),
    );

    expect(html).toContain("Leaderboard body");
    expect(html).toContain("Open team view");
    expect(html).not.toContain("Compare top-quality, top-volume, and most-improved slices across your team.");
    expect(html).not.toContain("Performance");
    expect(html).not.toContain(">Leaderboard<");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
npm run test:web -- --run apps/web/lib/page-frame.test.tsx
```

Expected: FAIL because `PageFrame` does not yet accept `headerMode` or still renders the title block in hidden mode.

- [ ] **Step 4: Implement the minimal `PageFrame` API**

Update `apps/web/components/page-frame.tsx` to add an opt-in hidden-header mode:

```tsx
type PageFrameProps = {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  actions?: PageAction[];
  tone?: "default" | "warning";
  headerMode?: "default" | "hidden";
};

export function PageFrame({
  actions,
  children,
  description,
  eyebrow,
  title,
  tone = "default",
  headerMode = "default",
}: PageFrameProps) {
  const actionLinks = actions?.length ? (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Link
          className="rounded-xl border border-[#74b1ff]/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#74b1ff] transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/10"
          href={action.href}
          key={action.href}
        >
          {action.label}
        </Link>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      {headerMode === "default" ? (
        <section
          className={cn(
            "rounded-[1.75rem] border p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)] sm:p-7",
            tone === "warning"
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-[#45484f]/10 bg-[#10131a]",
          )}
        >
          {eyebrow ? (
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">{title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-[#a9abb3]">{description}</p>
            </div>
            {actionLinks}
          </div>
        </section>
      ) : actionLinks ? (
        <div className="flex justify-end">{actionLinks}</div>
      ) : null}

      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
npm run test:web -- --run apps/web/lib/page-frame.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the isolated `PageFrame` change**

```bash
git add apps/web/components/page-frame.tsx apps/web/lib/page-frame.test.tsx
git commit -m "feat: add page frame hidden header mode"
```

---

### Task 2: Hide Shared Page Headers On `team`, `leaderboard`, and `training`

**Files:**
- Modify: `apps/web/app/(authenticated)/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/leaderboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/training/page.tsx`
- Create: `apps/web/lib/primary-route-hero-removal.test.ts`

- [ ] **Step 1: Run GitNexus impact analysis for the three route functions**

```bash
npx gitnexus impact TeamPage --direction upstream
npx gitnexus impact LeaderboardPage --direction upstream
npx gitnexus impact TrainingPage --direction upstream
```

Expected: `risk: LOW` for all three.

- [ ] **Step 2: Write the failing route-scope smoke test**

Create `apps/web/lib/primary-route-hero-removal.test.ts` with:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function readAppFile(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("primary route hero removal", () => {
  it("switches page-frame routes to hidden headers", async () => {
    const [team, leaderboard, training] = await Promise.all([
      readAppFile("app/(authenticated)/team/page.tsx"),
      readAppFile("app/(authenticated)/leaderboard/page.tsx"),
      readAppFile("app/(authenticated)/training/page.tsx"),
    ]);

    expect(team).toContain('headerMode="hidden"');
    expect(team).toContain('label: "Open leaderboard"');

    expect(leaderboard).toContain('headerMode="hidden"');
    expect(leaderboard).toContain('label: "Open team view"');

    expect(training).toContain('headerMode="hidden"');
    expect(training).toContain('label: "Open highlights"');
  });

  it("keeps default page-frame headings on out-of-scope routes", async () => {
    const [settings, repProfile, teamLoading] = await Promise.all([
      readAppFile("app/(authenticated)/settings/page.tsx"),
      readAppFile("app/(authenticated)/team/[repId]/page.tsx"),
      readAppFile("app/(authenticated)/team/loading.tsx"),
    ]);

    expect(settings).toContain('title="Account"');
    expect(repProfile).toContain('title="Rep Profile"');
    expect(teamLoading).toContain('title="Team"');
  });
});
```

- [ ] **Step 3: Run the smoke test to verify it fails**

Run:

```bash
npm run test:web -- --run apps/web/lib/primary-route-hero-removal.test.ts
```

Expected: FAIL because the three top-level routes do not yet opt into `headerMode="hidden"`.

- [ ] **Step 4: Opt the three routes into hidden header mode**

Update the `PageFrame` calls in the three route files:

```tsx
return (
  <PageFrame
    headerMode="hidden"
    actions={[{ href: "/leaderboard", label: "Open leaderboard" }]}
    description="Review team performance with week-over-week trend, call volume, and coaching flags."
    eyebrow="Team"
    title="Team"
  >
    <TeamRosterView dashboard={dashboard} />
  </PageFrame>
);
```

Apply the same `headerMode="hidden"` addition to:

```tsx
// apps/web/app/(authenticated)/leaderboard/page.tsx
<PageFrame
  headerMode="hidden"
  actions={[{ href: "/team", label: "Open team view" }]}
  description="Compare top-quality, top-volume, and most-improved slices across your team."
  eyebrow="Performance"
  title="Leaderboard"
>

// apps/web/app/(authenticated)/training/page.tsx
<PageFrame
  headerMode="hidden"
  actions={[{ href: "/highlights", label: "Open highlights" }]}
  description="Review assigned modules, complete lessons, and guide practice from one training surface."
  eyebrow="Training"
  title="Training"
>
```

- [ ] **Step 5: Re-run the smoke test**

Run:

```bash
npm run test:web -- --run apps/web/lib/primary-route-hero-removal.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the shared-route update**

```bash
git add \
  'apps/web/app/(authenticated)/team/page.tsx' \
  'apps/web/app/(authenticated)/leaderboard/page.tsx' \
  'apps/web/app/(authenticated)/training/page.tsx' \
  apps/web/lib/primary-route-hero-removal.test.ts
git commit -m "feat: hide shared primary route headers"
```

---

### Task 3: Remove Remaining Hero Copy From `dashboard`, `calls`, and `highlights`

**Files:**
- Modify: `apps/web/app/(authenticated)/dashboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/calls/page.tsx`
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
- Modify: `apps/web/lib/primary-route-hero-removal.test.ts`

- [ ] **Step 1: Run GitNexus impact analysis for each edited function**

```bash
npx gitnexus impact RepDashboardView --direction upstream
npx gitnexus impact ManagerDashboardView --direction upstream
npx gitnexus impact ExecutiveDashboardView --direction upstream
npx gitnexus impact CallsPage --direction upstream
npx gitnexus impact HighlightsPage --direction upstream
```

Expected: `risk: LOW` for each command. Stop if any command returns `HIGH` or `CRITICAL`.

- [ ] **Step 2: Extend the route smoke test with failing hero-copy assertions**

Append this third test to `apps/web/lib/primary-route-hero-removal.test.ts`:

```ts
  it("removes inline hero copy from dashboard, calls, and highlights while keeping route utilities", async () => {
    const [dashboard, calls, highlights] = await Promise.all([
      readAppFile("app/(authenticated)/dashboard/page.tsx"),
      readAppFile("app/(authenticated)/calls/page.tsx"),
      readAppFile("app/(authenticated)/highlights/page.tsx"),
    ]);

    expect(dashboard).not.toContain("My Dashboard");
    expect(dashboard).not.toContain("Team Dashboard");
    expect(dashboard).not.toContain("Executive Dashboard");
    expect(dashboard).toContain("Live team snapshot");
    expect(dashboard).toContain('href="/team"');

    expect(calls).not.toContain("<h1");
    expect(calls).not.toContain("Intelligence archive");
    expect(calls).toContain('href="/upload"');

    expect(highlights).not.toContain("<h1");
    expect(highlights).not.toContain("Review key coaching moments and critical intelligence extracted");
    expect(highlights).toContain('href="/calls"');
  });
```

- [ ] **Step 3: Run the smoke test to verify it fails**

Run:

```bash
npm run test:web -- --run apps/web/lib/primary-route-hero-removal.test.ts
```

Expected: FAIL because the old dashboard headings, call-library hero, and highlights hero are still present.

- [ ] **Step 4: Implement the route-level removals**

In `apps/web/app/(authenticated)/dashboard/page.tsx`, remove the top introductory wrappers and replace the repeated manager/executive CTA-card heading with utility-oriented copy:

```tsx
function RepDashboardView({ badges, dashboard }: { badges: Badge[]; dashboard: RepDashboard | null }) {
  const recentCalls = dashboard?.recentCalls ?? [];
  const focusAreas = dashboard?.lowestCategories ?? [];
  const focusAreasLabel = dashboard?.categoryAnalyticsContextLabel ?? null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label="30-day average" value={dashboard?.monthlyAvgScore ?? "—"} />
        <MetricCard label="Calls analyzed" value={recentCalls.length} />
        <MetricCard label="Focus categories" value={focusAreas.length} />
      </div>
      {/* existing panels stay unchanged */}
    </div>
  );
}

// In both manager and executive CTA cards:
<h3 className="text-xl font-bold mb-2 text-[#ecedf6]">Live team snapshot</h3>
<p className="text-[#a9abb3] text-sm max-w-md">
  Current team activity, leaderboard movement, and setup status for this cycle.
</p>
```

In `apps/web/app/(authenticated)/calls/page.tsx`, replace the hero section with a compact utility row:

```tsx
<section className="relative mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-6">
  {canSeeRep && viewer ? (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_40px_rgba(3,8,20,0.22)] backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
        Viewing As
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{viewer.fullName}</p>
      <p className="text-sm capitalize text-slate-400">{viewer.role}</p>
    </div>
  ) : (
    <div />
  )}

  <Link
    className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-[#74b1ff]/20 bg-white/[0.04] px-5 py-4 text-sm font-semibold text-[#74b1ff] shadow-[0_12px_40px_rgba(3,8,20,0.22)] backdrop-blur-md transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/10"
    href="/upload"
  >
    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
      upload_file
    </span>
    Upload a call
  </Link>
</section>
```

In `apps/web/app/(authenticated)/highlights/page.tsx`, remove the hero title block and keep only a compact top action row:

```tsx
<section className="mb-8 flex justify-end">
  <Link
    className="flex items-center gap-2 rounded-lg border border-[#45484f]/30 bg-[#22262f] px-5 py-2.5 text-[#a9abb3] transition-all hover:border-[#74b1ff]/50 hover:text-[#74b1ff] active:scale-95"
    href="/calls"
  >
    <span className="material-symbols-outlined text-sm">arrow_back</span>
    <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest">
      Back to call library
    </span>
  </Link>
</section>
```

- [ ] **Step 5: Re-run the smoke test**

Run:

```bash
npm run test:web -- --run apps/web/lib/primary-route-hero-removal.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the bespoke-route cleanup**

```bash
git add \
  'apps/web/app/(authenticated)/dashboard/page.tsx' \
  'apps/web/app/(authenticated)/calls/page.tsx' \
  'apps/web/app/(authenticated)/highlights/page.tsx' \
  apps/web/lib/primary-route-hero-removal.test.ts
git commit -m "feat: remove redundant primary route hero copy"
```

---

### Task 4: Verify The Approved Scope End-To-End

**Files:**
- Verify only

- [ ] **Step 1: Run the focused test suite**

```bash
npm run test:web -- --run apps/web/lib/page-frame.test.tsx apps/web/lib/primary-route-hero-removal.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run web typechecking**

```bash
npm run typecheck:web
```

Expected: PASS with no new TypeScript errors.

- [ ] **Step 3: Run GitNexus change detection before any final merge/hand-off**

```text
gitnexus_detect_changes({ scope: "all" })
```

Expected: only the targeted route files, `PageFrame`, and the two new tests are reported as changed. If extra authenticated settings/detail routes appear, stop and inspect.

- [ ] **Step 4: Capture the final visual scope check**

Confirm in the browser or screenshot pass:

- `/dashboard` starts with metrics/content, not `My Dashboard`, `Team Dashboard`, or `Executive Dashboard`
- `/team`, `/leaderboard`, and `/training` show only their preserved top actions
- `/calls` shows the viewer utility card and upload CTA without a route hero
- `/highlights` shows only the back-to-library utility row at the top
- `/settings`, `/team/[repId]`, and `/team/loading` still retain their explicit `PageFrame` headings
