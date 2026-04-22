import { PageFrame } from "@/components/page-frame";

export default function RepProfileLoading() {
  return (
    <PageFrame
      description="Review score trends, focus categories, badges, and recent calls for the selected team member."
      eyebrow="Coaching"
      title="Rep Profile"
    >
      <div className="space-y-6 animate-pulse">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="flex items-start gap-4">
              <div className="h-[4.5rem] w-[4.5rem] rounded-[1.5rem] bg-white/10" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="h-10 max-w-sm rounded-2xl bg-white/10" />
                <div className="h-4 max-w-xl rounded-full bg-white/[0.08]" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="h-16 rounded-[1.5rem] bg-white/[0.04]" key={index} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-32 rounded-full bg-white/10" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="h-32 rounded-[1.5rem] bg-white/[0.04]" key={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="space-y-2" key={index}>
                  <div className="h-4 w-48 rounded-full bg-white/10" />
                  <div className="h-2 rounded-full bg-white/[0.08]" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="mt-6 h-56 rounded-[1.5rem] bg-white/[0.04]" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="h-24 rounded-[1.5rem] bg-white/[0.04]" key={index} />
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
            <div className="h-3 w-32 rounded-full bg-white/10" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="h-24 rounded-[1.5rem] bg-white/[0.04]" key={index} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
