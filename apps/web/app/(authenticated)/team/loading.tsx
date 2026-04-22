import { PageFrame } from "@/components/page-frame";

export default function TeamLoading() {
  return (
    <PageFrame
      description="Review team performance with week-over-week trend, call volume, and coaching flags."
      eyebrow="Team"
      title="Team"
    >
      <div className="space-y-6 animate-pulse">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="mt-5 h-10 max-w-xl rounded-2xl bg-white/10" />
            <div className="mt-3 h-4 max-w-2xl rounded-full bg-white/[0.08]" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="mt-4 h-8 w-20 rounded-xl bg-white/10" />
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="mt-4 h-8 w-24 rounded-xl bg-white/10" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="rounded-[2rem] border border-white/10 bg-[#10131a] p-5 shadow-[0_24px_70px_rgba(3,8,20,0.34)]"
                key={index}
              >
                <div className="h-3 w-28 rounded-full bg-white/10" />
                <div className="mt-4 h-9 w-20 rounded-xl bg-white/10" />
                <div className="mt-4 h-4 w-full rounded-full bg-white/[0.08]" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#10131a] shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-72 rounded-full bg-white/[0.08]" />
          </div>
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4"
                key={index}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/10" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded-full bg-white/10" />
                    <div className="h-3 w-20 rounded-full bg-white/[0.08]" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="h-16 rounded-2xl bg-white/[0.08]" />
                  <div className="h-16 rounded-2xl bg-white/[0.08]" />
                  <div className="h-16 rounded-2xl bg-white/[0.08]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
