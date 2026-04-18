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

type OnboardingPanelProps = {
  inviteEmailAvailable: boolean;
  inviteEmailReason: string | null;
};

export function OnboardingPanel({
  inviteEmailAvailable,
  inviteEmailReason,
}: OnboardingPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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

    setIsMutating(false);

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
            className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] px-6 py-7 text-left shadow-[0_18px_60px_rgba(2,8,23,0.28)] transition hover:border-[#74b1ff]/30"
            onClick={() => {
              setError(null);
              setStep("create");
            }}
            type="button"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
              Create
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#ecedf6]">Create Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[#a9abb3]">
              Set up a new team and become the admin for your Argos workspace.
            </p>
          </button>
          <button
            className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] px-6 py-7 text-left shadow-[0_18px_60px_rgba(2,8,23,0.28)] transition hover:border-[#74b1ff]/30"
            onClick={() => {
              setError(null);
              setStep("join");
            }}
            type="button"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
              Join
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#ecedf6]">Join With Invite</h2>
            <p className="mt-3 text-lg leading-8 text-[#a9abb3]">
              Ask an Argos admin for an invite link, then accept it while signed in with the invited email.
            </p>
          </button>
        </div>
      ) : null}

      {step === "create" ? (
        <div className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] px-6 py-7 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
            Create Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a9abb3]">Organization Name</span>
              <input
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#a9abb3] focus:border-[#74b1ff]/60"
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
              <span className="text-sm font-medium text-[#a9abb3]">Organization Slug</span>
              <input
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#a9abb3] focus:border-[#74b1ff]/60"
                onChange={(event) => setSlug(autoSlug(event.target.value))}
                placeholder="acme-corp"
                type="text"
                value={slug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-xl border border-[#45484f]/20 px-4 py-3 text-base font-medium text-[#a9abb3] transition hover:border-[#74b1ff]/30 hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-base font-bold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
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
        <div className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] px-6 py-7 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
            Join With Invite
          </p>
          <div className="mt-6 space-y-4 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 text-left">
            <p className="text-sm font-medium text-[#ecedf6]">Direct org slug joins are disabled.</p>
            <p className="text-sm leading-7 text-[#a9abb3]">
              To join an existing workspace, ask your Argos admin to send you an invite from the
              People settings page. Open the invite link while signed in with the invited email to
              accept membership.
            </p>
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-xl border border-[#45484f]/20 px-4 py-3 text-base font-medium text-[#a9abb3] transition hover:border-[#74b1ff]/30 hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
          </div>
        </div>
      ) : null}

      {step === "invite" ? (
        <div className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] px-6 py-7 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
            Invite Your Team
          </p>
          {!inviteEmailAvailable ? (
            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-left text-sm text-amber-200">
              <p className="font-medium text-amber-100">Invite delivery is unavailable.</p>
              <p className="mt-2 leading-7">
                {inviteEmailReason ??
                  "Configure invite email delivery before sending onboarding invites from this environment."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a9abb3]">Email</span>
              <input
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#a9abb3] focus:border-[#74b1ff]/60"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block text-left">
              <span className="text-sm font-medium text-[#a9abb3]">Role</span>
              <select
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-lg text-white outline-none transition focus:border-[#74b1ff]/60"
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
                <span className="text-sm font-medium text-[#a9abb3]">Teams (optional)</span>
                {teams.length === 0 ? (
                  <p className="mt-2 text-sm text-[#a9abb3]">
                    You can assign teams later from settings.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 text-white">
                        <input
                          checked={inviteTeamIds.includes(team.id)}
                          className="accent-[#74b1ff]"
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
          )}

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {inviteSuccess ? <p className="mt-4 text-sm text-green-400">{inviteSuccess}</p> : null}

          <div className="mt-6 flex gap-3">
            {inviteEmailAvailable ? (
              <button
                className="flex-1 rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-base font-bold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
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
            ) : (
              <span className="flex flex-1 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-base font-semibold text-amber-200">
                Setup required
              </span>
            )}
            <button
              className="flex-1 rounded-xl border border-[#45484f]/20 px-4 py-3 text-base font-medium text-[#a9abb3] transition hover:border-[#74b1ff]/30 hover:text-white"
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
