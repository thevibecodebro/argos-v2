# HighLevel-Inspired Authenticated Argos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Argos authenticated pages into a HighLevel-class business operating system while keeping the forge visual language and existing workflows.

**Architecture:** Build the shared workspace architecture first: primary module rail, top command strip, settings control room, page headers, ledger/action primitives, and widget surfaces. Then apply those primitives to the highest-impact routes without changing data services, routes, auth, or product language.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind utility classes, CSS variables in `apps/web/app/globals.css`, Vitest rendering tests.

---

### Task 1: Shell IA and Workspace Context

**Files:**
- Modify: `apps/web/components/app-shell.tsx`
- Modify: `apps/web/lib/app-shell.test.ts`

- [ ] **Step 1: Update shell test expectations**

Add assertions that the shell exposes HighLevel-style groups and workspace context:

```ts
expect(html).toContain("Review");
expect(html).toContain("Coach");
expect(html).toContain("People");
expect(html).toContain("System");
expect(html).toContain("Workspace scope");
expect(html).toContain("Manager view");
```

- [ ] **Step 2: Run the focused shell test**

Run: `npm run test:web -- apps/web/lib/app-shell.test.ts`

Expected before implementation: test fails on the new group/context assertions.

- [ ] **Step 3: Update primary shell navigation**

In `apps/web/components/app-shell.tsx`, replace the current `standaloneRoutes` plus old groups with four module groups:

```ts
const navGroups: NavGroup[] = [
  {
    label: "Review",
    icon: "query_stats",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/calls", label: "Calls", icon: "library_books" },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome" },
    ],
  },
  {
    label: "Coach",
    icon: "psychology",
    items: [
      { href: "/training", label: "Training", icon: "school" },
      { href: "/roleplay", label: "Roleplay", icon: "psychology" },
    ],
  },
  {
    label: "People",
    icon: "group",
    visibleTo: ["manager", "executive", "admin"],
    items: [
      { href: "/team", label: "Team", icon: "group" },
      { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
    ],
  },
  {
    label: "System",
    icon: "settings",
    items: [
      { href: "/notifications", label: "Notifications", icon: "notifications" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];
```

Remove `standaloneRoutes` and remove the separate bottom settings link. Add a workspace scope card beneath the Argos brand showing org name and role label.

- [ ] **Step 4: Run focused shell test again**

Run: `npm run test:web -- apps/web/lib/app-shell.test.ts`

Expected: pass.

### Task 2: Settings Control Room Navigation

**Files:**
- Modify: `apps/web/components/settings/settings-nav.tsx`
- Modify: `apps/web/app/(authenticated)/settings/layout.tsx`
- Modify: `apps/web/lib/settings-nav.test.tsx`

- [ ] **Step 1: Update settings nav test expectations**

Add assertions for grouped settings sections:

```ts
expect(html).toContain("Workspace");
expect(html).toContain("People");
expect(html).toContain("Coaching system");
```

- [ ] **Step 2: Run focused settings nav test**

Run: `npm run test:web -- apps/web/lib/settings-nav.test.tsx`

Expected before implementation: test fails on missing group labels.

- [ ] **Step 3: Group settings navigation**

In `settings-nav.tsx`, replace the flat `NAV_ITEMS` with grouped settings sections:

```ts
const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/settings", label: "Account", icon: "person" },
      { href: "/settings/integrations", label: "Integrations", icon: "power", visibleTo: ["admin"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/settings/people", label: "People", icon: "group", visibleTo: ["admin"] },
      { href: "/settings/teams", label: "Teams", icon: "groups", visibleTo: ["admin"] },
      { href: "/settings/permissions", label: "Permissions", icon: "lock", visibleTo: ["admin"] },
    ],
  },
  {
    label: "Coaching system",
    items: [
      { href: "/settings/rubric", label: "Rubrics", icon: "grading", visibleTo: ["admin"] },
      { href: "/settings/compliance", label: "Compliance", icon: "verified_user", visibleTo: ["admin"] },
    ],
  },
] satisfies SettingsNavGroup[];
```

Render each visible group only when at least one item is visible.

- [ ] **Step 4: Strengthen settings layout**

In `settings/layout.tsx`, make the settings rail feel like a control-room rail:

```tsx
<aside className="shrink-0 border-b border-[var(--forge-border)] bg-[rgba(5,4,3,0.56)] px-4 py-3 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
  <div className="mb-5 hidden rounded-[1.35rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-4 lg:block">
    <p className="forge-page-eyebrow">Settings</p>
    <h2 className="mt-2 text-lg font-semibold text-[var(--forge-text)]">Control room</h2>
    <p className="mt-2 text-xs leading-5 text-[var(--forge-muted)]">Workspace, people, and coaching-system configuration.</p>
  </div>
  <SettingsNav role={role} />
</aside>
```

- [ ] **Step 5: Run focused settings nav test again**

Run: `npm run test:web -- apps/web/lib/settings-nav.test.tsx`

Expected: pass.

### Task 3: Shared Forge Primitives for HighLevel-Style Workspaces

**Files:**
- Modify: `apps/web/components/forge.tsx`
- Modify: `apps/web/lib/forge-primitives.test.tsx`

- [ ] **Step 1: Add primitive test coverage**

Extend `forge-primitives.test.tsx` to render `ForgeWidget`, `ForgeSettingsGroup`, and `ForgeSidePanelShell` with assertions:

```ts
expect(html).toContain('data-forge-widget="true"');
expect(html).toContain('data-forge-settings-group="true"');
expect(html).toContain('data-forge-side-panel="true"');
```

- [ ] **Step 2: Run focused primitive test**

Run: `npm run test:web -- apps/web/lib/forge-primitives.test.tsx`

Expected before implementation: test fails because these exports do not exist.

- [ ] **Step 3: Implement new primitives**

Add:

```tsx
export function ForgeWidget({ children, className, eyebrow, title, action }: ForgeWidgetProps) {
  return (
    <ForgeSurface className={cn("p-5", className)} data-forge-widget="true">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="forge-page-eyebrow">{eyebrow}</p> : null}
          <h3 className="mt-1 font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]">{title}</h3>
        </div>
        {action ? <ForgeButton href={action.href} size="sm" variant="ghost">{action.label}</ForgeButton> : null}
      </div>
      {children}
    </ForgeSurface>
  );
}

export function ForgeSettingsGroup({ children, className, description, title }: ForgeSettingsGroupProps) {
  return (
    <ForgeSurface className={cn("p-5 sm:p-6", className)} data-forge-settings-group="true">
      <div className="mb-5">
        <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">{description}</p> : null}
      </div>
      {children}
    </ForgeSurface>
  );
}

export function ForgeSidePanelShell({ children, className, title, description }: ForgeSidePanelShellProps) {
  return (
    <aside className={cn("forge-side-panel-shell", className)} data-forge-side-panel="true">
      <div className="border-b border-[var(--forge-border)] px-5 py-4">
        <h3 className="font-[var(--font-display)] text-base font-semibold text-[var(--forge-text)]">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}
```

- [ ] **Step 4: Add CSS for side panel shell**

In `apps/web/app/globals.css`, add `.forge-side-panel-shell` beside other forge primitives:

```css
.forge-side-panel-shell {
  border: 1px solid var(--forge-border);
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgba(23, 16, 12, 0.96), rgba(13, 9, 7, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 244, 230, 0.06);
}
```

- [ ] **Step 5: Run primitive test again**

Run: `npm run test:web -- apps/web/lib/forge-primitives.test.tsx`

Expected: pass.

### Task 4: Settings Overview as Control Room

**Files:**
- Modify: `apps/web/app/(authenticated)/settings/page.tsx`
- Modify: `apps/web/components/settings/account-panel.tsx`

- [ ] **Step 1: Replace hidden settings header**

Remove `headerMode="hidden"` from `/settings`. Use a visible header:

```tsx
<PageFrame
  description="Control account details, people, teams, integrations, compliance, and the scoring rubric from one workspace."
  eyebrow="Settings"
  title="Control room"
>
```

- [ ] **Step 2: Add settings overview links above account panel**

Render a small overview grid using `ForgeSettingsGroup` or `ForgeSurface` linking to the existing child routes. Use only existing settings routes:

```tsx
const settingsSections = [
  { href: "/settings/people", title: "People", description: "Manage user records and access." },
  { href: "/settings/teams", title: "Teams", description: "Configure team structure and manager assignment." },
  { href: "/settings/permissions", title: "Permissions", description: "Review role scopes and access controls." },
  { href: "/settings/integrations", title: "Integrations", description: "Connect and manage supported providers." },
  { href: "/settings/rubric", title: "Rubrics", description: "Tune the scoring system used on reviewed calls." },
  { href: "/settings/compliance", title: "Compliance", description: "Review consent and operational safeguards." },
];
```

Only show admin-only links for admin users.

- [ ] **Step 3: Verify settings route compiles through typecheck**

Run: `npm run typecheck:web`

Expected: no TypeScript errors.

### Task 5: Dashboard Operating System

**Files:**
- Modify: `apps/web/app/(authenticated)/dashboard/page.tsx`

- [ ] **Step 1: Replace marketing-like dashboard CTA blocks**

Use `ForgeWidget`, `ForgeMetric`, `ForgeButton`, and `ForgeActionBar` from `@/components/forge`.

For manager/executive views, render:

- Operating pulse widget with actions: `/team`, `/leaderboard`, `/upload`.
- Setup health widget.
- Metrics widget row.
- Rep performance ledger.
- Leaderboard rank ledgers.

- [ ] **Step 2: Remove legacy blue-ish text classes in dashboard**

Replace direct `#ecedf6`, `#a9abb3`, `rounded-xl` CTA panels, and gradient button classes with forge primitives and forge tokens.

- [ ] **Step 3: Run dashboard-related tests**

Run: `npm run test:web -- apps/web/lib/primary-route-hero-removal.test.ts apps/web/lib/authenticated-forge-token-coverage.test.ts`

Expected: pass.

### Task 6: Visible Headers and Route Control Bars

**Files:**
- Modify: `apps/web/app/(authenticated)/leaderboard/page.tsx`
- Modify: `apps/web/app/(authenticated)/team/page.tsx`
- Modify: `apps/web/app/(authenticated)/training/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/people/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/teams/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/permissions/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/compliance/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/integrations/page.tsx`
- Modify: `apps/web/app/(authenticated)/settings/rubric/page.tsx`

- [ ] **Step 1: Remove hidden headers from primary routes**

Remove `headerMode="hidden"` from the listed routes unless the child component already renders a top-level page header with matching title and description.

- [ ] **Step 2: Align route descriptions with approved product language**

Use concise operational descriptions:

```tsx
description="Review team performance, coaching focus, and rep-level score movement."
description="Manage users, invitations, and account access."
description="Configure teams and manager assignments."
description="Review role scopes and permission boundaries."
description="Manage consent, retention, and coaching safeguards."
description="Connect and monitor supported providers."
description="Configure the scoring rubric used across reviewed calls."
```

- [ ] **Step 3: Run page-frame tests**

Run: `npm run test:web -- apps/web/lib/page-frame.test.tsx apps/web/lib/primary-route-hero-removal.test.ts`

Expected: pass.

### Task 7: Full Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck:web`

Expected: pass.

- [ ] **Step 2: Run web tests**

Run: `npm run test:web`

Expected: pass.

- [ ] **Step 3: Run production build**

Run: `npm run build -w @argos-v2/web`

Expected: pass.

- [ ] **Step 4: Run diff whitespace check**

Run: `git diff --check`

Expected: no output.
