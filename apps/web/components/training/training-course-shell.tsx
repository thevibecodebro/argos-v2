"use client";

import type { ReactNode } from "react";

type TrainingCourseShellProps = {
  commandDeck?: ReactNode;
  stage: ReactNode;
  tableOfContents: ReactNode;
};

export function TrainingCourseShell({
  commandDeck,
  stage,
  tableOfContents,
}: TrainingCourseShellProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
      <main className="min-w-0">{stage}</main>
      <aside className="space-y-5">
        {tableOfContents}
        {commandDeck}
      </aside>
    </div>
  );
}
