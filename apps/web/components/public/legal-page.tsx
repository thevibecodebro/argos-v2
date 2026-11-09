import Link from "next/link";
import { ArgosLogo } from "@/components/argos-logo";
import { LegalFooterLinks } from "./legal-links";
import styles from "./legal-page.module.css";

type LegalPageSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  eyebrow: string;
  intro: string;
  lastUpdated: string;
  sections: LegalPageSection[];
  title: string;
};

export function LegalPage({ eyebrow, intro, lastUpdated, sections, title }: LegalPageProps) {
  return (
    <main
      className={`forge-shell text-[var(--forge-text)] ${styles.shell}`}
      data-legal-shell="forge"
      data-shell-theme="forge"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <Link
            aria-label="Argos homepage"
            className="forge-focus-ring block w-28 rounded-lg sm:w-32"
            href="/"
          >
            <ArgosLogo
              className="block"
              decorative
              imageClassName="block h-auto w-full"
              placement="legal-header"
            />
          </Link>
          <Link className={`forge-focus-ring rounded-lg text-sm text-[var(--forge-muted)] transition-colors duration-150 hover:text-[var(--forge-text)] ${styles.homeLink}`} href="/">
            Back to homepage
          </Link>
        </header>

        <article className={styles.article}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <p className={styles.updated}>Last updated {lastUpdated}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>

          <div className={styles.sections}>
            {sections.map((section) => (
              <section className={styles.section} key={section.title}>
                <h2>{section.title}</h2>
                <div className={styles.body}>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <footer className={styles.footer}>
          <LegalFooterLinks />
          <p className="text-xs uppercase tracking-[0.2em]">2026 Argos Revenue Command. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
