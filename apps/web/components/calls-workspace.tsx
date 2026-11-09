import type { ReactNode } from "react";
import Link from "next/link";
import type { CallSummary } from "@/lib/calls/service";
import { DeleteRecordingButton } from "./delete-recording-button";
import { WorkspacePageHeader } from "./workspace-page-header";
import { ForgeChip, ForgeErrorState } from "./forge";
import styles from "./review-workspace.module.css";

export type CallsWorkspaceProps = {
  calls: CallSummary[];
  total: number;
  canSeeRep: boolean;
  scoringEnabled: boolean;
  canUpload: boolean;
  canDelete?: boolean;
  hasActiveFilters: boolean;
  error?: string | null;
  filters?: ReactNode;
  views: Array<{ href: string; label: string; active: boolean }>;
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
};

export function CallsWorkspace({ calls, total, canSeeRep, scoringEnabled, canUpload, canDelete = false, hasActiveFilters, error, filters, views, page, totalPages, previousHref, nextHref }: CallsWorkspaceProps) {
  return <div className={styles.page} data-operational-workspace="true" data-calls-layout="table-first">
    <WorkspacePageHeader title="Recordings" description={scoringEnabled ? "Find the conversation to review next." : "Review recordings, transcripts, and buyer personalities."} actions={canUpload ? <Link className={styles.primaryButton} href="/upload">Upload recording</Link> : undefined} />
    {error ? <ForgeErrorState title="Calls unavailable" description={error} /> : <>
      <div className={styles.controls} data-calls-table-controls="true">
        <nav aria-label="Call views" className={styles.views} data-calls-saved-views="route-filters">{views.map((view) => <Link aria-current={view.active ? "page" : undefined} className={styles.view} data-calls-saved-view-active={String(view.active)} href={view.href} key={view.label}>{view.label}</Link>)}</nav>
        {filters}
      </div>
      <div className={styles.listHeading}><h2>{total.toLocaleString()} {total === 1 ? "recording" : "recordings"}</h2>{hasActiveFilters && <Link className={styles.textLink} href="/calls">Clear filters</Link>}</div>
      {calls.length ? <div className={styles.panel} data-calls-primary-table="true">
        <div className={styles.desktop} data-forge-management-table="true"><table className={`${styles.table} ${styles.callsTable}`}><thead><tr><th scope="col">Conversation</th>{canSeeRep && <th scope="col">Rep</th>}{scoringEnabled && <th scope="col">Score</th>}<th scope="col">Status</th><th scope="col">Uploaded</th><th scope="col"><span className={styles.srOnly}>Review</span></th></tr></thead><tbody>
          {calls.map((call) => <tr key={call.id}><td><Link className={styles.objectLink} href={`/calls/${call.id}`}>{call.callTopic ?? "Untitled call"}</Link><p className={`${styles.muted} forge-tabular-nums`}>{formatCallDuration(call.durationSeconds)}</p></td>{canSeeRep && <td>{[call.repFirstName, call.repLastName].filter(Boolean).join(" ") || "Unassigned"}</td>}{scoringEnabled && <td className={styles.numeric}>{call.overallScore ?? "—"}</td>}<td><CallStatus status={call.status} /></td><td className={styles.muted}>{formatCallDate(call.createdAt)}</td><td><div className={styles.callsActions}>{canDelete && <DeleteRecordingButton callId={call.id} callTopic={call.callTopic ?? "Untitled call"} />}<Link aria-label={`Review ${call.callTopic ?? "Untitled call"}`} className={styles.textLink} href={`/calls/${call.id}`}>Review</Link></div></td></tr>)}
        </tbody></table></div>
        <div className={styles.mobile} data-forge-mobile-table-cards="true">{calls.map((call) => <article className={styles.mobileRow} data-mobile-call-card="true" key={call.id}><div className={styles.rowHeading}><Link className={styles.objectLink} href={`/calls/${call.id}`}>{call.callTopic ?? "Untitled call"}</Link><CallStatus status={call.status} /></div><dl className={styles.mobileFacts}>{canSeeRep && <div><dt>Rep</dt><dd>{[call.repFirstName, call.repLastName].filter(Boolean).join(" ") || "Unassigned"}</dd></div>}{scoringEnabled && <div><dt>Score</dt><dd className={styles.numeric}>{call.overallScore ?? "—"}</dd></div>}<div><dt>Duration</dt><dd className={styles.numeric}>{formatCallDuration(call.durationSeconds)}</dd></div><div><dt>Uploaded</dt><dd>{formatCallDate(call.createdAt)}</dd></div></dl><Link aria-label={`Review ${call.callTopic ?? "Untitled call"}`} className={styles.textLink} href={`/calls/${call.id}`}>Review call</Link>{canDelete && <DeleteRecordingButton callId={call.id} callTopic={call.callTopic ?? "Untitled call"} />}</article>)}</div>
      </div> : <div className={styles.empty}><h2>{hasActiveFilters ? "No matching recordings" : "No recordings yet"}</h2><p>{hasActiveFilters ? "Try a different view or clear the filters." : canUpload ? "Add a recording to begin reviewing calls." : "Recordings available to your account will appear here."}</p>{hasActiveFilters ? <Link className={styles.textLink} href="/calls">Clear filters</Link> : canUpload && <Link className={styles.primaryButton} href="/upload">Upload recording</Link>}</div>}
      {totalPages > 1 && <nav aria-label="Call pages" className={styles.pagination}><span>Page {page + 1} of {totalPages}</span><div>{page > 0 ? <Link className={styles.secondaryButton} href={previousHref}>Previous</Link> : <span className={styles.disabledButton}>Previous</span>}{page + 1 < totalPages ? <Link className={styles.secondaryButton} href={nextHref}>Next</Link> : <span className={styles.disabledButton}>Next</span>}</div></nav>}
    </>}
  </div>;
}

export function CallStatus({ status }: { status: string }) {
  const label = ["uploaded", "processing", "transcribing", "evaluating"].includes(status.toLowerCase()) ? "Processing" : status.toLowerCase() === "complete" ? "Complete" : status.toLowerCase() === "failed" ? "Failed" : status;
  return <ForgeChip tone={label === "Failed" ? "danger" : label === "Complete" ? "success" : "muted"}>{label}</ForgeChip>;
}
export function formatCallDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date); }
export function formatCallDuration(value: number | null) { return value == null ? "Duration unavailable" : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }
