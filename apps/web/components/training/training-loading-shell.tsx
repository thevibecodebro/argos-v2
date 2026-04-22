import { PageFrame } from "@/components/page-frame";
import { TrainingCourseShell } from "@/components/training/training-course-shell";

function LoadingBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/10 ${className}`} />;
}

export function TrainingLoadingShell() {
  return (
    <PageFrame
      description="Review assigned modules, complete lessons, and guide practice from one training surface."
      eyebrow="Training"
      title="Loading training"
    >
      <TrainingCourseShell
        commandDeck={null}
        stage={
          <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Current curriculum</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Loading training</h2>
            <div className="mt-5 space-y-4">
              <LoadingBlock className="h-4 w-40" />
              <LoadingBlock className="h-4 w-full rounded-xl" />
              <LoadingBlock className="h-4 w-5/6 rounded-xl" />
              <div className="rounded-[1.25rem] border border-[#45484f]/10 bg-[#161a21]/45 p-5">
                <LoadingBlock className="h-4 w-24" />
                <LoadingBlock className="mt-3 h-4 w-full rounded-xl" />
                <LoadingBlock className="mt-2 h-4 w-2/3 rounded-xl" />
              </div>
            </div>
          </section>
        }
        tableOfContents={
          <section
            aria-label="Curriculum map"
            className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
            <div className="mt-4 space-y-3">
              <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
              <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
              <LoadingBlock className="h-20 w-full rounded-[1.15rem]" />
            </div>
          </section>
        }
      />
    </PageFrame>
  );
}
