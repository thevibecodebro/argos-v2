import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { OperationalToolbar, OperationalWorkspace } from "@/components/operational-workspace";
import { TrainingCourseShell } from "@/components/training/training-course-shell";

function LoadingBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`motion-safe:animate-pulse rounded bg-[var(--forge-surface-3)] ${className}`} />;
}

export function TrainingLoadingShell() {
  return (
    <AuthenticatedPageContainer aria-busy="true" data-authenticated-route-state="loading">
      <div aria-live="polite" className="sr-only" role="status">Loading training</div>
      <OperationalWorkspace>
        <OperationalToolbar title="Training" description="Review assigned modules and complete the next lesson." />
        <TrainingCourseShell
          mode="learner"
          structureRail={
            <div aria-label="Curriculum map" className="training-module-picker p-4">
              <p className="text-sm font-semibold">Modules</p>
              <div className="mt-4 hidden space-y-4 lg:block">
                <LoadingBlock className="h-10 w-full" />
                <LoadingBlock className="h-10 w-full" />
                <LoadingBlock className="h-10 w-full" />
              </div>
            </div>
          }
          stage={
            <section aria-label="Course player" className="training-lesson space-y-5">
              <LoadingBlock className="h-7 w-3/4" />
              <LoadingBlock className="h-5 w-24" />
              <LoadingBlock className="h-11 w-40" />
              <LoadingBlock className="h-4 w-full" />
              <LoadingBlock className="h-4 w-5/6" />
              <LoadingBlock className="h-11 w-full sm:w-36" />
            </section>
          }
        />
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
