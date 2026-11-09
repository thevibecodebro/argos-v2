import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./workspace-page-header.module.css";

export type WorkspacePageTab = {
  href: string;
  label: string;
  current?: boolean;
  count?: number;
};

export function WorkspacePageHeader({
  title,
  description,
  actions,
  tabs,
  navigationLabel = "Related pages",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: WorkspacePageTab[];
  navigationLabel?: string;
}) {
  return (
    <header className={styles.header} data-operational-toolbar="true" data-operational-toolbar-density="compact">
      <div className={styles.heading}>
        <div className={styles.copy}>
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {tabs?.length ? (
        <nav aria-label={navigationLabel} className={styles.navigation}>
          {tabs.map((tab) => (
            <Link aria-current={tab.current ? "page" : undefined} className={styles.tab} href={tab.href} key={tab.href}>
              {tab.label}
              {tab.count != null ? <span className={styles.count}>{tab.count}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
