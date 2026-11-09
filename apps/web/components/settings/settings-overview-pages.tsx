import { ForgeChip } from "../forge";
import type { TeamAccessSnapshot } from "@/lib/team-access/service";
import type { RubricInput, RubricSummary, RubricWithCategories } from "@/lib/rubrics/types";
import styles from "./settings-workspace.module.css";

type TeamsOverviewProps = Pick<TeamAccessSnapshot, "teams" | "memberships">;
type PermissionsOverviewProps = TeamsOverviewProps & Pick<TeamAccessSnapshot, "grants">;

function teamCoverage(teams: TeamsOverviewProps["teams"], memberships: TeamsOverviewProps["memberships"]) {
  return teams.map((team) => ({
    ...team,
    managers: memberships.filter((membership) => membership.teamId === team.id && membership.membershipType === "manager").length,
    reps: memberships.filter((membership) => membership.teamId === team.id && membership.membershipType === "rep").length,
  }));
}

export function TeamsSettingsOverview({ teams, memberships }: TeamsOverviewProps) {
  const rows = teamCoverage(teams, memberships);
  return (
    <section className={styles.overview} data-teams-route="overview" aria-label="Team structure and coverage">
      <div className={styles.tableShell}>
        {!rows.length ? <p className={styles.empty}>Teams appear here after the first team is created.</p> : <>
          <div className={styles.desktop}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Team</th><th scope="col">Managers</th><th scope="col">Reps</th><th scope="col">Status</th></tr></thead>
              <tbody>{rows.map((team) => <tr key={team.id}>
                <td><p className={styles.name}>{team.name}</p>{team.description && <p className={styles.muted}>{team.description}</p>}</td>
                <td className={styles.number}>{team.managers}</td><td className={styles.number}>{team.reps}</td>
                <td><ForgeChip tone={team.status === "active" ? "success" : "muted"}>{team.status}</ForgeChip></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className={styles.mobile}>{rows.map((team) => <article className={styles.mobileRow} key={team.id}>
            <div className={styles.heading}><h2>{team.name}</h2><ForgeChip tone={team.status === "active" ? "success" : "muted"}>{team.status}</ForgeChip></div>
            {team.description && <p className={styles.muted}>{team.description}</p>}
            <dl className={styles.facts}><div><dt>Managers</dt><dd className={styles.number}>{team.managers}</dd></div><div><dt>Reps</dt><dd className={styles.number}>{team.reps}</dd></div></dl>
          </article>)}</div>
        </>}
      </div>
    </section>
  );
}

export function PermissionsSettingsOverview({ teams, memberships, grants }: PermissionsOverviewProps) {
  const rows = teamCoverage(teams, memberships).map((team) => ({ ...team, grants: grants.filter((grant) => grant.teamId === team.id).length }));
  const status = (team: typeof rows[number]) => <ForgeChip tone={team.managers > 0 && team.reps > 0 ? "success" : "muted"}>{team.managers > 0 && team.reps > 0 ? "Covered" : "Needs setup"}</ForgeChip>;
  return (
    <section className={styles.overview} data-permissions-route="overview" aria-label="Team access coverage">
      <div className={styles.tableShell}>
        {!rows.length ? <p className={styles.empty}>Team access appears here after teams and memberships are created.</p> : <>
          <div className={styles.desktop}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Team</th><th scope="col">Managers</th><th scope="col">Reps</th><th scope="col">Grants</th><th scope="col">Status</th></tr></thead>
              <tbody>{rows.map((team) => <tr key={team.id}>
                <td><p className={styles.name}>{team.name}</p>{team.description && <p className={styles.muted}>{team.description}</p>}</td>
                <td className={styles.number}>{team.managers}</td><td className={styles.number}>{team.reps}</td><td className={styles.number}>{team.grants}</td><td>{status(team)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className={styles.mobile}>{rows.map((team) => <article className={styles.mobileRow} key={team.id}>
            <div className={styles.heading}><h2>{team.name}</h2>{status(team)}</div>
            {team.description && <p className={styles.muted}>{team.description}</p>}
            <dl className={styles.facts}><div><dt>Managers</dt><dd className={styles.number}>{team.managers}</dd></div><div><dt>Reps</dt><dd className={styles.number}>{team.reps}</dd></div><div><dt>Grants</dt><dd className={styles.number}>{team.grants}</dd></div></dl>
          </article>)}</div>
        </>}
      </div>
    </section>
  );
}

function formatSettingsDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function RubricStatus({ entry }: { entry: RubricSummary }) {
  return <ForgeChip tone={entry.isActive ? "success" : entry.status === "draft" ? "gold" : "muted"}>{entry.isActive ? "Active" : entry.status}</ForgeChip>;
}

export function RubricSettingsOverview({ activeRubric, history, defaultTemplate }: {
  activeRubric: RubricWithCategories | null;
  history: RubricSummary[];
  defaultTemplate: RubricInput;
}) {
  const current = activeRubric ?? defaultTemplate;
  return (
    <section className={styles.overview} data-rubric-route="overview">
      <section className={styles.rubricSummary} aria-label="Active rubric">
        <div className={styles.heading}>
          <div><h2>{activeRubric?.name ?? "Default template"}</h2><p>{activeRubric?.description ?? "The starter rubric is used until an admin publishes a custom version."}</p></div>
          <ForgeChip tone={activeRubric ? "success" : "muted"}>{activeRubric ? `Active · v${activeRubric.version}` : "Default"}</ForgeChip>
        </div>
        <dl className={styles.facts}><div><dt>Categories</dt><dd className={styles.number}>{current.categories.length}</dd></div>{activeRubric && <div><dt>Updated</dt><dd>{formatSettingsDate(activeRubric.updatedAt)}</dd></div>}</dl>
      </section>
      <section aria-labelledby="rubric-version-history-title">
        <h2 className={styles.sectionTitle} id="rubric-version-history-title">Version history</h2>
        <div className={styles.tableShell}>
          {!history.length ? <p className={styles.empty}>Published rubric versions appear here after the first custom rubric is activated.</p> : <>
            <div className={styles.desktop}>
              <table className={styles.table}>
                <thead><tr><th scope="col">Rubric</th><th scope="col">Version</th><th scope="col">Status</th><th scope="col">Categories</th><th scope="col">Updated</th></tr></thead>
                <tbody>{history.map((entry) => <tr key={entry.id}>
                  <td><p className={styles.name}>{entry.name}</p>{entry.description && <p className={styles.muted}>{entry.description}</p>}</td>
                  <td className={styles.number}>v{entry.version}</td><td><RubricStatus entry={entry}/></td><td className={styles.number}>{entry.categoryCount}</td><td className={styles.muted}>{formatSettingsDate(entry.updatedAt)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className={styles.mobile}>{history.map((entry) => <article className={styles.mobileRow} key={entry.id}>
              <div className={styles.heading}><h2>{entry.name}</h2><RubricStatus entry={entry}/></div>
              {entry.description && <p className={styles.muted}>{entry.description}</p>}
              <dl className={styles.facts}><div><dt>Version</dt><dd className={styles.number}>v{entry.version}</dd></div><div><dt>Categories</dt><dd className={styles.number}>{entry.categoryCount}</dd></div><div><dt>Updated</dt><dd>{formatSettingsDate(entry.updatedAt)}</dd></div></dl>
            </article>)}</div>
          </>}
        </div>
      </section>
    </section>
  );
}
