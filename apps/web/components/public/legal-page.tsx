import Link from "next/link";
import { LegalFooterLinks } from "./legal-links";

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
      className="forge-shell min-h-screen text-[var(--forge-text)]"
      data-legal-shell="forge"
      data-shell-theme="forge"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-4">
          <Link
            className="forge-focus-ring rounded-lg font-[var(--font-display)] text-2xl font-bold tracking-tight text-[var(--forge-text)]"
            href="/"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Argos
          </Link>
          <Link className="forge-focus-ring rounded-lg text-sm text-[var(--forge-muted)] transition-colors duration-150 hover:text-[var(--forge-text)]" href="/">
            Back to homepage
          </Link>
        </header>

        <article className="forge-surface mt-10 rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl space-y-5">
            <p className="forge-page-eyebrow">
              {eyebrow}
            </p>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                Last updated {lastUpdated}
              </p>
              <h1
                className="font-[var(--font-display)] text-[clamp(2.6rem,6vw,4.2rem)] font-bold text-[var(--forge-text)]"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", lineHeight: 0.96 }}
              >
                {title}
              </h1>
            </div>
            <p className="max-w-[62ch] text-base leading-8 text-[var(--forge-muted)] sm:text-lg">
              {intro}
            </p>
          </div>

          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <section
                className="forge-surface forge-surface--inset rounded-[1.5rem] px-5 py-5 sm:px-6"
                key={section.title}
              >
                <h2 className="text-xl font-semibold text-[var(--forge-text)]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--forge-muted)]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <footer className="mt-auto flex flex-col gap-5 py-8 text-[var(--forge-muted)]">
          <LegalFooterLinks />
          <p className="text-xs uppercase tracking-[0.2em]">© 2026 Argos Intelligence. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
