import Link from "next/link";
import type { CallHighlight } from "@/lib/calls/service";
import { WorkspacePageHeader } from "./workspace-page-header";
import { ForgeChip, ForgeErrorState } from "./forge";
import { formatCallDate } from "./calls-workspace";
import styles from "./review-workspace.module.css";

export function HighlightsWorkspace({ highlights, error }: { highlights: CallHighlight[]; error?: string | null }) {
  return <div className={styles.page} data-operational-workspace="true" data-highlights-layout="evidence-inbox" data-highlights-surface="operational-evidence">
    <WorkspacePageHeader title="Highlights" description="Saved evidence for the next coaching conversation." actions={<Link className={styles.secondaryButton} href="/calls">Calls</Link>} />
    {error ? <ForgeErrorState title="Highlights unavailable" description={error} /> : highlights.length ? <section className={styles.evidenceList} aria-label="Saved coaching evidence" data-highlights-library="evidence-list">{highlights.map((highlight) => <article className={styles.evidenceRow} key={highlight.id} data-highlight-row="default">
      <div className={styles.evidenceSource}><ForgeChip tone={highlight.severity === "critical" ? "danger" : "muted"}>{highlight.category ?? "Highlight"}</ForgeChip>{highlight.severity && <span className={styles.muted}>{highlight.severity}</span>}<p>{highlight.callTopic ?? "Untitled call"}</p><p className={styles.muted}>{formatCallDate(highlight.callCreatedAt)}</p>{highlight.timestampSeconds != null && <p className={styles.muted}>At {Math.floor(highlight.timestampSeconds / 60)}:{String(highlight.timestampSeconds % 60).padStart(2, "0")}</p>}<Link className={styles.textLink} href={`/calls/${highlight.callId}`}>Open source call</Link></div>
      <div className={styles.evidenceCopy}><h2>{highlight.observation ?? "No observation recorded."}</h2><p>{highlight.recommendation ?? "No recommendation recorded."}</p>{highlight.highlightNote && <div className={styles.note}><h3>Manager note</h3><p>{highlight.highlightNote}</p></div>}</div>
    </article>)}</section> : <div className={styles.empty}><h2>No highlights yet</h2><p>Saved coaching moments from scored calls will appear here.</p><Link className={styles.textLink} href="/calls">Review calls</Link></div>}
  </div>;
}
