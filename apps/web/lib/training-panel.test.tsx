import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TrainingLoading from "../app/(authenticated)/training/loading";
import {
  getModuleSelectionPatch,
  getModuleSubmitTarget,
  mergeTeamProgressModule,
  TrainingPanel,
} from "../components/training-panel";
import { TrainingManagerCommandDeck } from "../components/training/training-manager-command-deck";
import { getTrainingModuleAiContextAvailability } from "../components/training/training-manager-ai-tools";
import { getTrainingManagerStageMetrics } from "../components/training/training-manager-stage-metrics";
import {
  getTrainingStagePrimaryAction,
  resolveTrainingStageView,
} from "../components/training/training-stage-state";

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

const lessonOnlyModules = [
  {
    ...baseModules[0],
    id: "module-lesson-only",
    title: "Storytelling Through Call Structure",
    hasQuiz: false,
    quizData: null,
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
          assignedAt: "2026-04-18T09:00:00.000Z",
          dueDate: "2026-04-22T12:00:00.000Z",
        },
        {
          moduleId: "module-2",
          moduleTitle: "Objection Handling Without Losing Control",
          status: "in_progress",
          score: null,
          attempts: 2,
          assignedAt: "2026-04-19T09:00:00.000Z",
          dueDate: "2026-04-25T12:00:00.000Z",
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

const managerMetricsProgress = [
  {
    repId: "rep-1",
    firstName: "Maya",
    lastName: "Chen",
    moduleProgress: [
      {
        moduleId: "module-1",
        moduleTitle: "Discovery That Finds the Real Pain",
        status: "assigned",
        score: null,
        attempts: 0,
        assignedAt: "2026-04-20T09:00:00.000Z",
        dueDate: "2026-04-23T12:00:00.000Z",
      },
    ],
  },
  {
    repId: "rep-2",
    firstName: "Jordan",
    lastName: "Lee",
    moduleProgress: [
      {
        moduleId: "module-1",
        moduleTitle: "Discovery That Finds the Real Pain",
        status: "passed",
        score: 94,
        attempts: 1,
        assignedAt: "2026-04-19T09:00:00.000Z",
        dueDate: "2026-04-24T12:00:00.000Z",
      },
    ],
  },
  {
    repId: "rep-3",
    firstName: "Alex",
    lastName: "Stone",
    moduleProgress: [
      {
        moduleId: "module-1",
        moduleTitle: "Discovery That Finds the Real Pain",
        status: "in_progress",
        score: null,
        attempts: 1,
        assignedAt: "2026-04-18T09:00:00.000Z",
        dueDate: "2026-04-26T12:00:00.000Z",
      },
    ],
  },
  {
    repId: "rep-4",
    firstName: "Toni",
    lastName: "Banks",
    moduleProgress: [
      {
        moduleId: "module-2",
        moduleTitle: "Objection Handling Without Losing Control",
        status: "assigned",
        score: null,
        attempts: 0,
        assignedAt: "2026-04-20T09:00:00.000Z",
        dueDate: "2026-04-22T12:00:00.000Z",
      },
    ],
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

  it("keeps the lesson view active when a module has no quiz", () => {
    expect(resolveTrainingStageView("quiz", false)).toBe("lesson");
  });

  it("uses module-driven primary actions for reps", () => {
    expect(
      getTrainingStagePrimaryAction({
        canManage: false,
        stageView: "lesson",
        hasQuiz: true,
        progress: null,
      }),
    ).toEqual({ kind: "view", label: "Resume lesson", nextView: "lesson" });
  });

  it("uses a completion action for reps on lesson-only modules", () => {
    expect(
      getTrainingStagePrimaryAction({
        canManage: false,
        stageView: "lesson",
        hasQuiz: false,
        progress: null,
      }),
    ).toEqual({ kind: "complete", label: "Mark complete", nextView: "lesson" });
  });

  it("uses assignment planning as the manager primary action", () => {
    expect(
      getTrainingStagePrimaryAction({
        canManage: true,
        stageView: "lesson",
        hasQuiz: true,
        progress: null,
      }),
    ).toEqual({ kind: "assign", label: "Plan assignments", nextView: "lesson" });
  });

  it("resets quiz answers and returns to the module view when a module is selected", () => {
    expect(getModuleSelectionPatch("module-2")).toEqual({
      answers: {},
      selectedModuleId: "module-2",
      stageView: "lesson",
      statusMessage: null,
    });
  });

  it("calculates manager stage metrics for the selected module", () => {
    expect(
      getTrainingManagerStageMetrics({
        now: "2026-04-21T12:00:00.000Z",
        repProgress: managerMetricsProgress,
        selectedModuleId: "module-1",
      }),
    ).toEqual({
      assignedCount: 3,
      completionRate: 33,
      dueSoonCount: 1,
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
    expect(html).toContain("Edit selected module");
    expect(html).toContain("Assign selected module");
    expect(html).toContain("Assignment coverage");
    expect(html).toContain("Team pulse");
    expect(html).toContain("Draft lesson content");
    expect(html).toContain("Discovery That Finds the Real Pain");
    expect(html).toContain("Maya Chen");
    expect(html).toContain("passed");
    expect(html).not.toContain("Assignments");
    expect(html).not.toContain("Team Progress");
    expect(html).not.toContain("AI tools");
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

  it("disables manager deck actions when no module is selected", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage
        initialModules={[]}
        initialTeamProgress={{ modules: [], repProgress: [] }}
        initialTeamRows={[]}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Select a module to open the planning deck");
    expect(html).toContain("Choose a module to edit or assign it.");
    expect(html).toMatch(/<button[^>]*>Create module<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Edit selected module<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Assign selected module<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-describedby="training-ai-unavailable"[^>]*disabled=""[^>]*>Generate with AI<\/button>/);
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

  it("keeps edit and assign enabled when a selected module has an empty title", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerCommandDeck
        aiAvailable
        expandedPanel={null}
        feedback={null}
        hasSelectedModule
        isBusy={false}
        moduleCount={1}
        onAssign={() => {}}
        onCreate={() => {}}
        onEdit={() => {}}
        onGenerate={() => {}}
        repCount={2}
        selectedModuleTitle=""
      />,
    );

    expect(html).toContain("Selected module");
    expect(html).toContain("Focused on the selected module.");
    expect(html).toMatch(/<button(?:(?!disabled="").)*>Edit selected module<\/button>/s);
    expect(html).toMatch(/<button(?:(?!disabled="").)*>Assign selected module<\/button>/s);
  });

  it("renders the rep shell as a curriculum studio instead of workspace tabs", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Curriculum map");
    expect(html).toContain("Lesson");
    expect(html).toContain("Quiz");
    expect(html).toContain("Resume lesson");
    expect(html).not.toContain("Course overview");
    expect(html).not.toContain("Quick switcher");
    expect(html).not.toContain("Training workspace quick switcher");
  });

  it("renders the course shell as stacked sections instead of a wide right-rail grid", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Current curriculum");
    expect(html).toContain("Curriculum map");
    expect(html).not.toContain("xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]");
  });

  it("renders curriculum rows as navigation instead of numbered mini-cards", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Current curriculum");
    expect(html).toContain("Discovery That Finds the Real Pain");
    expect(html).not.toContain(">Module 1<");
  });

  it("renders a completion CTA for reps when a module has no quiz", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={lessonOnlyModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Mark complete");
    expect(html).not.toContain(">Quiz<");
  });

  it("renders the manager shell with a status band and planning deck instead of section headings", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable
        canManage
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Curriculum map");
    expect(html).toContain("Lesson");
    expect(html).toContain("Quiz");
    expect(html).toContain("Plan assignments");
    expect(html).toContain("Assignment coverage");
    expect(html).toContain("Team pulse");
    expect(html).toContain("Create module");
    expect(html).toContain("Draft lesson content");
    expect(html).not.toContain("Assignments");
    expect(html).not.toContain("Team Progress");
    expect(html).not.toContain("AI tools");
    expect(html).not.toContain("Course overview");
    expect(html).not.toContain("Quick switcher");
  });

  it("renders the manager empty state with curriculum studio actions", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable
        canManage
        initialModules={[]}
        initialTeamProgress={{ modules: [], repProgress: [] }}
        initialTeamRows={[]}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Build your curriculum");
    expect(html).toContain("Create module");
    expect(html).toContain("Generate with AI");
  });

  it("renders the rep empty state without manager actions", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={[]}
        initialTeamProgress={{ modules: [], repProgress: [] }}
        initialTeamRows={[]}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("No training is assigned yet");
    expect(html).not.toContain("Create module");
  });

  it("renders the route loading shell with training studio scaffolding", () => {
    const html = renderToStaticMarkup(<TrainingLoading />);

    expect(html).toContain("Loading training");
    expect(html).toContain("Curriculum map");
    expect(html).toContain("Team pulse");
  });

  it("renders active-state semantics for the curriculum map and stage switcher", () => {
    const html = renderToStaticMarkup(
      <TrainingPanel
        aiAvailable={false}
        canManage={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
    expect(html).toContain('aria-current="page"');
  });

  it("enables module-scoped AI drafting only when course context is attached", () => {
    expect(
      getTrainingModuleAiContextAvailability(
        {
          ...baseModules[0],
          description: null,
          videoUrl: null,
        },
        "",
      ),
    ).toBe(false);

    expect(getTrainingModuleAiContextAvailability(baseModules[0], "")).toBe(true);
    expect(
      getTrainingModuleAiContextAvailability(
        {
          ...baseModules[0],
          description: null,
          videoUrl: null,
        },
        "Use this context to ground the draft.",
      ),
    ).toBe(true);
  });
});
