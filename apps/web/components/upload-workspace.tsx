import type { ReactNode } from "react";
import Link from "next/link";
import { WorkspacePageHeader } from "./workspace-page-header";
import styles from "./review-workspace.module.css";
export function UploadWorkspace({ children }: { children: ReactNode }) {
  return <div className={styles.page} data-operational-workspace="true" data-upload-route="capture-workflow"><WorkspacePageHeader title="Upload recording" description="Add audio or video to prepare a transcript and buyer personality." actions={<Link className={styles.secondaryButton} href="/calls">Recordings</Link>} /><div className={styles.uploadWidth}>{children}</div></div>;
}
