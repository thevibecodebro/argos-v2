import Link from "next/link";
import { ForgeIcon } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";

export default function RepProfileNotFound() {
  return (
    <PageFrame
      actions={[{ href: "/team", label: "Back to team" }]}
      description="Review score trends, focus categories, badges, and recent calls for the selected team member."
      eyebrow="Coaching"
      title="Rep Profile"
      tone="warning"
    >
      <section className="rounded-[2rem] border border-white/10 bg-[var(--forge-surface)] p-6 text-center shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[var(--forge-gold)]">
          <ForgeIcon name="person_search" size={24} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--forge-text)]">
          Rep profile not found
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--forge-muted)]">
          The selected rep is unavailable in your current team view or does not have profile data yet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-4 py-2.5 text-sm font-semibold text-[#170d07] transition hover:brightness-110 active:scale-[0.98]"
            href="/team"
          >
            Back to team
          </Link>
          <Link
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-[var(--forge-text)] transition hover:border-[var(--forge-gold)]/25 hover:bg-[var(--forge-gold)]/[0.08] active:scale-[0.98]"
            href="/calls"
          >
            Open calls
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}
