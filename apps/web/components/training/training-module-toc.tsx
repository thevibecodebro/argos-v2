"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Check, Play } from "lucide-react";
import { SecondaryRailButton, SecondaryRailGroup } from "@/components/secondary-rail";
import type { TrainingModuleSummary } from "@/lib/training/service";

export function TrainingModuleToc({
  modules,
  selectedModuleId,
  onSelectModule,
  variant = "panel",
}: {
  modules: TrainingModuleSummary[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  variant?: "panel" | "rail";
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const selectedIndex = modules.findIndex((module) => module.id === selectedModuleId);

  useEffect(() => {
    if (variant !== "panel") return;
    const viewport = window.matchMedia("(min-width: 64rem)");
    const syncDisclosure = () => { if (disclosure.current) disclosure.current.open = viewport.matches; };
    syncDisclosure();
    viewport.addEventListener("change", syncDisclosure);
    return () => viewport.removeEventListener("change", syncDisclosure);
  }, [variant]);

  if (variant === "rail") {
    return (
      <div aria-label="Curriculum map" data-training-module-tree="rail">
        <SecondaryRailGroup label="Curriculum">
          {modules.map((module) => (
            <SecondaryRailButton
              active={module.id === selectedModuleId}
              description={`${module.skillCategory} · ${module.progress?.status ?? "assigned"}`}
              icon={module.hasQuiz ? "task_alt" : "subject"}
              key={module.id}
              label={module.title}
              onClick={() => onSelectModule(module.id)}
            />
          ))}
          {!modules.length ? (
            <p className="px-3 text-xs leading-5 text-[var(--forge-muted)]">
              Create a module to populate the builder rail.
            </p>
          ) : null}
        </SecondaryRailGroup>
      </div>
    );
  }

  return (
    <details ref={disclosure} className="training-module-picker" data-training-module-tree="">
      <summary className="training-module-picker-summary">
        <span className="font-semibold">Modules</span>
        <span className="ml-auto text-sm text-[var(--forge-muted)]">
          {selectedIndex >= 0 ? `${selectedIndex + 1} of ${modules.length}` : `${modules.length} modules`}
        </span>
        <ChevronDown aria-hidden="true" size={18} />
      </summary>
      <nav aria-label="Curriculum map" className="training-module-list">
        {modules.map((module) => {
          const selected = module.id === selectedModuleId;
          const complete = module.progress?.status === "passed";
          return (
            <button
              aria-current={selected ? "page" : undefined}
              className="training-module-row"
              key={module.id}
              onClick={() => {
                onSelectModule(module.id);
                if (disclosure.current && !window.matchMedia("(min-width: 64rem)").matches) {
                  disclosure.current.open = false;
                  disclosure.current.querySelector("summary")?.focus();
                }
              }}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">{module.title}</span>
                <span className="mt-1 block text-xs text-[var(--forge-muted)]">
                  {module.skillCategory} · {(module.progress?.status ?? "assigned").replaceAll("_", " ")}
                </span>
              </span>
              {complete ? <Check aria-label="Completed" size={18} /> : selected ? <Play aria-label="Current module" size={16} /> : null}
            </button>
          );
        })}
        {!modules.length ? <p className="p-3 text-sm text-[var(--forge-muted)]">Your assigned modules will appear here.</p> : null}
      </nav>
    </details>
  );
}
