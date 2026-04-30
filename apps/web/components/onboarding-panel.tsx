"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "choose" | "create" | "join" | "invite";

function autoSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const onboardingCardButtonClass =
  "forge-surface forge-surface--interactive forge-focus-ring rounded-[1.75rem] px-6 py-7 text-left transition";
const onboardingPanelClass = "forge-surface rounded-[1.75rem] px-6 py-7";
const onboardingEyebrowClass = "forge-page-eyebrow";
const onboardingLabelClass = "text-sm font-medium text-[var(--forge-muted)]";
const onboardingInputClass = "forge-form-control mt-2 px-4 py-3 text-base outline-none";
const onboardingPrimaryButtonClass =
  "forge-button forge-button-primary forge-focus-ring flex-1 px-4 py-3 text-sm disabled:opacity-50";
const onboardingSecondaryButtonClass =
  "forge-button forge-button-secondary forge-focus-ring flex-1 px-4 py-3 text-sm";

export function OnboardingPanel() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"rep" | "manager" | "executive" | "admin">("rep");
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
      onSuccess();
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function loadTeams() {
    if (teamsLoaded) return;
    const response = await fetch("/api/teams");
    if (response.ok) {
      const data = (await response.json()) as { id: string; name: string }[];
      setTeams(data);
    }
    setTeamsLoaded(true);
  }

  return (
    <div className="w-full">
      {step === "choose" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            className={onboardingCardButtonClass}
            onClick={() => {
              setError(null);
              setStep("create");
            }}
            type="button"
          >
            <p className={onboardingEyebrowClass}>
              Create
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--forge-text)]">Create Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[var(--forge-muted)]">
              Set up a new team and become the admin for your Argos workspace.
            </p>
          </button>
          <button
            className={onboardingCardButtonClass}
            onClick={() => {
              setError(null);
              setStep("join");
            }}
            type="button"
          >
            <p className={onboardingEyebrowClass}>
              Join
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--forge-text)]">Join Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[var(--forge-muted)]">
              Enter your org slug to join the existing team as a rep.
            </p>
          </button>
        </div>
      ) : null}

      {step === "create" ? (
        <div className={onboardingPanelClass}>
          <p className={onboardingEyebrowClass}>
            Create Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className={onboardingLabelClass}>Organization Name</span>
              <input
                className={onboardingInputClass}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  setSlug(autoSlug(nextName));
                }}
                placeholder="Acme Corp"
                type="text"
                value={name}
              />
            </label>

            <label className="block text-left">
              <span className={onboardingLabelClass}>Organization Slug</span>
              <input
                className={onboardingInputClass}
                onChange={(event) => setSlug(autoSlug(event.target.value))}
                placeholder="acme-corp"
                type="text"
                value={slug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[var(--forge-danger)]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className={onboardingSecondaryButtonClass}
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className={onboardingPrimaryButtonClass}
              disabled={!name.trim() || !slug.trim() || isMutating}
              onClick={() => {
                void submit("/api/organizations", { name, slug }, () => {
                  setStep("invite");
                });
              }}
              type="button"
            >
              {isMutating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "join" ? (
        <div className={onboardingPanelClass}>
          <p className={onboardingEyebrowClass}>
            Join Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className={onboardingLabelClass}>Organization Slug</span>
              <input
                className={onboardingInputClass}
                onChange={(event) => setJoinSlug(event.target.value.toLowerCase())}
                placeholder="acme-corp"
                type="text"
                value={joinSlug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[var(--forge-danger)]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className={onboardingSecondaryButtonClass}
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className={onboardingPrimaryButtonClass}
              disabled={!joinSlug.trim() || isMutating}
              onClick={() => {
                void submit("/api/organizations/join", { slug: joinSlug });
              }}
              type="button"
            >
              {isMutating ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "invite" ? (
        <div className={onboardingPanelClass}>
          <p className={onboardingEyebrowClass}>
            Invite Your Team
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className={onboardingLabelClass}>Email</span>
              <input
                className={onboardingInputClass}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block text-left">
              <span className={onboardingLabelClass}>Role</span>
              <select
                className={onboardingInputClass}
                onChange={(e) => {
                  const role = e.target.value as typeof inviteRole;
                  setInviteRole(role);
                  setInviteTeamIds([]);
                  if (role === "rep" || role === "manager") {
                    void loadTeams();
                  }
                }}
                value={inviteRole}
              >
                <option value="rep">Rep</option>
                <option value="manager">Manager</option>
                <option value="executive">Executive</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {(inviteRole === "rep" || inviteRole === "manager") ? (
              <div className="block text-left">
                <span className={onboardingLabelClass}>Teams (optional)</span>
                {teams.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--forge-muted)]">
                    You can assign teams later from settings.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 text-[var(--forge-text)]">
                        <input
                          checked={inviteTeamIds.includes(team.id)}
                          className="forge-focus-ring h-4 w-4 accent-[var(--forge-gold)]"
                          onChange={(e) => {
                            setInviteTeamIds(prev =>
                              e.target.checked
                                ? [...prev, team.id]
                                : prev.filter(id => id !== team.id),
                            );
                          }}
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

          {error ? <p className="mt-4 text-sm text-[var(--forge-danger)]">{error}</p> : null}
          {inviteSuccess ? <p className="mt-4 text-sm text-[var(--forge-success)]">{inviteSuccess}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className={onboardingPrimaryButtonClass}
              disabled={!inviteEmail.trim() || isMutating}
              onClick={async () => {
                setError(null);
                setInviteSuccess(null);
                setIsMutating(true);
                const response = await fetch("/api/invites", {
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
              type="button"
            >
              {isMutating ? "Sending..." : "Send Invite"}
            </button>
            <button
              className={onboardingSecondaryButtonClass}
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
              type="button"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
