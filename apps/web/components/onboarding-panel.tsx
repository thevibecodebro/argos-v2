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
            className="rounded-[1.5rem] border border-[#182748] bg-[#101a30] px-6 py-7 text-left shadow-[0_18px_50px_rgba(2,8,23,0.35)] transition hover:border-[#2857cc]"
            onClick={() => {
              setError(null);
              setStep("create");
            }}
            type="button"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
              Create
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#e5eeff]">Create Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[#7283a9]">
              Set up a new team and become the admin for your Argos workspace.
            </p>
          </button>
          <button
            className="rounded-[1.5rem] border border-[#182748] bg-[#101a30] px-6 py-7 text-left shadow-[0_18px_50px_rgba(2,8,23,0.35)] transition hover:border-[#2857cc]"
            onClick={() => {
              setError(null);
              setStep("join");
            }}
            type="button"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
              Join
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#e5eeff]">Join Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[#7283a9]">
              Enter your org slug to join the existing team as a rep.
            </p>
          </button>
        </div>
      ) : null}

      {step === "create" ? (
        <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
            Create Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Organization Name</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
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
              <span className="text-sm font-medium text-[#a8b8da]">Organization Slug</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(event) => setSlug(autoSlug(event.target.value))}
                placeholder="acme-corp"
                type="text"
                value={slug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
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
        <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
            Join Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Organization Slug</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(event) => setJoinSlug(event.target.value.toLowerCase())}
                placeholder="acme-corp"
                type="text"
                value={joinSlug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
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
        <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
            Invite Your Team
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Email</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Role</span>
              <select
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition focus:border-[#4f96ff]"
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
                <span className="text-sm font-medium text-[#a8b8da]">Teams (optional)</span>
                {teams.length === 0 ? (
                  <p className="mt-2 text-sm text-[#4c5d85]">
                    You can assign teams later from settings.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 text-white">
                        <input
                          checked={inviteTeamIds.includes(team.id)}
                          className="accent-[#2c63f6]"
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

          {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}
          {inviteSuccess ? <p className="mt-4 text-sm text-green-400">{inviteSuccess}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
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
              className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
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
