import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getModuleSubmitTarget, mergeTeamProgressModule, TrainingPanel } from "../components/training-panel";

const baseModules = [
  {
    id: "module-1",
    orgId: "org-1",
    title: "Discovery That Finds the Real Pain",
    skillCategory: "Discovery",
    videoUrl: null,
    description: "A focused discovery module.",
    hasQuiz: true,
    quizData: {
      questions: [
        {
          question: "What is the strongest reason to ask layered follow-up questions in discovery?",
          options: ["To keep the talk track moving quickly", "To uncover root causes behind the stated problem"],
          correctIndex: 1,
        },
      ],
    },
    orderIndex: 1,
    createdAt: "2026-04-08T00:00:00.000Z",
    progress: null,
  },
];

const initialTeamProgress = {
  modules: [
    { id: "module-1", title: "Discovery That Finds the Real Pain" },
    { id: "module-2", title: "Objection Handling Without Losing Control" },
  ],
  repProgress: [
    {
      repId: "rep-1",
      firstName: "Maya",
      lastName: "Chen",
      moduleProgress: [
        {
          moduleId: "module-1",
          moduleTitle: "Discovery That Finds the Real Pain",
          status: "passed",
          score: 92,
          attempts: 1,
        },
        {
          moduleId: "module-2",
          moduleTitle: "Objection Handling Without Losing Control",
          status: "in_progress",
          score: null,
          attempts: 2,
        },
      ],
    },
  ],
};

const initialTeamRows = [
  {
    repId: "rep-1",
    firstName: "Maya",
    lastName: "Chen",
    email: "maya@example.com",
    assigned: 2,
    passed: 1,
    completionRate: 50,
  },
];

describe("TrainingPanel", () => {
  it("merges created modules into the team progress shell", () => {
    const nextProgress = mergeTeamProgressModule(initialTeamProgress, {
      ...baseModules[0],
      id: "module-3",
      title: "Competitive Positioning",
      orderIndex: 3,
    });

    expect(nextProgress.modules).toEqual([
      { id: "module-1", title: "Discovery That Finds the Real Pain" },
      { id: "module-2", title: "Objection Handling Without Losing Control" },
      { id: "module-3", title: "Competitive Positioning" },
    ]);
    expect(nextProgress.repProgress[0]?.moduleProgress).toHaveLength(2);
  });

  it("updates existing module titles inside the team progress shell", () => {
    const nextProgress = mergeTeamProgressModule(initialTeamProgress, {
      ...baseModules[0],
      title: "Discovery That Finds Root Causes Fast",
    });

    expect(nextProgress.modules[0]).toEqual({
      id: "module-1",
      title: "Discovery That Finds Root Causes Fast",
    });
    expect(nextProgress.repProgress[0]?.moduleProgress[0]).toMatchObject({
      moduleId: "module-1",
      moduleTitle: "Discovery That Finds Root Causes Fast",
    });
  });

  it("uses the persisted editing module id instead of the live selection", () => {
    expect(getModuleSubmitTarget("edit", "module-2")).toEqual({
      endpoint: "/api/training/modules/module-2",
      method: "PATCH",
      moduleId: "module-2",
    });
    expect(getModuleSubmitTarget("edit", null)).toEqual({
      endpoint: "/api/training/modules",
      method: "POST",
      moduleId: null,
    });
  });

  it("does not show Create module to reps", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).not.toContain("Create module");
    expect(html).not.toContain("Generate with AI");
  });

  it("shows Create module to managers", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable
        canManage
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).toContain("Create module");
    expect(html).toContain("Edit module");
    expect(html).toContain("Assign module");
    expect(html).toContain("Team Progress");
    expect(html).toContain("Discovery That Finds the Real Pain");
    expect(html).toContain("Maya Chen");
    expect(html).toContain("passed");
  });

  it("shows Generate with AI to managers", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable
        canManage
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).toContain("Generate with AI");
  });

  it("shows unavailable AI copy when generation is disabled", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).toContain("AI curriculum generation is unavailable until OpenAI is configured.");
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-describedby="training-ai-unavailable"');
    expect(html).toContain('id="training-ai-unavailable"');
  });
});
