"use client";

import type { ReactNode } from "react";

type TrainingCourseShellProps = {
  commandDeck?: ReactNode;
  mode: "learner" | "manager";
  stage: ReactNode;
  tableOfContents: ReactNode;
};

export function TrainingCourseShell({
  commandDeck,
  mode,
  stage,
  tableOfContents,
}: TrainingCourseShellProps) {
  const isManager = mode === "manager";

  return (
    <div
      className={
        isManager
          ? "grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]"
          : "grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]"
      }
      data-training-course-shell={mode}
    >
      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start" data-training-course-structure="">
        {tableOfContents}
      </aside>
      <main className="min-w-0" data-training-course-stage="">
        {stage}
      </main>
      {commandDeck ? (
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start" data-training-builder-controls="">
          {commandDeck}
        </aside>
      ) : null}
    </div>
  );
}
