import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { PageFrame } from "@/components/page-frame";
import { TrainingCourseShell } from "@/components/training/training-course-shell";

function LoadingBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/10 ${className}`} />;
}

export function TrainingLoadingShell() {
  return (
    <AuthenticatedPageContainer>
      <PageFrame
        description="Review assigned modules, complete lessons, and guide practice from one training surface."
        eyebrow="Training"
        title="Loading training"
      >
        <TrainingCourseShell
          mode="learner"
          stage={
            <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--forge-gold)]">Course player</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Loading training</h2>
              <div className="mt-6 space-y-5">
                <LoadingBlock className="h-4 w-40" />
                <LoadingBlock className="h-4 w-full rounded-xl" />
                <LoadingBlock className="h-4 w-5/6 rounded-xl" />
                <div className="rounded-[1.25rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/45 p-6">
                  <LoadingBlock className="h-4 w-24" />
                  <LoadingBlock className="mt-3 h-4 w-full rounded-xl" />
                  <LoadingBlock className="mt-2 h-4 w-2/3 rounded-xl" />
                </div>
              </div>
            </section>
          }
          structureRail={
            <section
              aria-label="Curriculum map"
              className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.24)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Course structure</p>
              <p className="mt-1 text-xs text-[var(--forge-muted)]">Curriculum map</p>
              <div className="mt-5 space-y-3">
                <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
                <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
                <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
              </div>
            </section>
          }
        />
      </PageFrame>
    </AuthenticatedPageContainer>
  );
}
