import Link from "next/link";
import { ForgeIcon } from "./forge";
import { RoleplayPageHeader } from "./roleplay-page-header";
import type { RoleplaySession } from "@/lib/roleplay/types";
import styles from "./roleplay-pages.module.css";

export function RoleplayHistoryPanel({ sessions }: { sessions: RoleplaySession[] }) {
  const completedSessions = sessions.filter((session) => session.status === "complete");

  return (
    <>
      <RoleplayPageHeader activeTab="history" completedCount={completedSessions.length} />
      {completedSessions.length ? (
        <section aria-label="Completed roleplay sessions" className={styles.ledger} data-forge-table="true">
          <div className={styles.desktopHistory}>
            <table className={styles.table}>
              <caption className="sr-only">Completed roleplay sessions. Durations are estimated from the conversation length.</caption>
              <thead>
                <tr>
                  <th scope="col">Scenario / buyer</th>
                  <th scope="col">Score</th>
                  <th scope="col">Est. duration</th>
                  <th scope="col">Date</th>
                  <th scope="col"><span className="sr-only">Review session</span></th>
                </tr>
              </thead>
              <tbody>
                {completedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <p className={styles.scenario}>{scenarioLabel(session)}</p>
                      <p className={styles.buyer}>{personaLabel(session)}</p>
                      {session.origin === "generated_from_call" ? <p className={styles.source}>Generated from call</p> : null}
                    </td>
                    <td><SessionScore score={session.overallScore} /></td>
                    <td className={styles.numeric}>{formatDuration(session)}</td>
                    <td><time dateTime={session.createdAt}>{formatDate(session.createdAt)}</time></td>
                    <td><ReviewLink session={session} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.mobileHistory} data-roleplay-history-mobile="true">
            {completedSessions.map((session) => (
              <li key={session.id}>
                <div className={styles.mobileHeading}>
                  <div className={styles.sessionIdentity}>
                    <h2 className={styles.scenario}>{scenarioLabel(session)}</h2>
                    <p className={styles.buyer}>{personaLabel(session)}</p>
                  </div>
                  <SessionScore score={session.overallScore} />
                </div>
                {session.origin === "generated_from_call" ? <p className={styles.source}>Generated from call</p> : null}
                <div className={styles.mobileFooter}>
                  <div className={styles.mobileMetadata}>
                    <time dateTime={session.createdAt}>{formatDate(session.createdAt)}</time>
                    <span className={styles.numeric}>Est. duration {formatDuration(session)}</span>
                  </div>
                  <ReviewLink session={session} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={styles.empty} aria-labelledby="roleplay-history-empty-title">
          <ForgeIcon name="history" size={28} />
          <h2 id="roleplay-history-empty-title">Your practice history starts here</h2>
          <p>Complete a roleplay to keep the conversation, your scorecard, and the feedback for your next call.</p>
          <Link className={styles.primaryAction} href="/roleplay">Start practicing<ForgeIcon name="arrow_forward" size={16} /></Link>
        </section>
      )}
    </>
  );
}

function ReviewLink({ session }: { session: RoleplaySession }) {
  return (
    <Link aria-label={`Review ${scenarioLabel(session)} with ${personaLabel(session)}`} className={styles.reviewLink} href={`/roleplay?sessionId=${encodeURIComponent(session.id)}`}>
      Review <ForgeIcon name="arrow_forward" size={16} />
    </Link>
  );
}

function SessionScore({ score }: { score: number | null }) {
  if (score == null) return <span className={styles.noScore}>Not scored</span>;
  return (
    <span aria-label={`${score} out of 100`} className={styles.score}>
      <span>{score}</span><span className={styles.scoreScale}>/100</span>
    </span>
  );
}

function scenarioLabel(session: RoleplaySession) {
  return session.personaDetails?.objectionType ?? (session.origin === "generated_from_call" ? "Generated roleplay" : "Practice session");
}

function personaLabel(session: RoleplaySession) {
  return session.personaDetails?.name ?? (session.origin === "generated_from_call" ? "Anonymized buyer" : session.persona ?? "Prospect");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDuration(session: RoleplaySession) {
  const seconds = session.transcript.length * 45;
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
