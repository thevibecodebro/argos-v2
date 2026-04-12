# Settings IA Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single monolithic settings page into six scoped sub-pages (Account, People, Teams, Permissions, Integrations, Compliance) with a persistent left secondary nav, keeping the main app sidebar unchanged.

**Architecture:** Introduce a `settings` route group layout that renders a two-column grid — 192px sticky left nav + flex-1 content area — wrapping all `/settings/*` routes. Each sub-page becomes a focused Next.js server component that fetches only its own data. The existing `SettingsWorkspacePanel` is decomposed into per-page client components. No new libraries needed.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, `@argos-v2/ui`, existing service layer (unchanged)

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `apps/web/app/(authenticated)/settings/layout.tsx` | Settings shell: two-column grid with sticky left nav |
| `apps/web/components/settings/settings-nav.tsx` | Left nav link list, `usePathname` active state |
| `apps/web/app/(authenticated)/settings/people/page.tsx` | Members + Invites server page |
| `apps/web/app/(authenticated)/settings/teams/page.tsx` | Teams server page |
| `apps/web/app/(authenticated)/settings/permissions/page.tsx` | Permission presets server page |
| `apps/web/app/(authenticated)/settings/integrations/page.tsx` | Integrations server page |
| `apps/web/app/(authenticated)/settings/compliance/page.tsx` | Compliance server page |
| `apps/web/components/settings/account-panel.tsx` | Profile + org client component (extracted from SettingsWorkspacePanel) |
| `apps/web/components/settings/people-panel.tsx` | Members + Invites client component (extracted from SettingsWorkspacePanel) |
| `apps/web/components/settings/compliance-panel.tsx` | Compliance client component (extracted from SettingsWorkspacePanel) |
| `apps/web/components/settings/permissions-panel.tsx` | Presets info panel (extracted from TeamAccessPanel) |

### Modified files
| Path | Change |
|---|---|
| `apps/web/app/(authenticated)/settings/page.tsx` | Reduce to Account only: profile + org data fetch, renders `<AccountPanel>` |
| `apps/web/components/settings-workspace-panel.tsx` | Delete — responsibilities redistributed to per-page components |
| `apps/web/components/settings/team-access-panel.tsx` | Remove Primary Manager sub-section and Permission Presets sub-section; keep Teams + membership only |
| `apps/web/components/app-shell.tsx` | Add "Settings" link at bottom of sidebar nav |

---

## Task 1: Settings layout with left nav

**Files:**
- Create: `apps/web/app/(authenticated)/settings/layout.tsx`
- Create: `apps/web/components/settings/settings-nav.tsx`

- [ ] **Step 1: Create the settings nav component**

```tsx
// apps/web/components/settings/settings-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";

type SettingsNavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: SettingsNavItem[] = [
  { href: "/settings",              label: "Account",      icon: "person"        },
  { href: "/settings/people",       label: "People",       icon: "group",        adminOnly: true },
  { href: "/settings/teams",        label: "Teams",        icon: "groups",       adminOnly: true },
  { href: "/settings/permissions",  label: "Permissions",  icon: "lock",         adminOnly: true },
  { href: "/settings/integrations", label: "Integrations", icon: "power",        adminOnly: true },
  { href: "/settings/compliance",   label: "Compliance",   icon: "verified_user", adminOnly: true },
];

type SettingsNavProps = {
  role: "rep" | "manager" | "executive" | "admin" | null;
};

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav aria-label="Settings navigation">
      <p className="px-3 mb-3 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#45484f]">
        Settings
      </p>
      {visibleItems.map((item) => {
        // Exact match for /settings root, prefix match for sub-pages
        const active =
          item.href === "/settings"
            ? pathname === "/settings"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-[var(--font-display)] tracking-wider uppercase text-[0.7rem] font-bold",
              active
                ? "text-[#74b1ff] bg-[#74b1ff]/10 border-r-2 border-[#74b1ff]"
                : "text-[#45484f] hover:text-[#ecedf6] hover:bg-[#ffffff]/5",
            )}
          >
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create the settings layout**

```tsx
// apps/web/app/(authenticated)/settings/layout.tsx
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  const role = result?.ok ? result.data.role : null;

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* Left nav — sticky within the settings shell */}
      <aside className="w-48 shrink-0 border-r border-[#45484f]/10 pt-8 px-3 sticky top-[65px] self-start h-[calc(100vh-65px)] overflow-y-auto">
        <SettingsNav role={role} />
      </aside>

      {/* Page content */}
      <div className="flex-1 min-w-0 px-8 py-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the layout renders without breaking the existing /settings page**

Run: `npm run dev` and visit `/settings`. Confirm the left nav appears and the existing content still renders.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(authenticated)/settings/layout.tsx apps/web/components/settings/settings-nav.tsx
git commit -m "feat: add settings shell layout with left secondary nav"
```

---

## Task 2: Add Settings link to main sidebar

**Files:**
- Modify: `apps/web/components/app-shell.tsx`

- [ ] **Step 1: Add a settings standalone route at the bottom of the sidebar nav**

In [app-shell.tsx](apps/web/components/app-shell.tsx), find the `standaloneRoutes` array and the nav render loop. Add a settings entry **below** the nav groups, separated visually. The cleanest approach is to add a dedicated `bottomRoutes` array rendered after the nav scroll area:

Find this block in `app-shell.tsx` (around line 147):
```tsx
        </nav>
      </aside>
```

Replace with:
```tsx
        </nav>

        {/* Bottom nav */}
        <div className="pt-3 border-t border-[#45484f]/10">
          <NavLink
            href="/settings"
            label="Settings"
            icon="settings"
            active={isRouteActive(currentPath, "/settings")}
          />
        </div>
      </aside>
```

- [ ] **Step 2: Verify sidebar shows Settings link and highlights when on /settings routes**

Run: `npm run dev`. Confirm "Settings" appears at the bottom of the sidebar. Navigate to `/settings` — it should be highlighted.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app-shell.tsx
git commit -m "feat: add Settings link to main sidebar bottom nav"
```

---

## Task 3: Extract AccountPanel and refactor /settings root page

**Files:**
- Create: `apps/web/components/settings/account-panel.tsx`
- Modify: `apps/web/app/(authenticated)/settings/page.tsx`

The Account page keeps: Your Profile (inline edit) + Organization (read-only metadata).

- [ ] **Step 1: Create account-panel.tsx**

Extract the profile + org sections from `SettingsWorkspacePanel`. This component needs: `initialUser: CurrentUserDetails`.

```tsx
// apps/web/components/settings/account-panel.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUserDetails } from "@/lib/users/service";

function initials(firstName: string | null, lastName: string | null, fallback: string) {
  const v = [firstName, lastName].filter(Boolean).map((s) => s?.[0]?.toUpperCase()).join("");
  return v || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

type AccountPanelProps = {
  initialUser: CurrentUserDetails;
};

export function AccountPanel({ initialUser }: AccountPanelProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialUser.firstName ?? "");
  const [lastName, setLastName] = useState(initialUser.lastName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayName = useMemo(
    () => [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim() || currentUser.email,
    [currentUser],
  );

  async function saveProfile() {
    if (!firstName.trim() && !lastName.trim()) {
      setError("Please enter at least a first or last name.");
      return;
    }
    setError(null);
    setIsSaving(true);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const payload = (await response.json()) as CurrentUserDetails & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Profile couldn't be saved. Try again.");
      setIsSaving(false);
      return;
    }
    setCurrentUser(payload);
    setIsEditing(false);
    setIsSaving(false);
    router.refresh();
  }

  async function copySlug() {
    if (!currentUser.org?.slug) return;
    await navigator.clipboard.writeText(currentUser.org.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-lg font-semibold text-blue-200">
            {initials(currentUser.firstName, currentUser.lastName, currentUser.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Your Profile</p>

            {isEditing ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">First Name</span>
                    <input
                      className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                      onChange={(e) => setFirstName(e.target.value)}
                      value={firstName}
                    />
                  </label>
                  <label className="text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Last Name</span>
                    <input
                      className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                      onChange={(e) => setLastName(e.target.value)}
                      value={lastName}
                    />
                  </label>
                </div>
                <p className="text-sm text-slate-400">{currentUser.email}</p>
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <div className="flex gap-3">
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void saveProfile()}
                    type="button"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    disabled={isSaving}
                    onClick={() => {
                      setFirstName(currentUser.firstName ?? "");
                      setLastName(currentUser.lastName ?? "");
                      setError(null);
                      setIsEditing(false);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-2xl font-semibold text-white">{displayName}</p>
                <p className="mt-2 text-sm text-slate-400">{currentUser.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full border border-blue-500/25 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300"
                    title="Your role is set by an org admin"
                  >
                    {currentUser.role ?? "member"}
                  </span>
                  <button
                    className="rounded-xl border border-slate-700/70 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Edit profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Organization card */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Organization</p>
        <p className="mt-4 text-2xl font-semibold text-white">{currentUser.org?.name ?? "No organization"}</p>
        {currentUser.org ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Org ID</p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-300">{currentUser.org.slug}</p>
                <p className="mt-1 text-xs text-slate-500">Used in API references and webhook configurations</p>
              </div>
              <button
                className="rounded-xl border border-slate-700/70 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                onClick={() => void copySlug()}
                type="button"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Plan</p>
                <p className="mt-2 text-sm font-medium capitalize text-slate-300">{currentUser.org.plan}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Created</p>
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {formatDate(currentUser.org.createdAt) ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Join or create an organization to unlock the workspace.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Replace settings/page.tsx to only fetch and render account data**

```tsx
// apps/web/app/(authenticated)/settings/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { AccountPanel } from "@/components/settings/account-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);

  if (!result?.ok) {
    return (
      <PageFrame
        description="Settings needs an app user record before profile and org management can load."
        eyebrow="Provisioning"
        title="Account"
        tone="warning"
      >
        <section className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 p-6 text-sm leading-7 text-amber-100">
          {result?.error ?? "Unable to load settings."}
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      description="Manage your display name and view your organization details."
      eyebrow="Settings"
      title="Account"
    >
      <AccountPanel initialUser={result.data} />
    </PageFrame>
  );
}
```

- [ ] **Step 3: Verify /settings loads cleanly with only Account content**

Run: `npm run dev` and visit `/settings`. Confirm profile + org cards render. Confirm no team/compliance/integrations content is shown.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/account-panel.tsx apps/web/app/(authenticated)/settings/page.tsx
git commit -m "feat: extract AccountPanel and scope /settings root to account only"
```

---

## Task 4: People sub-page (Members + Invites)

**Files:**
- Create: `apps/web/app/(authenticated)/settings/people/page.tsx`
- Create: `apps/web/components/settings/people-panel.tsx`

Extract the Team Members section and the Invites section from `SettingsWorkspacePanel`. These two are combined here because both deal with org membership lifecycle (existing members + incoming invites).

- [ ] **Step 1: Create people-panel.tsx**

This component is an extraction of the members list + invite form from `SettingsWorkspacePanel`. Key improvements over the original:
- Role change requires a **confirmation step** before saving (two-step: change select → "Apply" button, NOT `onChange` auto-save)
- Remove member has an inline confirmation state
- Invite form auto-closes after successful send
- Revoke shows error feedback on failure
- Uses consistent CSS design tokens (same as the rest of the page, not the Invites section's divergent tokens)

```tsx
// apps/web/components/settings/people-panel.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMember } from "@/lib/users/service";
import type { InviteRecord } from "@/lib/invites/repository";

function initials(firstName: string | null, lastName: string | null, fallback: string) {
  const v = [firstName, lastName].filter(Boolean).map((s) => s?.[0]?.toUpperCase()).join("");
  return v || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

type PeoplePanelProps = {
  currentUserId: string;
  initialMembers: OrganizationMember[];
  initialPendingInvites: InviteRecord[];
  initialTeams: Array<{ id: string; name: string }>;
};

export function PeoplePanel({
  currentUserId,
  initialMembers,
  initialPendingInvites,
  initialTeams,
}: PeoplePanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialPendingInvites);

  // Per-member pending role selection (staged, not auto-saved)
  const [stagedRoles, setStagedRoles] = useState<Record<string, string>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"rep" | "manager" | "executive" | "admin">("rep");
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});

  const showTeamPicker = inviteRole === "rep" || inviteRole === "manager";

  async function applyRoleChange(memberId: string) {
    const newRole = stagedRoles[memberId];
    if (!newRole) return;
    setMemberError(null);
    setSavingRoleId(memberId);
    const response = await fetch(`/api/organizations/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const payload = (await response.json()) as { id?: string; role?: OrganizationMember["role"]; error?: string };
    if (!response.ok) {
      setMemberError(payload.error ?? "Role change failed. Refresh and try again.");
      setSavingRoleId(null);
      return;
    }
    setMembers((current) =>
      current.map((m) => (m.id === memberId ? { ...m, role: payload.role ?? m.role } : m)),
    );
    setStagedRoles((current) => { const next = { ...current }; delete next[memberId]; return next; });
    setSavingRoleId(null);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setMemberError(null);
    setRemovingId(memberId);
    const response = await fetch(`/api/organizations/members/${memberId}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMemberError(payload.error ?? "Couldn't remove member. Refresh and try again.");
      setRemovingId(null);
      setConfirmRemoveId(null);
      return;
    }
    setMembers((current) => current.filter((m) => m.id !== memberId));
    setRemovingId(null);
    setConfirmRemoveId(null);
    router.refresh();
  }

  async function sendInvite() {
    setInviteError(null);
    setInviteSending(true);
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        teamIds: inviteTeamIds.length > 0 ? inviteTeamIds : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; id?: string };
    setInviteSending(false);
    if (!response.ok) {
      setInviteError(data.error ?? "Unable to send invite.");
      return;
    }
    // Reset and close form
    setInviteEmail("");
    setInviteTeamIds([]);
    setInviteRole("rep");
    setShowInviteForm(false);
    // Refresh invite list
    const listRes = await fetch("/api/invites");
    if (listRes.ok) setPendingInvites(await listRes.json() as InviteRecord[]);
  }

  async function revokeInvite(invite: InviteRecord) {
    setRevokeErrors((e) => { const next = { ...e }; delete next[invite.id]; return next; });
    setRevokingId(invite.id);
    const response = await fetch(`/api/invites/${invite.token}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setRevokeErrors((e) => ({ ...e, [invite.id]: payload.error ?? "Revoke failed. Try again." }));
      setRevokingId(null);
      return;
    }
    setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setRevokingId(null);
  }

  return (
    <div className="space-y-5">
      {/* Members section */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Members</p>
            <p className="mt-2 text-sm text-slate-400">Manage roles for everyone in your organization.</p>
          </div>
          <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        {memberError ? (
          <div className="mt-4 rounded-[1rem] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {memberError}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-slate-400">No other members yet. Invite teammates to get started.</p>
          ) : (
            members.map((member) => {
              const isSelf = member.id === currentUserId;
              const memberName = [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.email;
              const stagedRole = stagedRoles[member.id];
              const hasUnappliedChange = stagedRole !== undefined && stagedRole !== (member.role ?? "rep");
              const isConfirmingRemove = confirmRemoveId === member.id;
              const isRemoving = removingId === member.id;
              const isSavingRole = savingRoleId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/25 bg-blue-600/15 text-sm font-semibold text-blue-200">
                      {initials(member.firstName, member.lastName, member.email)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {memberName}
                        {isSelf ? <span className="ml-2 text-xs font-medium text-slate-500">(you)</span> : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{member.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {member.callCount} calls · joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {!isSelf ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Two-step role change */}
                      <select
                        className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-blue-500/60 disabled:opacity-50"
                        disabled={isSavingRole}
                        onChange={(e) => setStagedRoles((current) => ({ ...current, [member.id]: e.target.value }))}
                        value={stagedRole ?? member.role ?? "rep"}
                      >
                        <option value="rep">Rep</option>
                        <option value="manager">Manager</option>
                        <option value="executive">Executive</option>
                        <option value="admin">Admin</option>
                      </select>
                      {hasUnappliedChange ? (
                        <button
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                          disabled={isSavingRole}
                          onClick={() => void applyRoleChange(member.id)}
                          type="button"
                        >
                          {isSavingRole ? "Saving..." : "Apply"}
                        </button>
                      ) : null}

                      {/* Two-step remove */}
                      {isConfirmingRemove ? (
                        <>
                          <span className="text-xs text-slate-400">Remove {memberName}?</span>
                          <button
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                            disabled={isRemoving}
                            onClick={() => void removeMember(member.id)}
                            type="button"
                          >
                            {isRemoving ? "Removing..." : "Confirm remove"}
                          </button>
                          <button
                            className="rounded-xl border border-slate-700/70 px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
                            onClick={() => setConfirmRemoveId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-xl border border-slate-700/70 px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-red-500/30 hover:text-red-300"
                          onClick={() => setConfirmRemoveId(member.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Invites section */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Invites</p>
            <p className="mt-2 text-sm text-slate-400">
              Invite links expire in 7 days. Revoke a pending invite to invalidate it immediately.
            </p>
          </div>
          {!showInviteForm ? (
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              onClick={() => setShowInviteForm(true)}
              type="button"
            >
              Invite member
            </button>
          ) : null}
        </div>

        {showInviteForm ? (
          <div className="mt-5 rounded-[1.5rem] border border-slate-800/70 bg-slate-950/20 p-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Email</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Role</span>
              <select
                className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                onChange={(e) => {
                  setInviteRole(e.target.value as typeof inviteRole);
                  setInviteTeamIds([]);
                }}
                value={inviteRole}
              >
                <option value="rep">Rep — records and reviews own calls</option>
                <option value="manager">Manager — coaches team calls</option>
                <option value="executive">Executive — views all team data</option>
                <option value="admin">Admin — full access</option>
              </select>
            </label>

            {showTeamPicker && initialTeams.length > 0 ? (
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Teams (optional)
                </span>
                <div className="mt-2 space-y-2">
                  {initialTeams.map((team) => (
                    <label key={team.id} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                      <input
                        checked={inviteTeamIds.includes(team.id)}
                        className="accent-blue-500"
                        onChange={(e) =>
                          setInviteTeamIds((prev) =>
                            e.target.checked ? [...prev, team.id] : prev.filter((id) => id !== team.id),
                          )
                        }
                        type="checkbox"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {inviteError ? <p className="text-sm text-red-300">{inviteError}</p> : null}

            <div className="flex gap-3">
              <button
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                disabled={!inviteEmail.trim() || inviteSending}
                onClick={() => void sendInvite()}
                type="button"
              >
                {inviteSending ? "Sending..." : "Send invite"}
              </button>
              <button
                className="rounded-xl border border-slate-700/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                disabled={inviteSending}
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                  setInviteError(null);
                  setInviteTeamIds([]);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-400">
              No pending invites. Use the "Invite member" button above to add teammates.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{invite.email}</p>
                      <p className="mt-1 text-xs text-slate-500 uppercase tracking-[0.18em]">
                        {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-slate-700/70 px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-50"
                      disabled={revokingId === invite.id}
                      onClick={() => void revokeInvite(invite)}
                      type="button"
                    >
                      {revokingId === invite.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                  {revokeErrors[invite.id] ? (
                    <p className="mt-2 text-xs text-red-300">{revokeErrors[invite.id]}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create the People page**

```tsx
// apps/web/app/(authenticated)/settings/people/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { PeoplePanel } from "@/components/settings/people-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { listPendingInvites } from "@/lib/invites/service";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsPeoplePage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [membersResult, teamAccessResult, pendingInvitesResult] = await Promise.all([
    listOrganizationMembers(createUsersRepository(), authUser.id),
    getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id),
    listPendingInvites(createInvitesRepository(), createUsersRepository(), authUser.id),
  ]);

  return (
    <PageFrame
      description="Manage org member roles and send or revoke invitations."
      eyebrow="Settings"
      title="People"
    >
      <PeoplePanel
        currentUserId={authUser.id}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        initialPendingInvites={pendingInvitesResult?.ok ? pendingInvitesResult.data : []}
        initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
      />
    </PageFrame>
  );
}
```

- [ ] **Step 3: Verify /settings/people works end-to-end**

As admin: visit `/settings/people`. Confirm members list renders. Change a role — confirm the "Apply" button appears before saving. Confirm role doesn't auto-save on select change. Confirm "Remove" asks for confirmation before deleting.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/people-panel.tsx apps/web/app/(authenticated)/settings/people/page.tsx
git commit -m "feat: add People settings sub-page with two-step role change and revoke error handling"
```

---

## Task 5: Teams sub-page

**Files:**
- Create: `apps/web/app/(authenticated)/settings/teams/page.tsx`
- Modify: `apps/web/components/settings/team-access-panel.tsx` (remove Primary Manager sub-section; keep teams + membership)

The Primary Manager sub-section from `TeamAccessPanel` moves to the Teams page but as a standalone section, not inside the `TeamAccessPanel` component. The `TeamAccessPanel` keeps only: create team, team list with manager/rep membership management.

- [ ] **Step 1: Remove only the Primary Manager sub-section from TeamAccessPanel**

In [team-access-panel.tsx](apps/web/components/settings/team-access-panel.tsx), delete only:

1. The right-column `<div className="space-y-3">` (lines ~562-633) that contains both the "Primary manager" card and the "Permission presets" reference card. This is the second child of the `grid gap-4 lg:grid-cols-[1.15fr_0.85fr]` div.
2. The `selectedPrimaryManagerByRepId` state declaration and its setter.
3. The `assignPrimaryManager` async function.

**Do NOT remove** `selectedPresetByKey`, its setter, or `applyPreset`. These are still used by the per-manager preset apply UI inside each team card (the `<select>` + "Apply" button rendered within each `teamManagerMemberships.map` block). Removing them would break the inline preset assignment that stays in the Teams page.

The `TeamAccessPanel` should now handle: create team + team list with manager/rep membership cards (including the per-manager preset apply UI within each team card, which stays).

- [ ] **Step 2: Change the grid in TeamAccessPanel from 2-column to full-width**

The grid `grid gap-4 lg:grid-cols-[1.15fr_0.85fr]` on line ~350 should become `space-y-4` since the right column is removed.

- [ ] **Step 3: Create the Teams page**

```tsx
// apps/web/app/(authenticated)/settings/teams/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamAccessPanel } from "@/components/settings/team-access-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsTeamsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const teamAccessResult = await getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id);
  const teamData = teamAccessResult?.ok ? teamAccessResult.data : { teams: [], managers: [], reps: [], memberships: [] };

  return (
    <PageFrame
      description="Create teams and assign managers and reps to control call visibility and coaching access."
      eyebrow="Settings"
      title="Teams"
    >
      <TeamAccessPanel
        canManage={true}
        memberships={teamData.memberships}
        managers={teamData.managers}
        reps={teamData.reps}
        teams={teamData.teams}
      />
    </PageFrame>
  );
}
```

- [ ] **Step 4: Verify /settings/teams renders correctly**

As admin: visit `/settings/teams`. Confirm team creation form and existing teams render. Confirm manager/rep assignment works. Confirm primary manager and permission presets sidebar is gone.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/settings/team-access-panel.tsx apps/web/app/(authenticated)/settings/teams/page.tsx
git commit -m "feat: add Teams settings sub-page, remove primary manager from TeamAccessPanel"
```

---

## Task 6: Permissions sub-page

**Files:**
- Create: `apps/web/app/(authenticated)/settings/permissions/page.tsx`
- Create: `apps/web/components/settings/permissions-panel.tsx`

This page hosts: (1) a description of each preset with its permission grants shown in a table, and (2) primary manager assignment which was removed from `TeamAccessPanel`.

- [ ] **Step 1: Create permissions-panel.tsx**

This extracts the Primary Manager sub-section from the old `TeamAccessPanel` and adds a preset reference table.

```tsx
// apps/web/components/settings/permissions-panel.tsx
"use client";

import { useState } from "react";

type RepRecord = { id: string; name: string; primaryManagerId: string | null };
type ManagerRecord = { id: string; name: string };

type PermissionsPanelProps = {
  managers: ManagerRecord[];
  reps: RepRecord[];
};

const PRESET_DEFINITIONS = [
  {
    name: "Coach",
    description: "A manager who can view and leave coaching notes on calls for their team.",
    grants: { "View team calls": true, "Coach calls": true, "Manage highlights": false, "Manage team": false },
  },
  {
    name: "Training Manager",
    description: "A manager who can view, coach, and curate call highlights for training.",
    grants: { "View team calls": true, "Coach calls": true, "Manage highlights": true, "Manage team": false },
  },
  {
    name: "Team Lead",
    description: "A manager with full access to coach, curate, and manage their team's membership.",
    grants: { "View team calls": true, "Coach calls": true, "Manage highlights": true, "Manage team": true },
  },
] as const;

const GRANT_COLUMNS = ["View team calls", "Coach calls", "Manage highlights", "Manage team"] as const;

export function PermissionsPanel({ managers, reps }: PermissionsPanelProps) {
  const [selectedManagerByRepId, setSelectedManagerByRepId] = useState<Record<string, string>>({});
  const [savingRepId, setSavingRepId] = useState<string | null>(null);
  const [savedRepIds, setSavedRepIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function assignPrimaryManager(repId: string) {
    const managerId = selectedManagerByRepId[repId] ?? "";
    setError(null);
    setSavingRepId(repId);
    const response = await fetch(`/api/organizations/members/${repId}/primary-manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    const payload = (await response.json()) as { managerId?: string; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to assign primary manager.");
      setSavingRepId(null);
      return;
    }
    setSavedRepIds((prev) => new Set([...prev, repId]));
    setSavingRepId(null);
    setTimeout(() => setSavedRepIds((prev) => { const next = new Set(prev); next.delete(repId); return next; }), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Preset reference table */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Permission Presets</p>
        <p className="mt-3 text-sm text-slate-400">
          Apply presets to managers from the Teams page. Each preset grants a fixed set of capabilities for that manager within a team.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/70">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 pr-6">Preset</th>
                {GRANT_COLUMNS.map((col) => (
                  <th key={col} className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 px-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {PRESET_DEFINITIONS.map((preset) => (
                <tr key={preset.name}>
                  <td className="py-4 pr-6">
                    <p className="font-semibold text-white">{preset.name}</p>
                    <p className="mt-1 text-xs text-slate-500 max-w-[200px]">{preset.description}</p>
                  </td>
                  {GRANT_COLUMNS.map((col) => (
                    <td key={col} className="py-4 px-3 text-center">
                      {preset.grants[col] ? (
                        <span className="text-emerald-400" aria-label="Granted">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                        </span>
                      ) : (
                        <span className="text-slate-700" aria-label="Not granted">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>remove</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Primary manager assignment */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Primary Manager</p>
        <p className="mt-3 text-sm text-slate-400">
          Each rep can belong to multiple teams but has one primary manager — the accountable owner for coaching and reporting.
        </p>

        {error ? (
          <div className="mt-4 rounded-[1rem] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {reps.length === 0 ? (
            <p className="text-sm text-slate-400">
              No reps have joined yet. Invite reps first, then assign their primary manager here.
            </p>
          ) : (
            reps.map((rep) => {
              const currentManagerId = selectedManagerByRepId[rep.id] ?? rep.primaryManagerId ?? "";
              const currentManagerName = managers.find((m) => m.id === currentManagerId)?.name;
              const isSaving = savingRepId === rep.id;
              const justSaved = savedRepIds.has(rep.id);

              return (
                <div
                  key={rep.id}
                  className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{rep.name}</p>
                    {currentManagerName ? (
                      <p className="mt-1 text-xs text-slate-500">Currently: {currentManagerName}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No primary manager assigned</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60 disabled:opacity-50"
                      disabled={isSaving}
                      onChange={(e) => setSelectedManagerByRepId((prev) => ({ ...prev, [rep.id]: e.target.value }))}
                      value={currentManagerId}
                    >
                      <option value="">No primary manager</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                      disabled={isSaving}
                      onClick={() => void assignPrimaryManager(rep.id)}
                      type="button"
                    >
                      {isSaving ? "Saving..." : justSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create the Permissions page**

```tsx
// apps/web/app/(authenticated)/settings/permissions/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { PermissionsPanel } from "@/components/settings/permissions-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsPermissionsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const teamAccessResult = await getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id);
  const teamData = teamAccessResult?.ok ? teamAccessResult.data : { managers: [], reps: [] };

  return (
    <PageFrame
      description="Understand what each permission preset grants and assign a primary manager to each rep."
      eyebrow="Settings"
      title="Permissions"
    >
      <PermissionsPanel
        managers={teamData.managers}
        reps={teamData.reps}
      />
    </PageFrame>
  );
}
```

- [ ] **Step 3: Verify /settings/permissions renders preset table and primary manager assignment**

As admin: visit `/settings/permissions`. Confirm preset table shows three rows with check/dash indicators. Confirm primary manager dropdowns render per rep. Confirm save shows "Saved" feedback briefly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/permissions-panel.tsx apps/web/app/(authenticated)/settings/permissions/page.tsx
git commit -m "feat: add Permissions settings sub-page with preset reference table and primary manager assignment"
```

---

## Task 7: Integrations sub-page

**Files:**
- Create: `apps/web/app/(authenticated)/settings/integrations/page.tsx`

The `IntegrationsSettingsPanel` component is already well-scoped. This task just moves it to its own page and routes the OAuth callback notices to it.

- [ ] **Step 1: Create the Integrations page**

```tsx
// apps/web/app/(authenticated)/settings/integrations/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { IntegrationsSettingsPanel } from "@/components/integrations-settings-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

function buildNotices(searchParams: Record<string, string | string[] | undefined>) {
  const values = [
    searchParams.zoom_connected, searchParams.ghl_connected,
    searchParams.zoom_error, searchParams.ghl_error,
    searchParams.zoom_notice, searchParams.ghl_notice,
  ]
    .flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .map(String);

  return values.map((value) => {
    switch (value) {
      case "true": return "Integration connected successfully.";
      case "not_configured": return "The provider is not configured yet. Add OAuth credentials to enable connect flows.";
      case "forbidden": return "Only admins can manage integrations.";
      case "callback_failed": return "Token exchange failed during the OAuth callback. Try connecting again.";
      case "webhook_registration_failed": return "Zoom connected, but webhook registration failed. Recording ingest will stay inactive until webhook registration succeeds.";
      case "invalid_state": case "state_mismatch": case "session_expired": case "no_session":
        return "The OAuth state check failed. Start the connection flow again.";
      case "missing_params": return "The provider callback did not include the expected authorization parameters.";
      default: return value.replaceAll("_", " ");
    }
  });
}

export default async function SettingsIntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const integrations = await getIntegrationStatuses(createIntegrationsRepository(), authUser.id);
  const resolvedParams = await searchParams;
  const notices = buildNotices(resolvedParams ?? {});

  if (!integrations?.ok) {
    return (
      <PageFrame description="Unable to load integration statuses." eyebrow="Settings" title="Integrations" tone="warning">
        <p className="text-sm text-amber-200">Unable to load integration statuses. Refresh to try again.</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      description="Connect Zoom to enable call recording ingest, and Go High Level to sync CRM data."
      eyebrow="Settings"
      title="Integrations"
    >
      <IntegrationsSettingsPanel initialStatuses={integrations.data} notices={notices} />
    </PageFrame>
  );
}
```

- [ ] **Step 2: Update OAuth callback and connect redirect targets**

Four files need updating. In each file, change `"/settings"` to `"/settings/integrations"` in the redirect targets:

**File 1: `apps/web/app/api/integrations/zoom/callback/route.ts`**

Find the `settingsRedirect` helper function (line ~19):
```ts
const target = new URL("/settings", getRequestOrigin(request));
```
Change to:
```ts
const target = new URL("/settings/integrations", getRequestOrigin(request));
```

Also find the `settingsRedirectWithNotice` helper function (line ~41):
```ts
const target = new URL("/settings", getRequestOrigin(request));
```
Change to:
```ts
const target = new URL("/settings/integrations", getRequestOrigin(request));
```

**File 2: `apps/web/app/api/integrations/ghl/callback/route.ts`**

Same change: find the `settingsRedirect` helper function (line ~17):
```ts
const target = new URL("/settings", getRequestOrigin(request));
```
Change to:
```ts
const target = new URL("/settings/integrations", getRequestOrigin(request));
```

**File 3: `apps/web/app/api/integrations/zoom/connect/route.ts`**

Find the three `NextResponse.redirect(new URL("/settings?zoom_error=...`, request.url))` calls and change `/settings?` to `/settings/integrations?` in each:
```ts
// Before:
return NextResponse.redirect(new URL("/settings?zoom_error=not_provisioned", request.url));
return NextResponse.redirect(new URL("/settings?zoom_error=forbidden", request.url));
return NextResponse.redirect(new URL("/settings?zoom_error=not_configured", request.url));
// After:
return NextResponse.redirect(new URL("/settings/integrations?zoom_error=not_provisioned", request.url));
return NextResponse.redirect(new URL("/settings/integrations?zoom_error=forbidden", request.url));
return NextResponse.redirect(new URL("/settings/integrations?zoom_error=not_configured", request.url));
```

**File 4: `apps/web/app/api/integrations/ghl/connect/route.ts`**

Same as File 3 but for `ghl_error` params:
```ts
// Before:
return NextResponse.redirect(new URL("/settings?ghl_error=not_provisioned", request.url));
return NextResponse.redirect(new URL("/settings?ghl_error=forbidden", request.url));
return NextResponse.redirect(new URL("/settings?ghl_error=not_configured", request.url));
// After:
return NextResponse.redirect(new URL("/settings/integrations?ghl_error=not_provisioned", request.url));
return NextResponse.redirect(new URL("/settings/integrations?ghl_error=forbidden", request.url));
return NextResponse.redirect(new URL("/settings/integrations?ghl_error=not_configured", request.url));
```

- [ ] **Step 3: Verify /settings/integrations renders both provider cards**

As admin: visit `/settings/integrations`. Confirm Zoom and GHL cards render with correct connected/not configured states.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(authenticated)/settings/integrations/page.tsx
git commit -m "feat: add Integrations settings sub-page, move OAuth notice handling to integrations route"
```

---

## Task 8: Compliance sub-page

**Files:**
- Create: `apps/web/app/(authenticated)/settings/compliance/page.tsx`
- Create: `apps/web/components/settings/compliance-panel.tsx`

- [ ] **Step 1: Create compliance-panel.tsx**

Key improvements over original:
- Remove "Acknowledge again" button when already consented — replace with version history row
- Add policy version visible to user
- Explain what acknowledging unlocks
- Non-admin view shows who acknowledged and when

```tsx
// apps/web/components/settings/compliance-panel.tsx
"use client";

import { useState } from "react";

type CompliancePanelProps = {
  canManage: boolean;
  consentedAt: string | null;
  hasConsented: boolean;
};

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const POLICY_VERSION = "2026-04-03";
const POLICY_DISPLAY = "Recording Consent Policy v2026-04-03";

export function CompliancePanel({ canManage, consentedAt, hasConsented }: CompliancePanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(hasConsented);
  const [acknowledgedAt, setAcknowledgedAt] = useState(consentedAt);

  async function acknowledge() {
    setError(null);
    setIsUpdating(true);
    const response = await fetch("/api/compliance/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "recording_consent_acknowledged",
        tosVersion: `${POLICY_VERSION}-replit-parity`,
        metadata: { source: "settings" },
      }),
    });
    const payload = (await response.json()) as { consentedAt?: string; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to update compliance status. Try again.");
      setIsUpdating(false);
      return;
    }
    setAcknowledged(true);
    setAcknowledgedAt(payload.consentedAt ?? new Date().toISOString());
    setIsUpdating(false);
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recording Consent</p>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        An org admin must acknowledge the recording consent policy before Zoom call recording ingest is enabled. This confirms your organization complies with applicable call recording notification laws.
      </p>

      <div className="mt-5 rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-300">{POLICY_DISPLAY}</p>
          {acknowledged ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
              Acknowledged
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
              Pending
            </span>
          )}
        </div>
        {acknowledged && acknowledgedAt ? (
          <p className="mt-2 text-xs text-slate-500">Acknowledged {formatDateTime(acknowledgedAt)}</p>
        ) : (
          <p className="mt-2 text-xs text-amber-300/70">
            Zoom call recording ingest is disabled until this policy is acknowledged.
          </p>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : null}

      {canManage && !acknowledged ? (
        <div className="mt-5">
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            disabled={isUpdating}
            onClick={() => void acknowledge()}
            type="button"
          >
            {isUpdating ? "Acknowledging..." : "Acknowledge recording policy"}
          </button>
        </div>
      ) : null}

      {!canManage ? (
        <p className="mt-4 text-sm text-slate-500">Only admins can acknowledge the recording policy.</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Create the Compliance page**

```tsx
// apps/web/app/(authenticated)/settings/compliance/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { CompliancePanel } from "@/components/settings/compliance-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsCompliancePage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const compliance = await getComplianceStatus(createComplianceRepository(), authUser.id);

  return (
    <PageFrame
      description="Manage recording consent acknowledgments required before call ingest is enabled."
      eyebrow="Settings"
      title="Compliance"
    >
      <CompliancePanel
        canManage={result.data.role === "admin"}
        consentedAt={compliance?.ok ? compliance.data.consentedAt : null}
        hasConsented={compliance?.ok ? compliance.data.hasConsented : false}
      />
    </PageFrame>
  );
}
```

- [ ] **Step 3: Verify /settings/compliance renders correctly**

As admin with no consent: confirm amber "Pending" badge and "Acknowledge recording policy" button appear. Confirm clicking acknowledges and shows "Acknowledged" badge with timestamp. Confirm button disappears after acknowledgment (no "Acknowledge again").

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/compliance-panel.tsx apps/web/app/(authenticated)/settings/compliance/page.tsx
git commit -m "feat: add Compliance settings sub-page with version history and clear gating message"
```

---

## Task 9: Delete SettingsWorkspacePanel and associated test files

**Files:**
- Delete: `apps/web/components/settings-workspace-panel.tsx`
- Delete: `apps/web/lib/settings-workspace-panel.test.ts` (imports the deleted component directly)

At this point, `SettingsWorkspacePanel` should have no remaining importers. All its responsibilities have been distributed.

- [ ] **Step 1: Verify no remaining imports (outside the files being deleted)**

```bash
grep -r "settings-workspace-panel\|SettingsWorkspacePanel" apps/web --include="*.ts" --include="*.tsx"
```

Expected results: only the three files being deleted in this task:
- `apps/web/components/settings-workspace-panel.tsx` (the component itself)
- `apps/web/lib/settings-workspace-panel.test.ts` (test file that imports it)
- `apps/web/lib/ui-copy-cleanup.test.ts` (references the component path as a string in a UI copy audit test)

If any other `.tsx` import is found, stop and remove that import before proceeding.

- [ ] **Step 2: Delete the component and its direct test file**

```bash
rm apps/web/components/settings-workspace-panel.tsx
rm apps/web/lib/settings-workspace-panel.test.ts
```

- [ ] **Step 3: Update ui-copy-cleanup.test.ts to remove the deleted path reference**

In `apps/web/lib/ui-copy-cleanup.test.ts`, find and remove the line:
```ts
path.join(componentsRoot, "settings-workspace-panel.tsx"),
```
This file audits UI copy across component files — the deleted component no longer exists, so its entry must be removed.

- [ ] **Step 4: Run typecheck to confirm no orphaned references**

```bash
npm run typecheck:web
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete SettingsWorkspacePanel — fully replaced by scoped sub-page components"
```

---

## Task 10: Final verification pass

- [ ] **Step 1: Run full typecheck**

```bash
npm run typecheck:web
```

Expected: no errors.

- [ ] **Step 2: Run web tests**

```bash
npm run test:web
```

Expected: no regressions.

- [ ] **Step 3: Smoke-test all six settings routes manually**

| Route | As admin | As non-admin |
|---|---|---|
| `/settings` | Profile + org visible, edit works | Same (profile is personal) |
| `/settings/people` | Members + invites | Redirects to `/settings` |
| `/settings/teams` | Teams panel | Redirects to `/settings` |
| `/settings/permissions` | Preset table + primary manager | Redirects to `/settings` |
| `/settings/integrations` | Zoom + GHL cards | Redirects to `/settings` |
| `/settings/compliance` | Consent card | Redirects to `/settings` |

- [ ] **Step 4: Confirm settings left nav highlights active route correctly for all six pages**

- [ ] **Step 5: Confirm main sidebar "Settings" link appears and highlights when on any `/settings/*` route**

- [ ] **Step 6: Commit any remaining cleanup**

```bash
git add -A
git commit -m "chore: final cleanup after settings IA refactor"
```
