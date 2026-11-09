import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArgosLogo } from "@/components/argos-logo";
import {
  DEFAULT_WORKSPACE_THEME,
  workspaceThemeToForgeVars,
} from "@/lib/organizations/workspace-theme";
import styles from "./entry-surface.module.css";

export { styles as entryStyles };

/** Account entry has no tenant theme yet; use the product's default workspace theme. */
export function EntryPage({ children }: { children: ReactNode }) {
  return (
    <div
      className={`forge-shell ${styles.page}`}
      data-auth-shell="forge"
      data-shell-theme="forge"
      style={workspaceThemeToForgeVars(DEFAULT_WORKSPACE_THEME) as CSSProperties}
    >
      {children}
    </div>
  );
}

export function EntryBrand({ placement }: { placement: string }) {
  return (
    <Link
      aria-label="Argos homepage"
      className={`${styles.brand} forge-focus-ring`}
      href="/"
    >
      <ArgosLogo className={styles.logo} decorative placement={placement} />
    </Link>
  );
}

export function EntrySurface({ children }: { children: ReactNode }) {
  return (
    <main className={styles.main}>
      <section className={styles.surface}>{children}</section>
    </main>
  );
}
