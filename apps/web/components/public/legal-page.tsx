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
    <main className="min-h-screen bg-[#0b0e14] text-[#ecedf6]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-4">
          <Link
            className="text-2xl font-bold tracking-tight text-[#ecedf6]"
            href="/"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Argos
          </Link>
          <Link className="text-sm text-[#a9abb3] transition-colors duration-150 hover:text-[#ecedf6]" href="/">
            Back to homepage
          </Link>
        </header>

        <article className="mt-10 rounded-[2rem] border border-white/10 bg-[rgba(15,18,26,0.9)] px-6 py-8 shadow-[0_32px_90px_rgba(3,8,20,0.42)] sm:px-8 sm:py-10">
          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
              {eyebrow}
            </p>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-[#8f94a3]">
                Last updated {lastUpdated}
              </p>
              <h1
                className="text-[clamp(2.6rem,6vw,4.2rem)] font-bold tracking-[-0.05em] text-[#ecedf6]"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", lineHeight: 0.96 }}
              >
                {title}
              </h1>
            </div>
            <p className="max-w-[62ch] text-base leading-8 text-[#b7bac6] sm:text-lg">
              {intro}
            </p>
          </div>

          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <section
                className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-5 sm:px-6"
                key={section.title}
              >
                <h2 className="text-xl font-semibold text-[#ecedf6]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[#b7bac6]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <footer className="mt-auto flex flex-col gap-5 py-8 text-[#8f94a3]">
          <LegalFooterLinks />
          <p className="text-xs uppercase tracking-[0.2em]">© 2026 Argos Intelligence. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
