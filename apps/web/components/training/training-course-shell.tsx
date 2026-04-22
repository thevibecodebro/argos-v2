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
    <div className="space-y-6">
      <main className="min-w-0">{stage}</main>
      <section>{tableOfContents}</section>
      {commandDeck ? <aside>{commandDeck}</aside> : null}
    </div>
  );
}
