"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeErrorState, ForgeIcon, ForgeStatusPanel } from "@/components/forge";
import type { OnboardingAccessMode } from "@/lib/onboarding/service";

type Step = "choose" | "create" | "join" | "invite";
type FlowStep = Exclude<Step, "choose">;

type OnboardingPanelProps = {
  accessMode?: OnboardingAccessMode;
  note?: string;
  userEmail?: string | null;
};

export const ONBOARDING_ENDPOINTS = {
  createOrganization: "/api/organizations",
  dashboard: "/dashboard",
  invites: "/api/invites",
  joinOrganization: "/api/organizations/join",
  teams: "/api/teams",
} as const;

export const ONBOARDING_INVITE_ROLES = [
  { label: "Rep", teamAssignable: true, value: "rep" },
  { label: "Manager", teamAssignable: true, value: "manager" },
  { label: "Executive", teamAssignable: false, value: "executive" },
  { label: "Admin", teamAssignable: false, value: "admin" },
] as const;

type InviteRole = (typeof ONBOARDING_INVITE_ROLES)[number]["value"];

function autoSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const panelClass =
  "forge-surface rounded-xl border border-[var(--forge-border)] bg-[var(--forge-panel-bg)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)] sm:p-5";
const labelClass = "text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--forge-muted)]";
const inputClass = "forge-form-control mt-2 min-h-11 rounded-lg px-3 py-2.5 text-sm outline-none";
const primaryButtonClass =
  "forge-button forge-button-primary forge-focus-ring min-h-11 justify-center rounded-lg px-4 py-2.5 text-sm disabled:opacity-50";
const secondaryButtonClass =
  "forge-button forge-button-secondary forge-focus-ring min-h-11 justify-center rounded-lg px-4 py-2.5 text-sm";

function roleCanBeAssignedToTeams(role: InviteRole) {
  return ONBOARDING_INVITE_ROLES.some(
    (inviteRole) => inviteRole.value === role && inviteRole.teamAssignable,
  );
}

export function OnboardingPanel({
  accessMode = "invite-only",
  note,
  userEmail,
}: OnboardingPanelProps) {
  const router = useRouter();
  const canCreateOrganization = accessMode === "open" || accessMode === "bootstrap-admin";
  const canJoinBySlug = false;
  const initialStep: Step = canCreateOrganization ? "create" : canJoinBySlug ? "join" : "choose";
  const [step, setStep] = useState<Step>(initialStep);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("rep");
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  async function submit(
    path: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void,
  ) {
    setError(null);
    setIsMutating(true);

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to complete onboarding.");
      setIsMutating(false);
      return;
    }

    if (onSuccess) {
      setIsMutating(false);
      onSuccess();
    } else {
      router.push(ONBOARDING_ENDPOINTS.dashboard);
      router.refresh();
    }
  }

  async function loadTeams() {
    if (teamsLoaded) return;
    const response = await fetch(ONBOARDING_ENDPOINTS.teams);
    if (response.ok) {
      const data = (await response.json()) as { id: string; name: string }[];
      setTeams(data);
    }
    setTeamsLoaded(true);
  }

  const onboardingStatusMessage = isMutating
    ? step === "create"
      ? "Creating organization."
      : step === "join"
        ? "Joining organization."
        : step === "invite"
          ? "Sending invite."
          : "Updating onboarding."
    : "";
  const activeFlow: FlowStep = step === "join" || step === "invite" ? step : "create";
  const isInviteOnly = !canCreateOrganization && !canJoinBySlug;
  const introCopy =
    accessMode === "invite-only"
      ? "Existing workspace access starts with an admin invite. Organization owners can choose a plan to create a workspace."
      : accessMode === "bootstrap-admin"
        ? "Set up the first Argos workspace for your company."
        : (note ?? "Create a new workspace, then invite your team to unlock the Argos workspace.");

  function showCreateStep() {
    setError(null);
    setInviteSuccess(null);
    if (canCreateOrganization) setStep("create");
  }

  function showJoinStep() {
    setError(null);
    setInviteSuccess(null);
    if (canJoinBySlug) setStep("join");
  }

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <SetupRail currentStep={step} userEmail={userEmail} />

      <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-5 text-left sm:text-center">
            <p className="forge-page-eyebrow">Workspace access</p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--forge-text)]">
              Welcome to Argos
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
              {introCopy}
            </p>
          </div>

          <div aria-live="polite" className="sr-only" role="status">
            {onboardingStatusMessage}
          </div>

          {isInviteOnly ? null : (
            <FlowTabs
              activeFlow={activeFlow}
              canCreateOrganization={canCreateOrganization}
              canJoinBySlug={canJoinBySlug}
              isInviteStep={step === "invite"}
              onCreate={showCreateStep}
              onJoin={showJoinStep}
            />
          )}

          {isInviteOnly ? (
            <InviteRequiredPanel userEmail={userEmail} />
          ) : step === "join" && canJoinBySlug ? (
            <JoinPanel
              error={error}
              isMutating={isMutating}
              joinSlug={joinSlug}
              onJoinSlugChange={setJoinSlug}
              onSubmit={() => {
                void submit(ONBOARDING_ENDPOINTS.joinOrganization, { slug: joinSlug });
              }}
            />
          ) : step === "invite" ? (
            <InvitePanel
              error={error}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              inviteSuccess={inviteSuccess}
              inviteTeamIds={inviteTeamIds}
              isMutating={isMutating}
              onDashboard={() => {
                router.push(ONBOARDING_ENDPOINTS.dashboard);
                router.refresh();
              }}
              onEmailChange={setInviteEmail}
              onRoleChange={(role) => {
                setInviteRole(role);
                setInviteTeamIds([]);
                if (roleCanBeAssignedToTeams(role)) {
                  void loadTeams();
                }
              }}
              onSubmit={async () => {
                setError(null);
                setInviteSuccess(null);
                setIsMutating(true);
                const response = await fetch(ONBOARDING_ENDPOINTS.invites, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                    teamIds: inviteTeamIds.length > 0 ? inviteTeamIds : undefined,
                  }),
                });
                const data = (await response.json()) as { error?: string };
                setIsMutating(false);
                if (!response.ok) {
                  setError(data.error ?? "Unable to send invite.");
                } else {
                  setInviteSuccess(`Invite sent to ${inviteEmail}`);
                  setInviteEmail("");
                  setInviteTeamIds([]);
                }
              }}
              onTeamToggle={(teamId, checked) => {
                setInviteTeamIds((prev) =>
                  checked ? [...prev, teamId] : prev.filter((id) => id !== teamId),
                );
              }}
              teams={teams}
            />
          ) : (
            <CreatePanel
              accessMode={accessMode}
              error={error}
              isMutating={isMutating}
              name={name}
              onNameChange={(nextName) => {
                setName(nextName);
                setSlug(autoSlug(nextName));
              }}
              onSlugChange={(nextSlug) => setSlug(autoSlug(nextSlug))}
              onSubmit={() => {
                void submit(ONBOARDING_ENDPOINTS.createOrganization, { name, slug }, () => {
                  setStep("invite");
                });
              }}
              slug={slug}
            />
          )}

          {!isInviteOnly && step !== "invite" ? (
            <div className="mt-3 grid gap-2">
              {canCreateOrganization ? (
                <ActionRow
                  description={
                    accessMode === "bootstrap-admin"
                      ? "Set up the first Argos workspace for your company."
                      : "Start a new workspace from scratch."
                  }
                  icon="add_circle"
                  isActive={activeFlow === "create"}
                  onClick={showCreateStep}
                  title="Create Organization"
                />
              ) : null}
              {canJoinBySlug ? (
                <ActionRow
                  description="Enter your org slug to join the existing team as a rep."
                  icon="group_add"
                  isActive={activeFlow === "join"}
                  onClick={showJoinStep}
                  title="Join Organization"
                />
              ) : null}
              <div className="flex min-h-11 items-start gap-3 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] px-3 py-3 text-left">
                <ForgeIcon className="mt-0.5 text-[var(--forge-muted)]" name="info" size={18} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--forge-text)]">
                    Invite required for existing organizations
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--forge-muted)]">
                    If your team already uses Argos, accept an email invitation from an admin to join their workspace.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <ReadinessDrawer accessMode={accessMode} currentStep={step} />
    </div>
  );
}

function FlowTabs({
  activeFlow,
  canCreateOrganization,
  canJoinBySlug,
  isInviteStep,
  onCreate,
  onJoin,
}: {
  activeFlow: FlowStep;
  canCreateOrganization: boolean;
  canJoinBySlug: boolean;
  isInviteStep: boolean;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const tabs: Array<{
    disabled: boolean;
    id: FlowStep;
    label: string;
    onClick?: () => void;
  }> = [
    { disabled: !canCreateOrganization || isInviteStep, id: "create", label: "Create", onClick: onCreate },
    { disabled: !canJoinBySlug || isInviteStep, id: "join", label: "Join", onClick: onJoin },
    { disabled: !isInviteStep, id: "invite", label: "Invite" },
  ];

  return (
    <div className="mb-3 grid grid-cols-3 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] p-1">
      {tabs.map((tab) => {
        const isActive = activeFlow === tab.id;
        return (
          <button
            aria-pressed={isActive}
            className={[
              "forge-focus-ring min-h-11 rounded-md px-3 text-xs font-bold uppercase tracking-[0.08em] transition",
              isActive
                ? "bg-[var(--forge-gold)] text-[#291800]"
                : "text-[var(--forge-muted)] hover:bg-[color-mix(in_srgb,var(--forge-text)_4.5%,transparent)] hover:text-[var(--forge-text)]",
              tab.disabled ? "cursor-not-allowed opacity-45 hover:bg-transparent" : "",
            ].join(" ")}
            disabled={tab.disabled}
            key={tab.id}
            onClick={tab.onClick}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CreatePanel({
  accessMode,
  error,
  isMutating,
  name,
  onNameChange,
  onSlugChange,
  onSubmit,
  slug,
}: {
  accessMode: OnboardingAccessMode;
  error: string | null;
  isMutating: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: () => void;
  slug: string;
}) {
  return (
    <div className={panelClass}>
      <div className="flex flex-col gap-2 border-b border-[var(--forge-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={labelClass}>Create workspace</p>
          <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
            Create Organization
          </h2>
        </div>
        <span className="inline-flex min-h-7 w-fit items-center rounded-md border border-[color-mix(in_srgb,var(--forge-gold)_26%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_8%,transparent)] px-2 text-xs font-semibold text-[var(--forge-gold)]">
          {accessMode === "bootstrap-admin" ? "Bootstrap admin" : "Admin setup"}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block text-left">
          <span className={labelClass}>Organization Name</span>
          <input
            className={inputClass}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Acme Corp"
            type="text"
            value={name}
          />
        </label>

        <label className="block text-left">
          <span className={labelClass}>Organization Slug</span>
          <span className="mt-2 flex min-w-0 overflow-hidden rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] focus-within:border-[var(--forge-gold)]/60">
            <span className="flex min-h-11 shrink-0 items-center border-r border-[var(--forge-border)] px-3 text-xs text-[var(--forge-muted)]">
              argos.app/
            </span>
            <input
              className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--forge-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--forge-text)_34%,transparent)]"
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder="acme-corp"
              type="text"
              value={slug}
            />
          </span>
        </label>
      </div>

      {error ? (
        <ForgeErrorState
          className="mt-4 px-4 py-4"
          description={error}
          title="Onboarding update failed"
        />
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className={`${primaryButtonClass} flex-1`}
          disabled={!name.trim() || !slug.trim() || isMutating}
          onClick={onSubmit}
          type="button"
        >
          {isMutating ? "Creating..." : "Create Organization"}
        </button>
        <form action="/auth/signout" method="post">
          <button
            className="forge-focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-[var(--forge-muted)] transition hover:text-[var(--forge-gold)]"
            type="submit"
          >
            Use a different email
          </button>
        </form>
      </div>
    </div>
  );
}

function JoinPanel({
  error,
  isMutating,
  joinSlug,
  onJoinSlugChange,
  onSubmit,
}: {
  error: string | null;
  isMutating: boolean;
  joinSlug: string;
  onJoinSlugChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={panelClass}>
      <div className="border-b border-[var(--forge-border)] pb-4">
        <p className={labelClass}>Existing workspace</p>
        <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
          Join Organization
        </h2>
      </div>

      <div className="mt-4">
        <label className="block text-left">
          <span className={labelClass}>Organization Slug</span>
          <input
            className={inputClass}
            onChange={(event) => onJoinSlugChange(event.target.value.toLowerCase())}
            placeholder="acme-corp"
            type="text"
            value={joinSlug}
          />
        </label>
      </div>

      {error ? (
        <ForgeErrorState
          className="mt-4 px-4 py-4"
          description={error}
          title="Onboarding update failed"
        />
      ) : null}

      <div className="mt-5 flex">
        <button
          className={`${primaryButtonClass} w-full`}
          disabled={!joinSlug.trim() || isMutating}
          onClick={onSubmit}
          type="button"
        >
          {isMutating ? "Joining..." : "Join Organization"}
        </button>
      </div>
    </div>
  );
}

function InvitePanel({
  error,
  inviteEmail,
  inviteRole,
  inviteSuccess,
  inviteTeamIds,
  isMutating,
  onDashboard,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onTeamToggle,
  teams,
}: {
  error: string | null;
  inviteEmail: string;
  inviteRole: InviteRole;
  inviteSuccess: string | null;
  inviteTeamIds: string[];
  isMutating: boolean;
  onDashboard: () => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: InviteRole) => void;
  onSubmit: () => void;
  onTeamToggle: (teamId: string, checked: boolean) => void;
  teams: { id: string; name: string }[];
}) {
  return (
    <div className={panelClass}>
      <div className="border-b border-[var(--forge-border)] pb-4">
        <p className={labelClass}>Team launch</p>
        <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
          Invite Your Team
        </h2>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block text-left">
          <span className={labelClass}>Email</span>
          <input
            className={inputClass}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="teammate@company.com"
            type="email"
            value={inviteEmail}
          />
        </label>

        <label className="block text-left">
          <span className={labelClass}>Role</span>
          <select
            className={inputClass}
            onChange={(event) => onRoleChange(event.target.value as InviteRole)}
            value={inviteRole}
          >
            {ONBOARDING_INVITE_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        {roleCanBeAssignedToTeams(inviteRole) ? (
          <div className="block text-left">
            <span className={labelClass}>Teams optional</span>
            {teams.length === 0 ? (
              <p className="mt-2 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 py-3 text-sm text-[var(--forge-muted)]">
                You can assign teams later from settings.
              </p>
            ) : (
              <div className="mt-2 grid gap-2">
                {teams.map((team) => (
                  <label
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-3 text-sm text-[var(--forge-text)]"
                    key={team.id}
                  >
                    <input
                      checked={inviteTeamIds.includes(team.id)}
                      className="forge-focus-ring h-4 w-4 accent-[var(--forge-gold)]"
                      onChange={(event) => onTeamToggle(team.id, event.target.checked)}
                      type="checkbox"
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <ForgeErrorState
          className="mt-4 px-4 py-4"
          description={error}
          title="Onboarding update failed"
        />
      ) : null}
      {inviteSuccess ? (
        <ForgeStatusPanel
          announce="polite"
          className="mt-4 px-4 py-4"
          description={inviteSuccess}
          icon="mark_email_read"
          title="Invite sent"
          tone="success"
        />
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className={`${primaryButtonClass} flex-1`}
          disabled={!inviteEmail.trim() || isMutating}
          onClick={onSubmit}
          type="button"
        >
          {isMutating ? "Sending..." : "Send Invite"}
        </button>
        <button
          className={`${secondaryButtonClass} flex-1`}
          onClick={onDashboard}
          type="button"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function InviteRequiredPanel({ userEmail }: { userEmail?: string | null }) {
  const inviteEmailText = userEmail
    ? `Ask your admin to send an invite to ${userEmail}.`
    : "Ask your admin to send an invite to your work email.";

  return (
    <div className={panelClass}>
      <ForgeStatusPanel
        announce="polite"
        className="px-4 py-4"
        description={inviteEmailText}
        icon="mark_email_read"
        title="Joining an existing workspace?"
        tone="gold"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] px-4 py-4">
          <p className={labelClass}>Joining a team</p>
          <h2 className="mt-2 text-base font-semibold text-[var(--forge-text)]">
            Wait for the admin invite
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
            Reps and managers join through the invite link their workspace admin sends.
          </p>
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--forge-gold)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_7%,transparent)] px-4 py-4">
          <p className={labelClass}>Setting up Argos</p>
          <h2 className="mt-2 text-base font-semibold text-[var(--forge-text)]">
            Start an organization
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
            If you own the rollout, choose a plan to create a workspace for your team.
          </p>
          <a
            className={`${primaryButtonClass} mt-4 inline-flex w-full sm:w-auto`}
            href="/#access"
          >
            View plans
          </a>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/auth/signout" method="post">
          <button
            className={`${secondaryButtonClass} inline-flex w-full sm:w-auto`}
            type="submit"
          >
            Use a different email
          </button>
        </form>
        <p className="text-sm leading-6 text-[var(--forge-muted)]">
          Already have an invite? Open the link from your email to continue.
        </p>
      </div>
    </div>
  );
}

function ActionRow({
  description,
  icon,
  isActive,
  onClick,
  title,
}: {
  description: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={[
        "forge-focus-ring flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition",
        isActive
          ? "border-[color-mix(in_srgb,var(--forge-gold)_34%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_8%,transparent)]"
          : "border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] hover:border-[color-mix(in_srgb,var(--forge-gold)_30%,transparent)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface-2)] text-[var(--forge-muted)]">
          <ForgeIcon name={icon} size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--forge-text)]">
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-[var(--forge-muted)]">
            {description}
          </span>
        </span>
      </span>
      <ForgeIcon className="text-[var(--forge-muted)]" name="chevron_right" size={18} />
    </button>
  );
}

function SetupRail({
  currentStep,
  userEmail,
}: {
  currentStep: Step;
  userEmail?: string | null;
}) {
  const workspaceStatus = currentStep === "invite" ? "complete" : "active";
  const launchStatus = currentStep === "invite" ? "active" : "pending";

  return (
    <aside className="border-b border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)] px-4 py-5 lg:border-r lg:border-b-0 lg:px-5">
      <div className="mb-5 min-w-0">
        <p className={labelClass}>Account</p>
        <p className="mt-1 truncate text-sm text-[var(--forge-text)]">
          {userEmail ?? "Authenticated user"}
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <SetupStep
          description="Authentication complete"
          status="complete"
          title="Identity verified"
        />
        <SetupStep
          description={currentStep === "invite" ? "Organization created" : "Create or join an org"}
          status={workspaceStatus}
          title="Workspace access"
        />
        <SetupStep
          description={currentStep === "invite" ? "Invite teammates or continue" : "Configure workspace"}
          status={launchStatus}
          title="Team launch"
        />
      </ol>
    </aside>
  );
}

function SetupStep({
  description,
  status,
  title,
}: {
  description: string;
  status: "active" | "complete" | "pending";
  title: string;
}) {
  const dotClass =
    status === "complete"
      ? "border-[var(--forge-success)] bg-[color-mix(in_srgb,var(--forge-success)_12%,transparent)] text-[var(--forge-success)]"
      : status === "active"
        ? "border-[var(--forge-gold)] bg-[color-mix(in_srgb,var(--forge-gold)_12%,transparent)] text-[var(--forge-gold)]"
        : "border-[var(--forge-border)] bg-transparent text-[var(--forge-faint)]";

  return (
    <li className={status === "pending" ? "flex gap-3 opacity-55" : "flex gap-3"}>
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${dotClass}`}
      >
        <ForgeIcon
          name={status === "complete" ? "check" : status === "active" ? "radio_button_checked" : "radio_button_unchecked"}
          size={14}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--forge-text)]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--forge-muted)]">
          {description}
        </span>
      </span>
    </li>
  );
}

function ReadinessDrawer({
  accessMode,
  currentStep,
}: {
  accessMode: OnboardingAccessMode;
  currentStep: Step;
}) {
  const inviteOnly = accessMode === "invite-only" && currentStep === "choose";
  const organizationReady = currentStep === "invite";
  const rows = inviteOnly
    ? [
        { detail: "Authenticated", icon: "check", status: "success", title: "Account verified" },
        { detail: "Admin invitation required", icon: "mail", status: "warning", title: "Invite required" },
        { detail: "Unavailable until accepted", icon: "lock", status: "muted", title: "Workspace locked" },
      ]
    : [
        { detail: "Authenticated", icon: "check", status: "success", title: "Account verified" },
        {
          detail: organizationReady ? "Workspace created" : "Create or join required",
          icon: organizationReady ? "check" : "warning",
          status: organizationReady ? "success" : "warning",
          title: organizationReady ? "Organization created" : "Organization missing",
        },
        {
          detail: organizationReady ? "Ready to send" : "Available after creation",
          icon: "group_add",
          status: organizationReady ? "info" : "muted",
          title: "Team invites optional",
        },
        {
          detail: organizationReady ? "Dashboard available" : "Locked until setup",
          icon: organizationReady ? "lock_open" : "lock",
          status: organizationReady ? "success" : "muted",
          title: organizationReady ? "Workspace ready" : "Workspace locked",
        },
      ];

  return (
    <aside className="border-t border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)] px-4 py-5 lg:border-t-0 lg:border-l lg:px-5">
      <p className={labelClass}>Workspace readiness</p>
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <ReadinessRow
            detail={row.detail}
            icon={row.icon}
            key={row.title}
            status={row.status as "info" | "muted" | "success" | "warning"}
            title={row.title}
          />
        ))}
      </div>
    </aside>
  );
}

function ReadinessRow({
  detail,
  icon,
  status,
  title,
}: {
  detail: string;
  icon: string;
  status: "info" | "muted" | "success" | "warning";
  title: string;
}) {
  const toneClass =
    status === "success"
      ? "border-[color-mix(in_srgb,var(--forge-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_8%,transparent)] text-[var(--forge-success)]"
      : status === "warning"
        ? "border-[color-mix(in_srgb,var(--forge-ember)_34%,transparent)] bg-[color-mix(in_srgb,var(--forge-ember)_8%,transparent)] text-[var(--forge-ember)]"
        : status === "info"
          ? "border-[color-mix(in_srgb,var(--forge-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--forge-cyan)_8%,transparent)] text-[var(--forge-cyan)]"
          : "border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3%,transparent)] text-[var(--forge-muted)]";

  return (
    <div className={`flex min-h-14 items-start gap-3 rounded-lg border px-3 py-3 ${toneClass}`}>
      <ForgeIcon className="mt-0.5" name={icon} size={18} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--forge-text)]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--forge-muted)]">
          {detail}
        </span>
      </span>
    </div>
  );
}
