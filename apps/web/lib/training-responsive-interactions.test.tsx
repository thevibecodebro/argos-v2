// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrainingModuleToc } from "../components/training/training-module-toc";
import { TrainingModuleStage } from "../components/training/training-module-stage";
import type { TrainingStageView } from "../components/training/training-stage-state";

const module = { id: "lesson", orgId: "preview", title: "A full readable module title", skillCategory: "Discovery", description: "Lesson content", videoUrl: null, hasQuiz: true, quizData: null, orderIndex: 0, createdAt: "2026-09-23", progress: null };
let root: Root;
let container: HTMLDivElement;
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); vi.unstubAllGlobals(); });
async function mount(element: React.ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(element));
}

describe("responsive training interactions", () => {
  it("closes mobile module selection but keeps desktop navigation available", async () => {
    let wide = false;
    let resize: () => void = () => {};
    vi.stubGlobal("matchMedia", () => ({ get matches() { return wide; }, addEventListener: (_: string, fn: () => void) => { resize = fn; }, removeEventListener: vi.fn() }));
    const select = vi.fn();
    await mount(<TrainingModuleToc modules={[module]} selectedModuleId="lesson" onSelectModule={select} />);
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    details.open = true;
    await act(async () => container.querySelector("button")!.click());
    expect(select).toHaveBeenCalledWith("lesson");
    expect(document.activeElement).toBe(container.querySelector("summary"));
    expect(details.open).toBe(false);
    wide = true;
    await act(async () => resize());
    expect(details.open).toBe(true);
    await act(async () => container.querySelector("button")!.click());
    expect(details.open).toBe(true);
  });

  it("moves focus and selected content together with keyboard tab navigation", async () => {
    function Harness() {
      const [view, setView] = useState<TrainingStageView>("lesson");
      return <TrainingModuleStage canManage={false} selectedModule={module} stageView={view} onSelectView={setView} primaryAction="Continue" onPrimaryAction={() => {}} quizContent={<p>Quiz content</p>} />;
    }
    await mount(<Harness />);
    const lesson = container.querySelector<HTMLButtonElement>('[role="tab"]')!;
    lesson.focus();
    await act(async () => lesson.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    const quiz = container.querySelector<HTMLButtonElement>('#training-stage-tab-quiz')!;
    expect(document.activeElement).toBe(quiz);
    expect(quiz.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe("Quiz content");
    await act(async () => quiz.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
    expect(document.activeElement).toBe(lesson);
    expect(lesson.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent?.match(/Lesson content/g)).toHaveLength(1);
  });
});
