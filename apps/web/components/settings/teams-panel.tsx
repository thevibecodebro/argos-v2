"use client";

import { useState } from "react";

type Team = {
  id: string;
  name: string;
  description: string | null;
};

type TeamMember = {
  userId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type TeamsPanelProps = {
  teams: Team[];
  // Map of teamId → primary manager userId (or null)
  primaryManagerMap: Record<string, string | null>;
  // Map of teamId → members
  membersByTeam: Record<string, TeamMember[]>;
  // All org members (for name lookups)
  orgMembers: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  }>;
};

export function TeamsPanel({
  teams,
  primaryManagerMap,
  membersByTeam,
  orgMembers,
}: TeamsPanelProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  function displayName(member: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    return (
      [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
      member.email
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              Teams
            </p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              View team structure, primary managers, and rep assignments.
            </p>
          </div>
          <span className="rounded-full border border-[#45484f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
            {teams.length} {teams.length === 1 ? "team" : "teams"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {teams.length === 0 ? (
            <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-5 py-6 text-center">
              <p className="text-sm font-medium text-[#ecedf6]">No teams yet</p>
              <p className="mt-2 text-sm text-[#a9abb3]">
                Teams are created during onboarding. Contact support if you
                need to add or restructure teams.
              </p>
            </div>
          ) : (
            teams.map((team) => {
              const primaryManagerId = primaryManagerMap[team.id] ?? null;
              const primaryManager = primaryManagerId
                ? orgMembers.find((m) => m.id === primaryManagerId)
                : null;
              const teamMembers = membersByTeam[team.id] ?? [];
              const reps = teamMembers.filter((m) => m.role === "rep");
              const isExpanded = expandedTeamId === team.id;

              return (
                <div
                  key={team.id}
                  className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 overflow-hidden"
                >
                  {/* Team header row */}
                  <button
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[#74b1ff]/5"
                    onClick={() =>
                      setExpandedTeamId(isExpanded ? null : team.id)
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="material-symbols-outlined shrink-0 text-[#a9abb3]"
                        style={{ fontSize: "18px" }}
                      >
                        groups
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {team.name}
                        </p>
                        {team.description ? (
                          <p className="mt-0.5 text-xs text-[#a9abb3] truncate">
                            {team.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#a9abb3] uppercase tracking-[0.18em]">
                        {reps.length} {reps.length === 1 ? "rep" : "reps"}
                      </span>
                      <span
                        className="material-symbols-outlined text-[#a9abb3] transition-transform"
                        style={{
                          fontSize: "18px",
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded ? (
                    <div className="border-t border-[#45484f]/20 px-4 py-4 space-y-4">
                      {/* Primary manager */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                          Primary Manager
                        </p>
                        {primaryManager ? (
                          <p className="mt-2 text-sm text-white">
                            {displayName(primaryManager)}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-amber-300">
                            No primary manager assigned. Go to{" "}
                            <a
                              className="underline hover:text-amber-200"
                              href="/settings/permissions"
                            >
                              Permissions
                            </a>{" "}
                            to assign one.
                          </p>
                        )}
                      </div>

                      {/* Reps */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                          Reps
                        </p>
                        {reps.length === 0 ? (
                          <p className="mt-2 text-sm text-[#a9abb3]">
                            No reps on this team yet.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1">
                            {reps.map((rep) => (
                              <li
                                key={rep.userId}
                                className="flex items-center gap-2 text-sm text-[#ecedf6]"
                              >
                                <span
                                  className="material-symbols-outlined text-[#a9abb3]"
                                  style={{ fontSize: "16px" }}
                                >
                                  person
                                </span>
                                {displayName(rep)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
