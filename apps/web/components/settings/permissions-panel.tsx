"use client";

import { useState } from "react";

type PermissionsPanelProps = {
  reps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
  managers: Array<{ id: string; firstName: string | null; lastName: string | null; email: string }>;
  presets: Array<{
    id: string;
    name: string;
    role: string;
    permissions: string[];
  }>;
};

function managerDisplayName(manager: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ").trim();
  return name || manager.email;
}

function readError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return fallback;
}

export function PermissionsPanel({ reps, managers, presets }: PermissionsPanelProps) {
  const [localReps, setLocalReps] = useState(reps);
  const [stagedManagerByRepId, setStagedManagerByRepId] = useState<Record<string, string>>({});
  const [pendingRepId, setPendingRepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function applyPrimaryManager(repId: string) {
    const managerId = stagedManagerByRepId[repId];
    if (!managerId) return;

    setError(null);
    setNotice(null);
    setPendingRepId(repId);

    const response = await fetch(`/api/organizations/members/${repId}/primary-manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });

    const payload = (await response.json()) as { managerId?: string; error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to assign primary manager"));
      setPendingRepId(null);
      return;
    }

    setLocalReps((current) =>
      current.map((rep) =>
        rep.id === repId
          ? { ...rep, primaryManagerId: payload.managerId ?? managerId }
          : rep,
      ),
    );
    setStagedManagerByRepId((current) => {
      const next = { ...current };
      delete next[repId];
      return next;
    });
    setNotice("Primary manager updated.");
    setPendingRepId(null);
  }

  const hasStaged = (repId: string) => repId in stagedManagerByRepId;

  return (
    <div className="space-y-5">
      {/* Permission Presets */}
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
          Permission Presets
        </p>
        <p className="mt-2 text-sm text-[#a9abb3]">
          Predefined permission bundles you can apply to managers per team.
        </p>

        {presets.length === 0 ? (
          <p className="mt-5 text-sm text-[#a9abb3]">No permission presets configured.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <div
                className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4"
                key={preset.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  <span className="shrink-0 rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#74b1ff]">
                    {preset.role}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {preset.permissions.map((permission) => (
                    <li
                      className="flex items-center gap-2 text-xs text-[#a9abb3]"
                      key={permission}
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[#a9abb3]" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Primary Manager Assignments */}
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
          Primary Manager
        </p>
        <p className="mt-2 text-sm text-[#a9abb3]">
          Assign one accountable manager per rep while preserving multi-team memberships.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        {localReps.length === 0 ? (
          <p className="mt-5 text-sm text-[#a9abb3]">
            No reps are available for manager assignment yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {localReps.map((rep) => {
              const currentManagerId =
                stagedManagerByRepId[rep.id] ?? rep.primaryManagerId ?? "";
              const assignedManager = managers.find(
                (m) => m.id === rep.primaryManagerId,
              );
              const isPending = pendingRepId === rep.id;

              return (
                <div
                  className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4"
                  key={rep.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{rep.name}</p>
                      <p className="mt-1 text-xs text-[#a9abb3]">
                        {assignedManager ? (
                          <span>
                            Current:{" "}
                            <span className="text-[#a9abb3]">
                              {managerDisplayName(assignedManager)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-400">No manager assigned</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60 disabled:opacity-50"
                        disabled={isPending}
                        onChange={(event) => {
                          setStagedManagerByRepId((current) => ({
                            ...current,
                            [rep.id]: event.target.value,
                          }));
                        }}
                        value={currentManagerId}
                      >
                        <option value="">Select manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {managerDisplayName(manager)}
                          </option>
                        ))}
                      </select>
                      {hasStaged(rep.id) ? (
                        <button
                          className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-3 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
                          disabled={isPending}
                          onClick={() => {
                            void applyPrimaryManager(rep.id);
                          }}
                          type="button"
                        >
                          {isPending ? "Saving..." : "Apply"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
