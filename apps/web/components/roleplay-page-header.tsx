import Link from "next/link";
import { ForgeIcon } from "./forge";
import styles from "./roleplay-pages.module.css";

export function RoleplayPageHeader({
  activeTab,
  completedCount,
}: {
  activeTab: "practice" | "history";
  completedCount?: number;
}) {
  const isHistory = activeTab === "history";

  return (
    <header className={styles.header} data-operational-toolbar="true" data-operational-toolbar-density="compact">
      <div className={styles.headingRow}>
        <div>
          <h1 className={styles.title}>{isHistory ? "Roleplay history" : "Roleplay"}</h1>
          <p className={styles.description}>
            {isHistory
              ? "Revisit a conversation, review your feedback, and take it into your next call."
              : "Practice a sales conversation. Find your next improvement."}
          </p>
        </div>
        {isHistory && completedCount ? (
          <Link className={styles.primaryAction} href="/roleplay">
            <ForgeIcon name="mic" size={16} />
            Practice
          </Link>
        ) : null}
      </div>
      <nav aria-label="Roleplay navigation" className={styles.navigation}>
        <Link aria-current={!isHistory ? "page" : undefined} className={styles.tab} href="/roleplay">
          Practice
        </Link>
        <Link aria-current={isHistory ? "page" : undefined} className={styles.tab} href="/roleplay/history">
          History
          {completedCount != null ? <span className={styles.count}>{completedCount}</span> : null}
        </Link>
      </nav>
    </header>
  );
}
