"use client";

import { cn } from "@argos-v2/ui";

export type TrainingWorkspaceSection =
  | "overview"
  | "modules"
  | "quiz"
  | "assignments"
  | "teamProgress"
  | "aiTools";

type TrainingWorkspaceNavProps = {
  activeSection: TrainingWorkspaceSection;
  canManage: boolean;
  onSelect: (section: TrainingWorkspaceSection) => void;
  compact?: boolean;
};

type TrainingWorkspaceNavItem = {
  section: TrainingWorkspaceSection;
  label: string;
  managerOnly?: boolean;
};

const NAV_ITEMS: TrainingWorkspaceNavItem[] = [
  { section: "overview", label: "Course overview" },
  { section: "modules", label: "Modules" },
  { section: "quiz", label: "Quiz" },
  { section: "assignments", label: "Assignments", managerOnly: true },
  { section: "teamProgress", label: "Team progress", managerOnly: true },
  { section: "aiTools", label: "AI tools", managerOnly: true },
];

export function getTrainingWorkspaceNavItems(canManage: boolean): TrainingWorkspaceNavItem[] {
  return NAV_ITEMS.filter((item) => !item.managerOnly || canManage);
}

export function TrainingWorkspaceNav({
  activeSection,
  canManage,
  compact = false,
  onSelect,
}: TrainingWorkspaceNavProps) {
  const visibleItems = getTrainingWorkspaceNavItems(canManage);

  if (compact) {
    return (
      <nav aria-label="Training workspace quick switcher" className="space-y-3 xl:hidden">
        <div className="px-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#45484f]">
            Quick switcher
          </p>
          <p className="mt-2 text-sm leading-6 text-[#a9abb3]">
            Jump between sections on smaller screens.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleItems.map((item) => {
            const active = item.section === activeSection;

            return (
              <button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition",
                  active
                    ? "border-[#74b1ff] bg-[#74b1ff]/10 text-[#74b1ff]"
                    : "border-[#45484f]/15 bg-[#10131a] text-[#a9abb3] hover:border-[#74b1ff]/30 hover:text-[#ecedf6]",
                )}
                key={item.section}
                onClick={() => onSelect(item.section)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Training workspace sections" className="hidden space-y-4 xl:block">
      <div className="px-3">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#45484f]">
          Workspace
        </p>
        <p className="mt-2 text-sm leading-6 text-[#a9abb3]">
          Move through the course shell, lessons, and manager tools.
        </p>
      </div>

      <div className="space-y-1">
        {visibleItems.map((item) => {
          const active = item.section === activeSection;

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border-r-2 px-3 py-2.5 text-left transition-all duration-200 font-[var(--font-display)] tracking-wider uppercase text-[0.7rem] font-bold",
                active
                  ? "border-[#74b1ff] bg-[#74b1ff]/10 text-[#74b1ff]"
                  : "border-transparent text-[#45484f] hover:bg-[#ffffff]/5 hover:text-[#ecedf6]",
              )}
              key={item.section}
              onClick={() => onSelect(item.section)}
              type="button"
            >
              <span className="shrink-0">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
