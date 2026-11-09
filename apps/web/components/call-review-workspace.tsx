import type { ReactNode } from "react";
import Link from "next/link";
import type { CallDetail } from "@/lib/calls/service";
import { WorkspacePageHeader } from "./workspace-page-header";
import { CallStatus, formatCallDate, formatCallDuration } from "./calls-workspace";
import styles from "./review-workspace.module.css";
export function CallReviewWorkspace({ call, canUseHighlights, children }: { call: CallDetail; canUseHighlights: boolean; children: ReactNode }) {
  return <div className={styles.page} data-operational-workspace="true" data-call-detail-route="review-bench"><Link className={styles.textLink} href="/calls">Back to calls</Link><WorkspacePageHeader title={call.callTopic ?? "Untitled call"} actions={canUseHighlights ? <Link className={styles.secondaryButton} href="/highlights">Highlights</Link> : undefined} /><div className={styles.callMetadata}><CallStatus status={call.status} /><span>{formatCallDate(call.createdAt)}</span><span>{formatCallDuration(call.durationSeconds)}</span></div>{children}</div>;
}
