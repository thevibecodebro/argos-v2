# Authenticated Page Readability Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve authenticated backend page readability and GoHighLevel-style simplicity without changing the existing navigation structure.

**Architecture:** Keep the current tenant shell and route map intact. Continue the page-level cleanup already started in `codex/backend-ux-mockups`: pages should be object-first, table/form/transcript-first, and free of decorative metric strips. Use small shared readability primitives only where they remove repeated styling across settings, drawers, tables, and route chrome.

**Tech Stack:** Next.js App Router, React Server Components, client components where already required, Vitest route/source tests, existing Forge and Operational primitives, Tailwind utility classes, Geist authenticated font contract.

---

## Execution Model

Use subagent-driven development sequentially, not parallel implementation.

- Main agent coordinates the plan, resolves integration, and owns final verification.
- Each task gets one fresh worker subagent with only that task's file scope.
- After every worker: run a spec-compliance reviewer subagent, then a code-quality reviewer subagent.
- If either reviewer finds issues, send the same worker back to fix the exact issue, then rerun that reviewer.
- Do not dispatch multiple implementation workers at the same time. These pages share UI primitives and parallel edits would create conflicts.
- Do not edit `apps/web/components/app-shell.tsx` or primary navigation labels/routes in this plan.
- Do not change schemas, repositories, auth, route permissions, data service contracts, or platform/admin routes.
- Commit after each accepted task only when the coordinator has explicit commit authorization for the current run. Otherwise leave changes unstaged and report paths.

## Current Baseline

This plan assumes the current clean worktree slice already has:

- `OperationalMetricStrip` removed from authenticated route pages.
- Navigation restored to the existing labels and routes: Dashboard, Calls, Highlights, Training, Roleplay, Team, Leaderboard, with Settings separate.
- Dashboard visible title restored to Dashboard while keeping the `Needs attention` queue.
- Authenticated typography moved toward Geist and calmer body/header scales.
- Tests covering the first readability pass:
  - `apps/web/lib/focused-route-readability.test.ts`
  - `apps/web/lib/coaching-team-readability.test.ts`
  - `apps/web/lib/remaining-route-readability.test.ts`
  - `apps/web/lib/authenticated-typography-contract.test.tsx`

## File Structure

### Read-only scope

- `apps/web/components/app-shell.tsx`: read-only. Navigation must remain unchanged.
- Service and repository files under `apps/web/lib`: read-only for this plan. This plan is UI/readability only.
- Database migrations and schema files: read-only.

### Shared UI files

- Modify: `apps/web/components/operational-workspace.tsx`
  - Tighten toolbar, drawer, and optional table helpers.
  - Keep exported component names stable.
- Create: `apps/web/components/settings/settings-readability.tsx`
  - Shared settings labels, section headers, meta rows, and table shell.

### Settings files

- Modify: `apps/web/components/settings/settings-workbench.tsx`
- Modify: `apps/web/components/settings/account-panel.tsx`
- Modify: `apps/web/components/settings/compliance-panel.tsx`
- Modify: `apps/web/components/settings/integrations-panel.tsx`
- Modify: `apps/web/components/settings/people-panel.tsx`
- Modify: `apps/web/components/settings/teams-panel.tsx`
- Modify: `apps/web/components/settings/permissions-panel.tsx`
- Modify: `apps/web/components/settings/rubrics-panel.tsx`
- Test: `apps/web/lib/settings-readability-contract.test.ts`
- Keep existing: `apps/web/lib/settings-nav.test.tsx`

### Roleplay files

- Modify: `apps/web/components/roleplay-panel.tsx`
- Modify: `apps/web/lib/roleplay-panel.test.ts`
- Test: `apps/web/lib/roleplay-readability-contract.test.ts`

### Call detail files

- Modify: `apps/web/components/call-detail-panel.tsx`
- Modify: `apps/web/app/(authenticated)/calls/[id]/page.tsx`
- Modify: `apps/web/lib/call-detail-panel.test.tsx`
- Modify: `apps/web/lib/call-detail-page-forge.test.ts`
- Test: `apps/web/lib/call-detail-readability-contract.test.ts`

### Cross-route files

- Modify: `apps/web/app/(authenticated)/notifications/page.tsx`
- Modify: `apps/web/app/(authenticated)/upload/page.tsx`
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
- Modify: `apps/web/app/(authenticated)/leaderboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/training/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/roleplay/history/page.tsx`
- Modify: `apps/web/app/(authenticated)/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/team/[repId]/page.tsx`
- Modify tests:
  - `apps/web/lib/focused-route-readability.test.ts`
  - `apps/web/lib/coaching-team-readability.test.ts`
  - `apps/web/lib/remaining-route-readability.test.ts`
  - `apps/web/lib/primary-route-hero-removal.test.ts`

## Global Acceptance Criteria

- Existing navigation labels and routes are unchanged.
- No authenticated route page imports or renders `OperationalMetricStrip`.
- No fake controls: filter chips, tabs, segmented controls, or buttons must either change real state, change URL state, or be removed.
- Page order is: shell, compact toolbar/header, controls that affect the primary object, primary work object, optional selected-object drawer.
- Drawers are not second pages. They only summarize a selected row/object or a narrow next action.
- Settings pages read like configuration workspaces, not marketing cards.
- Roleplay reads like a practice workspace, not a command dashboard.
- Call detail reads like a transcript/evidence review bench, not a tabbed dashboard.
- Mobile layouts must not require horizontal scrolling except intentionally scrollable data tables.

## Verification Commands

Run focused commands after each task:

```bash
npm run test -w @argos-v2/web -- <affected test files>
npm run typecheck -w @argos-v2/web
git diff --check
```

Before final handoff:

```bash
npm run test -w @argos-v2/web -- lib/focused-route-readability.test.ts lib/coaching-team-readability.test.ts lib/remaining-route-readability.test.ts lib/primary-route-hero-removal.test.ts lib/call-detail-page-forge.test.ts lib/call-detail-panel.test.tsx lib/roleplay-panel.test.ts lib/settings-nav.test.tsx lib/settings-readability-contract.test.ts lib/roleplay-readability-contract.test.ts lib/call-detail-readability-contract.test.ts lib/authenticated-typography-contract.test.tsx lib/operational-workspace.test.tsx lib/app-shell.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
rg -n "OperationalMetricStrip" "apps/web/app/(authenticated)" || true
```

Browser verification:

- Use the in-app browser when an authenticated session is available.
- Check desktop and mobile widths for Dashboard, Settings, Roleplay, Call Detail, Calls, Team.
- If authenticated browser smoke redirects to login, document the auth blocker and rely on server-render/source tests for the handoff.

---

### Task 1: Scope Locks And Shared Readability Contracts

**Files:**
- Create: `apps/web/lib/backend-readability-scope.test.ts`
- Modify: `apps/web/lib/app-shell.test.ts`
- Modify: `apps/web/lib/operational-workspace.test.tsx`
- Modify: `apps/web/components/operational-workspace.tsx`

- [ ] **Step 1: Write the failing scope/readability test**

Create `apps/web/lib/backend-readability-scope.test.ts` with this full test. It protects the user's clarified scope: leave navigation alone and optimize pages.

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("..", import.meta.url).pathname;
const authenticatedRoot = join(repoRoot, "app/(authenticated)");

function collectFiles(dir: string, matcher: (path: string) => boolean, result: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectFiles(path, matcher, result);
    } else if (matcher(path)) {
      result.push(path);
    }
  }
  return result;
}

describe("authenticated backend readability scope", () => {
  it("keeps the existing primary navigation route set and labels", () => {
    const source = readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");

    expect(source).toContain('{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }');
    expect(source).toContain('{ href: "/calls", label: "Calls", icon: "library_books" }');
    expect(source).toContain('{ href: "/highlights", label: "Highlights", icon: "auto_awesome" }');
    expect(source).toContain('{ href: "/training", label: "Training", icon: "school" }');
    expect(source).toContain('{ href: "/roleplay", label: "Roleplay", icon: "psychology" }');
    expect(source).toContain('{ href: "/team", label: "Team", icon: "group" }');
    expect(source).toContain('{ href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" }');
    expect(source).not.toContain('label: "Today"');
    expect(source).not.toContain('label: "Coaching"');
  });

  it("keeps route pages free of decorative metric strips", () => {
    const routeFiles = collectFiles(
      authenticatedRoot,
      (path) => path.endsWith("page.tsx") || path.endsWith("loading.tsx"),
    );

    for (const file of routeFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, relative(repoRoot, file)).not.toContain("OperationalMetricStrip");
      expect(source, relative(repoRoot, file)).not.toContain('data-operational-metric-strip="true"');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify current scope**

Run:

```bash
npm run test -w @argos-v2/web -- lib/backend-readability-scope.test.ts
```

Expected: PASS on the current corrected baseline. This is a baseline guard, not a red test for new behavior.

- [ ] **Step 3: Write the failing shared primitive test**

Update `apps/web/lib/operational-workspace.test.tsx` with a test that fails until shared primitives expose calmer labels and drawer variants.

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
} from "../components/operational-workspace";

it("uses calm product chrome for toolbars and selected-object drawers", () => {
  const toolbarHtml = renderToStaticMarkup(
    createElement(OperationalToolbar, {
      eyebrow: "Review",
      title: "Calls",
      description: "Find and review scored calls.",
      status: { label: "Manager view", tone: "muted" },
    }),
  );
  const drawerHtml = renderToStaticMarkup(
    createElement(OperationalPreviewDrawer, {
      eyebrow: "Selected call",
      title: "ACME discovery",
      description: "Summary only.",
    }),
  );

  expect(toolbarHtml).toContain('data-operational-toolbar="true"');
  expect(toolbarHtml).toContain('data-operational-toolbar-density="compact"');
  expect(toolbarHtml).not.toContain("font-black");
  expect(toolbarHtml).not.toContain("tracking-[0.24em]");
  expect(drawerHtml).toContain('data-operational-preview-drawer="true"');
  expect(drawerHtml).toContain('data-operational-preview-drawer-purpose="selected-object"');
  expect(drawerHtml).not.toContain("rounded-3xl");
});
```

- [ ] **Step 4: Run the primitive test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/operational-workspace.test.tsx
```

Expected: FAIL because `data-operational-toolbar-density` and `data-operational-preview-drawer-purpose` do not exist yet.

- [ ] **Step 5: Implement the shared primitive metadata and calm labels**

Modify `apps/web/components/operational-workspace.tsx`:

- Add `data-operational-toolbar-density="compact"` to `OperationalToolbar`.
- Add `data-operational-preview-drawer-purpose="selected-object"` to `OperationalPreviewDrawer`.
- Keep existing component names and props.
- Keep visual changes small: no app shell changes, no route changes.
- Change only label classes inside these shared primitives from heavy uppercase to the existing calmer pattern:

```tsx
const operationalEyebrowClass =
  "mb-1 text-xs font-medium text-[var(--forge-muted)]";
```

Use that class for toolbar and drawer eyebrow text. Keep table header uppercase styles untouched in this task because table headers are allowed.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/backend-readability-scope.test.ts lib/operational-workspace.test.tsx lib/app-shell.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
```

Expected: all pass.

- [ ] **Step 7: Worker self-review**

Check:

- `git diff -- apps/web/components/app-shell.tsx` outputs nothing.
- `rg -n "OperationalMetricStrip" "apps/web/app/(authenticated)" || true` outputs nothing.
- No new shared primitive props require route rewrites.

- [ ] **Step 8: Commit if authorized**

```bash
git add apps/web/lib/backend-readability-scope.test.ts apps/web/lib/operational-workspace.test.tsx apps/web/components/operational-workspace.tsx
git commit -m "test: lock authenticated readability scope"
```

---

### Task 2: Settings Configuration Workspace Cleanup

**Files:**
- Create: `apps/web/components/settings/settings-readability.tsx`
- Create: `apps/web/lib/settings-readability-contract.test.ts`
- Modify: `apps/web/components/settings/settings-workbench.tsx`
- Modify: `apps/web/components/settings/account-panel.tsx`
- Modify: `apps/web/components/settings/compliance-panel.tsx`
- Modify: `apps/web/components/settings/integrations-panel.tsx`
- Modify: `apps/web/components/settings/people-panel.tsx`
- Modify: `apps/web/components/settings/teams-panel.tsx`
- Modify: `apps/web/components/settings/permissions-panel.tsx`
- Modify: `apps/web/components/settings/rubrics-panel.tsx`

- [ ] **Step 1: Write the failing settings source contract**

Create `apps/web/lib/settings-readability-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsFiles = [
  "../components/settings/account-panel.tsx",
  "../components/settings/compliance-panel.tsx",
  "../components/settings/integrations-panel.tsx",
  "../components/settings/people-panel.tsx",
  "../components/settings/teams-panel.tsx",
  "../components/settings/permissions-panel.tsx",
  "../components/settings/rubrics-panel.tsx",
];

describe("settings readability contract", () => {
  it("keeps settings panels in configuration-workspace grammar", () => {
    for (const path of settingsFiles) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");

      expect(source, path).not.toContain("font-black uppercase");
      expect(source, path).not.toContain("tracking-[0.28em]");
      expect(source, path).not.toContain("tracking-[0.3em]");
      expect(source, path).not.toContain("rounded-3xl");
      expect(source, path).not.toContain("grid-cols-3");
    }
  });

  it("uses shared settings readability primitives", () => {
    const workbench = readFileSync(
      new URL("../components/settings/settings-workbench.tsx", import.meta.url),
      "utf8",
    );
    const account = readFileSync(
      new URL("../components/settings/account-panel.tsx", import.meta.url),
      "utf8",
    );
    const people = readFileSync(
      new URL("../components/settings/people-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(workbench).toContain('data-settings-editor-workbench');
    expect(account).toContain("SettingsSectionHeader");
    expect(people).toContain("SettingsTableShell");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/settings-readability-contract.test.ts
```

Expected: FAIL on current uppercase/heavy settings styling and missing shared primitives.

- [ ] **Step 3: Create shared settings primitives**

Create `apps/web/components/settings/settings-readability.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import { ForgeChip, type ForgeTone } from "@/components/forge";

type SettingsSectionHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

type SettingsMetaRowProps = {
  label: string;
  value: ReactNode;
};

type SettingsStatusProps = {
  label: string;
  tone?: ForgeTone;
};

export function SettingsSectionHeader({
  actions,
  children,
  description,
  eyebrow,
  title,
}: SettingsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--forge-border)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium text-[var(--forge-muted)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--forge-muted)]">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SettingsMetaRow({ label, value }: SettingsMetaRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-sm text-[var(--forge-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--forge-text)]">{value}</span>
    </div>
  );
}

export function SettingsStatus({ label, tone = "muted" }: SettingsStatusProps) {
  return <ForgeChip tone={tone}>{label}</ForgeChip>;
}

export function SettingsTableShell({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.5)]",
        className,
      )}
      data-settings-table-shell="true"
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Calm the settings workbench shell**

Modify `apps/web/components/settings/settings-workbench.tsx`:

- Change `SettingsEditorPanel` from `rounded-xl` to `rounded-lg`.
- Change `SettingsEditorDrawer` from `rounded-xl` to `rounded-lg`.
- Change `SettingsDrawerGroup` label from uppercase to normal small text:

```tsx
<p className="text-xs font-medium text-[var(--forge-muted)]">{label}</p>
```

- Keep `SettingsEditorWorkbench` grid behavior unchanged.

- [ ] **Step 5: Refactor account, compliance, and integrations settings**

Modify:

- `apps/web/components/settings/account-panel.tsx`
- `apps/web/components/settings/compliance-panel.tsx`
- `apps/web/components/settings/integrations-panel.tsx`

Required changes:

- In each file, import only the primitives used from `./settings-readability`.
- Replace every settings-only label class containing `font-black uppercase` with `text-xs font-medium text-[var(--forge-muted)]`.
- Replace every settings-only label class containing `tracking-[0.28em]`, `tracking-[0.24em]`, `tracking-[0.22em]`, or `tracking-[0.2em]` with no tracking utility.
- Replace every settings-only `rounded-3xl` with `rounded-lg`.
- In `account-panel.tsx`, wrap the account summary header with `SettingsSectionHeader` and convert organization/account facts to `SettingsMetaRow`.
- In `compliance-panel.tsx`, wrap each compliance section title with `SettingsSectionHeader` and keep existing toggles/forms in place.
- In `integrations-panel.tsx`, replace connection status labels with `SettingsStatus` and keep existing connect/disconnect actions in their current section.
- Keep all forms, actions, ids, names, and submit behavior unchanged.
- Keep destructive/warning states visually distinct with existing semantic tones.

- [ ] **Step 6: Refactor people, teams, and permissions settings**

Modify:

- `apps/web/components/settings/people-panel.tsx`
- `apps/web/components/settings/teams-panel.tsx`
- `apps/web/components/settings/permissions-panel.tsx`

Required changes:

- In each file, import `SettingsTableShell` from `./settings-readability`.
- Wrap the primary table container in `SettingsTableShell`.
- Replace every settings-only label class containing `font-black uppercase` with `text-xs font-medium text-[var(--forge-muted)]`.
- Replace every settings-only label class containing `tracking-[0.28em]`, `tracking-[0.24em]`, `tracking-[0.22em]`, or `tracking-[0.2em]` with no tracking utility.
- Replace every settings-only `rounded-3xl` with `rounded-lg`.
- Preserve all existing table columns and row actions.
- Do not move actions into navigation.
- Keep invite, manage, role, and permission flows reachable exactly where they are.

- [ ] **Step 7: Refactor rubrics settings last**

Modify `apps/web/components/settings/rubrics-panel.tsx`.

Required changes:

- Preserve builder behavior and all rubric actions.
- Import `SettingsSectionHeader`, `SettingsMetaRow`, and `SettingsTableShell` from `./settings-readability`.
- Replace every rubrics-only label class containing `font-black uppercase` with `text-xs font-medium text-[var(--forge-muted)]`.
- Replace every rubrics-only label class containing `tracking-[0.3em]`, `tracking-[0.28em]`, `tracking-[0.24em]`, `tracking-[0.22em]`, or `tracking-[0.2em]` with no tracking utility.
- Replace every rubrics-only `rounded-3xl` with `rounded-lg`.
- Wrap rubric list/table containers in `SettingsTableShell`.
- Use `SettingsSectionHeader` for the active rubric editor header and builder section headers.
- Keep rubric matrices/tables as the primary object.
- Do not change rubric data structures or save actions.

- [ ] **Step 8: Run focused settings tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/settings-readability-contract.test.ts lib/settings-nav.test.tsx
npm run typecheck -w @argos-v2/web
git diff --check
```

Expected: all pass.

- [ ] **Step 9: Worker self-review**

Check:

```bash
rg -n "font-black uppercase|tracking-\\[0\\.28em\\]|tracking-\\[0\\.3em\\]|rounded-3xl" apps/web/components/settings || true
```

Expected: no output, or only justified exceptions in table headers that the test explicitly allows.

- [ ] **Step 10: Commit if authorized**

```bash
git add apps/web/components/settings apps/web/lib/settings-readability-contract.test.ts apps/web/lib/settings-nav.test.tsx
git commit -m "refactor: simplify settings readability"
```

---

### Task 3: Roleplay Practice Workspace Simplification

**Files:**
- Modify: `apps/web/components/roleplay-panel.tsx`
- Modify: `apps/web/lib/roleplay-panel.test.ts`
- Create: `apps/web/lib/roleplay-readability-contract.test.ts`

- [ ] **Step 1: Write the failing roleplay readability contract**

Create `apps/web/lib/roleplay-readability-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("roleplay readability contract", () => {
  it("keeps roleplay in a simple practice workspace grammar", () => {
    const source = readFileSync(
      new URL("../components/roleplay-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-roleplay-workspace="simple-practice"');
    expect(source).toContain('data-roleplay-transcript="simple-log"');
    expect(source).toContain('data-roleplay-scenario-list="true"');
    expect(source).not.toContain("backdropFilter");
    expect(source).not.toContain("blur(12px)");
    expect(source).not.toContain("font-black uppercase");
    expect(source).not.toContain("tracking-[0.2em]");
    expect(source).not.toContain("tracking-widest");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/roleplay-readability-contract.test.ts
```

Expected: FAIL because roleplay still has the old visual density markers.

- [ ] **Step 3: Update existing render test expectations**

Modify `apps/web/lib/roleplay-panel.test.ts`:

- Replace expectations for `data-roleplay-workspace="practice-workbench"` with `data-roleplay-workspace="simple-practice"`.
- Replace expectations for `data-roleplay-transcript="responsive"` with `data-roleplay-transcript="simple-log"`.
- Keep behavior assertions for voice, transcript persistence, scoring, generated-from-call, and no embedded history.
- Add assertions:

```ts
expect(html).toContain('data-roleplay-scenario-list="true"');
expect(html).toContain('data-roleplay-primary-action="start-simulation"');
expect(html).not.toContain("Practice mode");
expect(html).not.toContain("Text entry always available");
expect(html).not.toContain("Generated from call</span><span");
```

- [ ] **Step 4: Simplify scenario picker**

Modify the scenario section in `apps/web/components/roleplay-panel.tsx`:

- Change the workspace marker to `data-roleplay-workspace="simple-practice"`.
- Change persona cards into compact rows inside one list container:

```tsx
<div className="mt-3 divide-y divide-[var(--forge-border)] overflow-hidden rounded-lg border border-[var(--forge-border)]" data-roleplay-scenario-list="true">
  {personas.map((persona) => {
    const isSelected = persona.id === selectedPersonaId;
    return (
      <button
        aria-pressed={isSelected}
        className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
          isSelected
            ? "bg-[rgba(241,191,123,0.09)] text-[var(--forge-text)]"
            : "bg-[rgba(12,11,10,0.34)] hover:bg-[rgba(255,244,230,0.04)]"
        }`}
        key={persona.id}
        onClick={() => setSelectedPersonaId(persona.id)}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--forge-border)] text-sm font-semibold text-[var(--forge-muted)]">
          {persona.avatarInitials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{persona.name}</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--forge-muted)]">
            {persona.role}, {persona.company}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--forge-muted)]">
            {persona.description}
          </span>
        </span>
      </button>
    );
  })}
</div>
```

- Keep the create session action and disabled logic unchanged.
- Add `data-roleplay-primary-action="start-simulation"` to the start button.

- [ ] **Step 5: Simplify practice mode and transcript styling**

Modify the practice section:

- Remove the `Practice mode` label and `Text entry always available` badge.
- Keep voice and text actions.
- Replace transcript inline style and blur with plain product surface:

```tsx
<div
  aria-label="Roleplay transcript"
  aria-live="polite"
  aria-relevant="additions text"
  className="mb-5 flex min-h-[320px] max-h-[min(64vh,620px)] flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.52)] p-4"
  data-roleplay-transcript="simple-log"
  role="log"
  tabIndex={0}
>
```

- Preserve message mapping, Listen buttons, voice controls, response textarea, send action, and scoring action.

- [ ] **Step 6: Calm generated-from-call and score drawer labels**

In `apps/web/components/roleplay-panel.tsx`:

- Replace `font-black uppercase tracking...` generated-from-call labels with normal `ForgeChip` or text.
- Keep `data-roleplay-score-drawer=""` and `OperationalPreviewDrawer` behavior.
- Do not remove scorecard content.

- [ ] **Step 7: Run roleplay tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/roleplay-readability-contract.test.ts lib/roleplay-panel.test.ts lib/remaining-route-readability.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
```

Expected: all pass.

- [ ] **Step 8: Commit if authorized**

```bash
git add apps/web/components/roleplay-panel.tsx apps/web/lib/roleplay-panel.test.ts apps/web/lib/roleplay-readability-contract.test.ts
git commit -m "refactor: simplify roleplay practice workspace"
```

---

### Task 4: Call Detail Transcript And Evidence Workbench

**Files:**
- Modify: `apps/web/components/call-detail-panel.tsx`
- Modify: `apps/web/app/(authenticated)/calls/[id]/page.tsx`
- Modify: `apps/web/lib/call-detail-panel.test.tsx`
- Modify: `apps/web/lib/call-detail-page-forge.test.ts`
- Create: `apps/web/lib/call-detail-readability-contract.test.ts`

- [ ] **Step 1: Write the failing call detail source contract**

Create `apps/web/lib/call-detail-readability-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("call detail readability contract", () => {
  it("uses a transcript and evidence workbench instead of tabbed dashboard chrome", () => {
    const source = readFileSync(
      new URL("../components/call-detail-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-call-detail-workbench="transcript-evidence"');
    expect(source).toContain('data-call-transcript-primary="true"');
    expect(source).toContain('data-call-evidence-panel="true"');
    expect(source).toContain('data-call-coaching-pane="true"');
    expect(source).not.toContain("ForgeSegmentedTabs");
    expect(source).not.toContain("ForgeSegmentedTab");
    expect(source).not.toContain("activeWorkbenchTab");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/call-detail-readability-contract.test.ts
```

Expected: FAIL because the current panel still uses tabbed workbench state.

- [ ] **Step 3: Update call detail render tests**

Modify `apps/web/lib/call-detail-panel.test.tsx`:

- Keep existing behavior tests for roleplay generation, busy states, highlight/note controls, and processing job retry.
- Add assertions to the render test:

```ts
expect(html).toContain('data-call-detail-workbench="transcript-evidence"');
expect(html).toContain('data-call-transcript-primary="true"');
expect(html).toContain('data-call-evidence-panel="true"');
expect(html).toContain('data-call-coaching-pane="true"');
expect(html).not.toContain('aria-label="Workbench"');
expect(html).not.toContain(">Summary</span>");
expect(html).not.toContain(">Notes</span>");
```

Modify `apps/web/lib/call-detail-page-forge.test.ts` to keep route-level assertions:

```ts
expect(source).toContain('data-call-detail-route="review-bench"');
expect(source).toContain("CallDetailPanel");
expect(source).not.toContain("OperationalMetricStrip");
```

- [ ] **Step 4: Remove tabbed workbench state**

Modify `apps/web/components/call-detail-panel.tsx`:

- Remove imports for `ForgeSegmentedTab` and `ForgeSegmentedTabs`.
- Remove `activeWorkbenchTab` state.
- Remove tab rendering.
- Keep all action functions and fetch calls unchanged.

- [ ] **Step 5: Build a fixed transcript/evidence layout**

Replace the old tabbed workbench JSX with this exact route shape:

```tsx
<div
  className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]"
  data-call-detail-workbench="transcript-evidence"
>
  <main className="min-w-0 space-y-3">
    {renderTranscriptSection()}
    {renderEvidenceSection()}
  </main>
  {renderCoachingPane()}
</div>
```

Add these local helper functions inside `CallDetailPanel` before the `return` statement:

```tsx
function renderTranscriptSection() {
  const transcriptLines = call.transcript ?? [];

  return (
    <section
      className="overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.52)]"
      data-call-transcript-primary="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--forge-text)]">Transcript</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
            Speaker turns and timestamps from this call.
          </p>
        </div>
        <ForgeChip tone="muted">{transcriptLines.length} lines</ForgeChip>
      </div>
      {transcriptLines.length ? (
        <div className="max-h-[520px] divide-y divide-[var(--forge-border)] overflow-y-auto">
          {transcriptLines.map((line, index) => {
            const speakerInitials = initials(line.speaker);

            return (
              <div
                className="flex gap-3 px-4 py-3"
                key={`${line.timestampSeconds}-${line.speaker}-${index}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-xs font-semibold text-[var(--forge-cyan)]">
                  {speakerInitials}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--forge-text)]">{line.speaker}</span>
                    <span className="text-xs text-[var(--forge-muted)]">
                      {formatTimestamp(line.timestampSeconds)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">{line.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4">
          <ForgeEmptyState
            description="No transcript lines are available yet."
            icon="edit_note"
            title="Transcript pending"
          />
        </div>
      )}
    </section>
  );
}
```

Add `renderEvidenceSection()` with this wrapper and move the existing `moments.map((moment) => { ... })` return block into `renderMomentCard(moment)` without changing its action logic:

```tsx
function renderEvidenceSection() {
  return (
    <section
      className="overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.42)]"
      data-call-evidence-panel="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--forge-text)]">Evidence</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
            Coaching moments, highlights, strengths, and improvement areas.
          </p>
        </div>
        <ForgeChip tone={moments.length ? "gold" : "muted"}>
          {moments.length} moments
        </ForgeChip>
      </div>
      <div className="space-y-3 p-4">
        {moments.length ? (
          moments.map((moment) => renderMomentCard(moment))
        ) : (
          <ForgeEmptyState
            description="No moments were generated for this call yet."
            icon="insights"
            title="No moments yet"
          />
        )}
        <SummaryList empty="No strengths generated yet." items={call.strengths ?? []} title="Strengths" />
        <SummaryList empty="No improvement areas generated yet." items={call.improvements ?? []} title="Improvement Areas" />
        <SummaryList empty="No drills recommended yet." items={call.recommendedDrills ?? []} title="Recommended Drills" />
      </div>
    </section>
  );
}
```

Add `renderCoachingPane()` with this wrapper and move these existing blocks into it without changing behavior: media state panel, processing job panel, Generate Roleplay action, coaching note form, and annotation list.

```tsx
function renderCoachingPane() {
  return (
    <aside
      className="rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.48)] p-3 xl:sticky xl:top-20 xl:self-start"
      data-call-coaching-pane="true"
    >
      <h2 className="text-base font-semibold text-[var(--forge-text)]">Coaching action</h2>
      <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
        Review readiness, create practice, and leave one coaching note.
      </p>
      <div className="mt-3 space-y-3">
        {renderMediaStatePanel()}
        {processingJob ? renderProcessingJobPanel() : null}
        {call.status === "complete" ? renderGenerateRoleplayAction() : null}
        {renderCoachingNoteForm()}
        {renderAnnotationList()}
      </div>
    </aside>
  );
}
```

Create the wrapper helpers named above by moving existing JSX and action handlers. Do not change API endpoints, request payloads, state variables, or permission conditions.

- [ ] **Step 6: Move coaching actions into the right pane**

Inside `data-call-coaching-pane="true"`:

- Show media/processing status.
- Show Generate Roleplay only when current behavior allows it.
- Show processing retry only when current behavior allows it.
- Keep the coaching note form with existing `id="call-coaching-note"` and helper text.
- Do not duplicate full transcript or full evidence content in the pane.

- [ ] **Step 7: Run call detail tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/call-detail-readability-contract.test.ts lib/call-detail-panel.test.tsx lib/call-detail-page-forge.test.ts lib/generate-roleplay-route.test.ts lib/roleplay/generate-from-call.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
```

Expected: all pass.

- [ ] **Step 8: Commit if authorized**

```bash
git add apps/web/components/call-detail-panel.tsx 'apps/web/app/(authenticated)/calls/[id]/page.tsx' apps/web/lib/call-detail-panel.test.tsx apps/web/lib/call-detail-page-forge.test.ts apps/web/lib/call-detail-readability-contract.test.ts
git commit -m "refactor: simplify call detail workbench"
```

---

### Task 5: Drawer, Table, And Empty State Discipline Across Remaining Routes

**Files:**
- Modify: `apps/web/app/(authenticated)/notifications/page.tsx`
- Modify: `apps/web/app/(authenticated)/upload/page.tsx`
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
- Modify: `apps/web/app/(authenticated)/leaderboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/training/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/roleplay/history/page.tsx`
- Modify: `apps/web/app/(authenticated)/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/team/[repId]/page.tsx`
- Modify: `apps/web/lib/focused-route-readability.test.ts`
- Modify: `apps/web/lib/coaching-team-readability.test.ts`
- Modify: `apps/web/lib/remaining-route-readability.test.ts`
- Modify: `apps/web/lib/primary-route-hero-removal.test.ts`

- [ ] **Step 1: Write failing route discipline assertions**

Update `apps/web/lib/focused-route-readability.test.ts`:

```ts
it("keeps upload and notifications from using always-on preview drawers", () => {
  const upload = readFileSync(new URL("../app/(authenticated)/upload/page.tsx", import.meta.url), "utf8");
  const notifications = readFileSync(new URL("../app/(authenticated)/notifications/page.tsx", import.meta.url), "utf8");

  expect(upload).not.toContain("OperationalPreviewDrawer");
  expect(notifications).toContain("selectedNotification");
  expect(notifications).not.toContain("selected?.link");
});
```

Update `apps/web/lib/remaining-route-readability.test.ts`:

```ts
it("keeps table routes table-first with selected-object drawer semantics", () => {
  const leaderboard = readFileSync(new URL("../app/(authenticated)/leaderboard/page.tsx", import.meta.url), "utf8");
  const history = readFileSync(new URL("../app/(authenticated)/roleplay/history/page.tsx", import.meta.url), "utf8");
  const trainingTeam = readFileSync(new URL("../app/(authenticated)/training/team/page.tsx", import.meta.url), "utf8");

  expect(leaderboard).toContain('data-forge-table="true"');
  expect(history).toContain('data-forge-table="true"');
  expect(trainingTeam).toContain('data-forge-table="true"');
  expect(leaderboard).toContain('data-selected-object-drawer="true"');
  expect(history).toContain('data-selected-object-drawer="true"');
  expect(trainingTeam).toContain('data-selected-object-drawer="true"');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -w @argos-v2/web -- lib/focused-route-readability.test.ts lib/remaining-route-readability.test.ts
```

Expected: FAIL on upload drawer and missing selected-object drawer markers.

- [ ] **Step 3: Remove always-on upload drawer**

Modify `apps/web/app/(authenticated)/upload/page.tsx`:

- Remove `OperationalPreviewDrawer` import and JSX.
- Keep `UploadCallPanel` as the primary object.
- Keep route marker `data-upload-route="capture-workflow"`.
- If context text is needed, put one short sentence in `OperationalToolbar.description`, not a drawer.

- [ ] **Step 4: Rename notifications selected state for clarity**

Modify `apps/web/app/(authenticated)/notifications/page.tsx`:

- Rename local selected variable from `selected` to `selectedNotification`.
- Only show drawer content if `selectedNotification` exists.
- Keep `NotificationsPanel`, unread count, and link behavior unchanged.
- Add `data-selected-object-drawer="true"` to the selected notification drawer if it remains.

- [ ] **Step 5: Add selected-object markers to table routes**

Modify:

- `apps/web/app/(authenticated)/leaderboard/page.tsx`
- `apps/web/app/(authenticated)/roleplay/history/page.tsx`
- `apps/web/app/(authenticated)/training/team/page.tsx`
- `apps/web/app/(authenticated)/highlights/page.tsx`
- `apps/web/app/(authenticated)/team/page.tsx`
- `apps/web/app/(authenticated)/team/[repId]/page.tsx`

Required changes:

- Keep tables/lists as primary object.
- Add `data-selected-object-drawer="true"` to drawers that summarize a selected row/object.
- Remove drawers that only repeat static page-level information.
- Do not remove row actions or source-call/profile links.

- [ ] **Step 6: Standardize route empty-state copy**

Apply this exact copy where the matching route renders an empty state. If a file does not render an empty state, do not add a new one.

- `apps/web/app/(authenticated)/highlights/page.tsx`

```tsx
<ForgeEmptyState
  description="Saved coaching moments from scored calls will appear here."
  title="No highlights yet"
/>
```

- `apps/web/app/(authenticated)/leaderboard/page.tsx`

```tsx
<ForgeEmptyState
  description="Scored calls will populate rankings once reps have activity."
  title="No leaderboard data"
/>
```

- `apps/web/app/(authenticated)/roleplay/history/page.tsx`

```tsx
<ForgeEmptyState
  description="Completed practice sessions will appear here."
  title="No roleplay sessions"
/>
```

- `apps/web/app/(authenticated)/training/team/page.tsx`

```tsx
<ForgeEmptyState
  description="Assigned lessons will appear here once reps start training."
  title="No team training progress"
/>
```

- `apps/web/app/(authenticated)/team/page.tsx`

```tsx
<ForgeEmptyState
  description="Invite reps or connect team data to begin coaching review."
  title="No reps yet"
/>
```

- `apps/web/app/(authenticated)/team/[repId]/page.tsx`

```tsx
<ForgeEmptyState
  description="Scored calls and coaching moments for this rep will appear here."
  title="No rep evidence yet"
/>
```

- `apps/web/app/(authenticated)/notifications/page.tsx`

Use the existing `NotificationsPanel` empty state if it already owns this copy. The route wrapper must not add a second empty state.

- [ ] **Step 7: Run route discipline tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/focused-route-readability.test.ts lib/coaching-team-readability.test.ts lib/remaining-route-readability.test.ts lib/primary-route-hero-removal.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
```

Expected: all pass.

- [ ] **Step 8: Commit if authorized**

```bash
git add 'apps/web/app/(authenticated)' apps/web/lib/focused-route-readability.test.ts apps/web/lib/coaching-team-readability.test.ts apps/web/lib/remaining-route-readability.test.ts apps/web/lib/primary-route-hero-removal.test.ts
git commit -m "refactor: tighten route drawer and table readability"
```

---

### Task 6: Mobile And Browser Readability Verification

**Files:**
- Modify: `docs/design/authenticated-readability-audit-2026-06-15.md`
- Modify: `docs/design/authenticated-forge-ux-audit.md`
- Optional create: `docs/design/authenticated-page-readability-verification-2026-06-15.md`

- [ ] **Step 1: Run final source tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/backend-readability-scope.test.ts lib/focused-route-readability.test.ts lib/coaching-team-readability.test.ts lib/remaining-route-readability.test.ts lib/primary-route-hero-removal.test.ts lib/call-detail-page-forge.test.ts lib/call-detail-panel.test.tsx lib/call-detail-readability-contract.test.ts lib/roleplay-panel.test.ts lib/roleplay-readability-contract.test.ts lib/settings-nav.test.tsx lib/settings-readability-contract.test.ts lib/authenticated-typography-contract.test.tsx lib/operational-workspace.test.tsx lib/app-shell.test.ts
npm run typecheck -w @argos-v2/web
git diff --check
rg -n "OperationalMetricStrip" "apps/web/app/(authenticated)" || true
```

Expected:

- Test command passes.
- Typecheck passes.
- `git diff --check` has no output.
- `rg` command has no output.

- [ ] **Step 2: Start or reuse local dev server**

Check port 3000:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
```

If no server is running:

```bash
npm run dev -w @argos-v2/web -- --hostname 127.0.0.1 --port 3000
```

Expected: app is reachable at `http://127.0.0.1:3000`.

- [ ] **Step 3: Browser smoke with authenticated session**

Use the in-app browser if session exists. Check:

- `/dashboard`
- `/settings`
- `/settings/people`
- `/settings/rubric`
- `/roleplay`
- `/calls`
- one `/calls/[id]` route if a seeded call id is available
- `/team`
- `/leaderboard`

For each page verify:

- Existing primary navigation is unchanged.
- The first viewport shows one primary work object.
- No decorative metric strip appears.
- No fake controls appear.
- Text does not overflow at desktop width.
- At mobile width, primary actions wrap and tables become readable cards or intentionally scrollable tables.

- [ ] **Step 4: Document browser results**

Create or update `docs/design/authenticated-page-readability-verification-2026-06-15.md` with:

```md
# Authenticated Page Readability Verification - 2026-06-15

## Scope

Navigation unchanged. Page readability optimized across settings, roleplay, call detail, and remaining authenticated routes.

## Automated Verification

- Focused route tests: PASS
- Settings readability tests: PASS
- Roleplay readability tests: PASS
- Call detail readability tests: PASS
- Typecheck: PASS
- git diff --check: PASS

## Browser Verification

- Dashboard:
- Settings:
- Roleplay:
- Call Detail:
- Calls:
- Team:
- Leaderboard:

## Auth Notes

If browser redirected to login, record the exact URL and state that visual smoke requires an authenticated session.
```

Fill every bullet with PASS, FAIL, or BLOCKED plus one sentence of evidence. Do not leave blank bullets.

- [ ] **Step 5: Final reviewer subagent**

Dispatch a final review subagent with:

- This plan.
- The final `git diff --stat`.
- The verification output.
- The browser verification doc.

Reviewer must answer:

- Did any task change navigation?
- Do settings, roleplay, and call detail match the page-readability goal?
- Are tests aligned with the clarified scope?
- Are there unverified browser or auth blockers?

- [ ] **Step 6: Commit if authorized**

```bash
git add docs/design/authenticated-page-readability-verification-2026-06-15.md docs/design/authenticated-readability-audit-2026-06-15.md docs/design/authenticated-forge-ux-audit.md
git commit -m "docs: verify authenticated readability pass"
```

---

## Self-Review

### Spec coverage

- Settings cleanup is covered by Task 2.
- Roleplay simplification is covered by Task 3.
- Call detail workbench is covered by Task 4.
- Drawer, table, and empty-state discipline is covered by Task 5.
- Navigation preservation is covered by Task 1 and every task's read-only scope.
- Final automated and browser verification is covered by Task 6.

### Placeholder scan

This plan intentionally avoids placeholder instructions and open-ended test requests. Each task lists file ownership, test additions, commands, and expected results.

### Type and scope consistency

- New tests use workspace-relative Vitest paths under `@argos-v2/web`.
- New data attributes are specific and stable:
  - `data-operational-toolbar-density="compact"`
  - `data-operational-preview-drawer-purpose="selected-object"`
  - `data-settings-table-shell="true"`
  - `data-roleplay-workspace="simple-practice"`
  - `data-roleplay-transcript="simple-log"`
  - `data-call-detail-workbench="transcript-evidence"`
  - `data-selected-object-drawer="true"`
- No task edits auth, schema, repositories, data services, or app navigation.

## Execution Handoff

Plan complete. Recommended execution mode is **Subagent-Driven**:

1. Main agent extracts one task at a time.
2. Fresh worker implements only that task's file scope.
3. Fresh spec reviewer checks scope and requirements.
4. Fresh code-quality reviewer checks maintainability and regression risk.
5. Main agent runs the focused tests and resolves integration before moving to the next task.
