"use client";

type TeamAccessPanelProps = {
  canManage: boolean;
  teams: Array<{ id: string; name: string; description: string | null; status: string }>;
  managers: Array<{ id: string; name: string }>;
  reps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
};

const PRESET_LABELS = ["Coach", "Training Manager", "Team Lead"] as const;

export function TeamAccessPanel({
  canManage,
  teams,
  managers,
  reps,
}: TeamAccessPanelProps) {
  const managerNameById = new Map(managers.map((manager) => [manager.id, manager.name]));

  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Workspace
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Team Access</h2>
          <p className="mt-2 text-sm text-slate-400">
            Configure teams, assign an accountable manager, and keep permission presets visible in one place.
          </p>
        </div>
        <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {teams.length} teams
        </span>
      </div>

      {!canManage ? (
        <p className="mt-5 text-sm text-slate-400">Only admins can manage teams and grants.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {teams.length ? (
                teams.map((team) => (
                  <article
                    className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4"
                    key={team.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{team.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {team.description ?? "No description provided yet."}
                        </p>
                      </div>
                      <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                        {team.status}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-700/70 bg-slate-950/15 px-4 py-5 text-sm text-slate-400">
                  No teams created yet. Start by grouping setters, closers, or pods into team buckets.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
                <p className="text-sm font-semibold text-slate-200">Primary manager</p>
                <p className="mt-1 text-sm text-slate-400">
                  Assign one accountable owner per rep while preserving multi-team memberships.
                </p>
                <div className="mt-4 space-y-3">
                  {reps.length ? (
                    reps.map((rep) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3"
                        key={rep.id}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{rep.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Primary manager
                          </p>
                        </div>
                        <span className="text-sm text-slate-300">
                          {rep.primaryManagerId
                            ? (managerNameById.get(rep.primaryManagerId) ?? "Assigned")
                            : "Unassigned"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No reps are available for manager assignment yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
                <p className="text-sm font-semibold text-slate-200">Permission presets</p>
                <p className="mt-1 text-sm text-slate-400">
                  Use simple presets before reaching for custom per-team overrides.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESET_LABELS.map((preset) => (
                    <span
                      className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-medium text-slate-300"
                      key={preset}
                    >
                      {preset}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3 text-sm text-slate-400">
                  {managers.length
                    ? `${managers.length} managers available for team-level grant presets.`
                    : "No managers are available for grant presets yet."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
