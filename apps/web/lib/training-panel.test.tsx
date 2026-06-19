import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TrainingLoading from "../app/(authenticated)/training/loading";
import {
  getModuleSelectionPatch,
  getModuleSubmitTarget,
  mergeTeamProgressModule,
  TrainingCurriculumPanel,
  TrainingLearnerPanel,
} from "../components/training-panel";
import { TrainingCourseShell } from "../components/training/training-course-shell";
import { TrainingManagerModal } from "../components/training/training-manager-modal";
import { TrainingModuleStage } from "../components/training/training-module-stage";
import { TrainingModuleToc } from "../components/training/training-module-toc";
import { getTrainingModuleAiContextAvailability } from "../components/training/training-manager-ai-tools";
import { getTrainingManagerStageMetrics } from "../components/training/training-manager-stage-metrics";
import {
  getTrainingStagePrimaryAction,
  resolveTrainingStageView,
} from "../components/training/training-stage-state";

const trainingPanelSource = readFileSync(new URL("../components/training-panel.tsx", import.meta.url), "utf8");
const trainingModuleStageSource = readFileSync(
  new URL("../components/training/training-module-stage.tsx", import.meta.url),
  "utf8",
);

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

const trainingAdminSources = [
  readFileSync(new URL("../components/training-panel.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../components/training/training-quiz-editor.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../components/training/training-manager-ai-tools.tsx", import.meta.url), "utf8"),
];

function expectOutlineNoneClassesToUseForgeFocus(source: string) {
  const classes = source.match(/"[^"]*outline-none[^"]*"/g) ?? [];

  expect(classes.length).toBeGreaterThan(0);
  expect(classes.every((className) => className.includes("focus-visible:border-[var(--forge-gold)]"))).toBe(true);
  expect(classes.every((className) => className.includes("focus-visible:ring-2"))).toBe(true);
  expect(classes.every((className) => className.includes("focus-visible:ring-[var(--forge-gold)]/35"))).toBe(true);
}

function expectCompactCurriculumActionsAtRest(html: string) {
  expect(html).toContain('data-training-curriculum-rail-actions="true"');
  expect(html).toContain("Create module");
  expect(html).toContain("Edit selected module");
  expect(html).toContain("Assign selected module");
  expect(html).not.toContain("Generate with AI");
  expect(html).not.toContain('data-training-curriculum-actions="true"');
  expect(html).not.toContain('data-training-admin-drawer=""');
  expect(html).not.toContain("Builder controls");
  expect(html).not.toContain("Course builder");
  expect(html).not.toContain("group_add");
  expect(html).not.toContain("add_circle");
  expect(html).not.toContain("edit_square");
  expect(html).not.toContain("assignment_ind");
  expect(html).not.toContain("Draft lesson content");
  expect(html).not.toContain("Quiz builder");
  expect(html).not.toContain("Select reps, set an optional due date");
}

describe("training panels", () => {
  it("uses visible Forge focus styling on training admin inputs", () => {
    for (const source of trainingAdminSources) {
      expect(source).toContain("data-training-focus-hardened");
      expectOutlineNoneClassesToUseForgeFocus(source);
    }
  });

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
      <TrainingLearnerPanel
        initialModules={baseModules}
      />,
    );

    expect(html).not.toContain("Create module");
    expect(html).not.toContain("Generate with AI");
  });

  it("shows Create module to managers", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expectCompactCurriculumActionsAtRest(html);
    expect(html).toContain("Curriculum");
    expect(html).toContain("Module preview");
    expect(html).toContain("Discovery That Finds the Real Pain");
    expect(html).not.toContain("Assignments");
    expect(html).not.toContain("Team Progress");
    expect(html).not.toContain("AI tools");
  });

  it("keeps Generate with AI inside the create module flow", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).not.toContain("Generate with AI");
    expect(trainingPanelSource).toContain('data-training-create-ai-entry="true"');
    expect(trainingPanelSource).toContain("Generate with AI");
  });

  it("disables curriculum actions when no module is selected", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable={false}
        initialModules={[]}
        initialTeamProgress={{ modules: [], repProgress: [] }}
        initialTeamRows={[]}
      />,
    );

    expect(html).toContain('data-training-curriculum-rail-actions="true"');
    expect(html).toContain("Create module");
    expect(html).toMatch(/<button[^>]*aria-label="Edit selected module"[^>]*disabled=""/s);
    expect(html).toMatch(/<button[^>]*aria-label="Assign selected module"[^>]*disabled=""/s);
    expect(html).not.toContain("Generate with AI");
  });

  it("keeps unavailable AI copy scoped to the create module flow", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable={false}
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).not.toContain("AI curriculum generation is unavailable until OpenAI is configured.");
    expect(trainingPanelSource).toContain("AI curriculum generation is unavailable until OpenAI is configured.");
    expect(trainingPanelSource).toContain('id="training-create-ai-unavailable"');
  });

  it("keeps edit and assign enabled when a selected module has an empty title", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={[{ ...baseModules[0], title: "" }]}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
      />,
    );

    expect(html).toContain('data-training-curriculum-rail-actions="true"');
    expect(html).toMatch(/<button(?=[^>]*aria-label="Edit selected module")(?![^>]*disabled="")[^>]*>/);
    expect(html).toMatch(/<button(?=[^>]*aria-label="Assign selected module")(?![^>]*disabled="")[^>]*>/);
  });

  it("does not render the manager modal when closed", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerModal
        description="Description"
        eyebrow="Eyebrow"
        onClose={() => {}}
        open={false}
        title="Title"
      >
        <div>Modal body</div>
      </TrainingManagerModal>,
    );

    expect(html).toBe("");
  });

  it("renders the manager modal with dialog semantics when open", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerModal
        description="Shape the lesson in a focused overlay."
        eyebrow="Create module"
        onClose={() => {}}
        open
        title="Training modal"
      >
        <div>Modal body</div>
      </TrainingManagerModal>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain("Create module");
    expect(html).toContain("Training modal");
    expect(html).toContain("Shape the lesson in a focused overlay.");
    expect(html).toContain("Modal body");
    expect(html).toContain('aria-label="Close manager modal"');
  });

  it("labels manager create and generate form controls", () => {
    expect(trainingPanelSource).toContain('aria-label="Module title"');
    expect(trainingPanelSource).toContain('aria-label="Skill category"');
    expect(trainingPanelSource).toContain('aria-label="Video URL"');
    expect(trainingPanelSource).toContain('aria-label="Module description"');
    expect(trainingPanelSource).toContain('aria-label="Training topic"');
    expect(trainingPanelSource).toContain('aria-label="Target role"');
    expect(trainingPanelSource).toContain('aria-label="Skill focus"');
    expect(trainingPanelSource).toContain('aria-label="Module count"');
    expect(trainingPanelSource).toContain('aria-label="Assignment due date"');
    expect(trainingPanelSource).toContain("Saving training module.");
    expect(trainingPanelSource).toContain("Generating training drafts.");
    expect(trainingPanelSource).toContain("Updating training assignments.");
    expect(trainingPanelSource).toContain("Submitting training progress.");
    expect(trainingModuleStageSource).toContain('aria-live="polite"');
    expect(trainingModuleStageSource).toContain('role="status"');
  });

  it("renders the rep shell as a course player instead of workspace tabs", () => {
    const html = renderToStaticMarkup(
      <TrainingLearnerPanel
        initialModules={baseModules}
      />,
    );

    expect(html).toContain('data-training-course-shell="learner"');
    expect(html).toContain('data-training-course-structure="inline"');
    expect(html).not.toContain('data-secondary-rail="training-builder"');
    expect(html).not.toContain('data-forge-workspace-layout="one-rail"');
    expect(html).toContain("Course player");
    expect(html).toContain("Course structure");
    expect(html).toContain("Curriculum map");
    expect(html).toContain("Lesson");
    expect(html).toContain("Quiz");
    expect(html).toContain("Resume lesson");
    expect(html).not.toContain("Course overview");
    expect(html).not.toContain("Quick switcher");
    expect(html).not.toContain("Training workspace quick switcher");
  });

  it("renders the curriculum shell as a docked module workbench without a control drawer", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    const shellIndex = html.indexOf('data-training-course-shell="manager"');
    const workbenchIndex = html.indexOf('data-training-builder-workbench=""');
    const adminDrawerIndex = html.indexOf('data-training-admin-drawer=""');
    const structureIndex = html.indexOf('data-training-builder-secondary-rail=""');
    const stageIndex = html.indexOf('data-training-course-stage=""');
    const tocIndex = html.indexOf('aria-label="Curriculum map"');
    const actionRailIndex = html.indexOf('data-training-curriculum-rail-actions="true"');

    expect(shellIndex).toBeGreaterThanOrEqual(0);
    expect(workbenchIndex).toBeGreaterThanOrEqual(0);
    expect(html).toContain('data-secondary-rail="training-builder"');
    expect(structureIndex).toBeGreaterThan(shellIndex);
    expect(stageIndex).toBeGreaterThan(structureIndex);
    expect(tocIndex).toBeGreaterThanOrEqual(0);
    expect(tocIndex).toBeLessThan(stageIndex);
    expect(adminDrawerIndex).toBe(-1);
    expect(actionRailIndex).toBeGreaterThan(structureIndex);
    expect(actionRailIndex).toBeLessThan(stageIndex);
    expect(html).not.toContain("lg:grid-cols-[auto_minmax(0,1fr)]");
    expect(html).not.toContain('data-training-admin-rail=""');
    expect(html).not.toContain('data-forge-workspace-layout="two-rails"');
  });

  it("renders curriculum rows as navigation instead of numbered mini-cards", () => {
    const html = renderToStaticMarkup(
      <TrainingLearnerPanel
        initialModules={baseModules}
      />,
    );

    expect(html).toContain('aria-label="Curriculum map"');
    expect(html).toContain("Course structure");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(">Open<");
    expect(html).not.toContain(">Module 1<");
  });

  it("renders a completion CTA for reps when a module has no quiz", () => {
    const html = renderToStaticMarkup(
      <TrainingLearnerPanel
        initialModules={lessonOnlyModules}
      />,
    );

    expect(html).toContain("Mark complete");
    expect(html).not.toContain(">Quiz<");
  });

  it("renders the curriculum shell with a status band and compact rail actions", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Curriculum map");
    expect(html).toContain("Curriculum");
    expect(html).toContain("Module preview");
    expect(html).toContain("Lesson");
    expect(html).toContain("Quiz");
    expect(html).toContain("Plan assignments");
    expectCompactCurriculumActionsAtRest(html);
    expect(html).not.toContain("Assignments");
    expect(html).not.toContain("Team Progress");
    expect(html).not.toContain("AI tools");
    expect(html).not.toContain("Course overview");
    expect(html).not.toContain("Quick switcher");
  });

  it("keeps the curriculum rail actions compact at rest", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={baseModules}
        initialTeamProgress={initialTeamProgress}
        initialTeamRows={initialTeamRows}
        rubricCategories={[]}
      />,
    );

    expectCompactCurriculumActionsAtRest(html);
  });

  it("renders the manager empty state as planning guidance instead of a studio splash", () => {
    const html = renderToStaticMarkup(
      <TrainingCurriculumPanel
        aiAvailable
        initialModules={[]}
        initialTeamProgress={{ modules: [], repProgress: [] }}
        initialTeamRows={[]}
        rubricCategories={[]}
      />,
    );

    expect(html).toContain("Create your first module");
    expect(html).toContain("Generate a draft sequence with AI");
    expect(html).toContain("Create module");
    expect(html).not.toContain("Generate with AI");
    expect(html).not.toContain("Build your curriculum");
  });

  it("renders the rep empty state without manager actions", () => {
    const html = renderToStaticMarkup(
      <TrainingLearnerPanel
        initialModules={[]}
      />,
    );

    expect(html).toContain("Nothing is assigned yet");
    expect(html).not.toContain("Create module");
  });

  it("renders the loading shell with the course-player structure", () => {
    const html = renderToStaticMarkup(<TrainingLoading />);

    expect(html).toContain('data-authenticated-page-container="standard"');
    expect(html).toContain("px-4 py-6 sm:px-6 lg:px-8");
    expect(html).toContain("max-w-7xl");
    expect(html).toContain('data-training-course-shell="learner"');
    expect(html).toContain("Loading training");
    expect(html).toContain("Course player");
    expect(html).toContain("Course structure");
    expect(html).toContain("Curriculum map");
    expect(html).toContain('data-training-course-structure="inline"');
    expect(html).not.toContain('data-forge-workspace-layout="one-rail"');
    expect(html).toContain('data-training-course-stage=""');
    expect(html).not.toContain("Builder controls");
    expect(html).toContain("Review assigned modules and complete the next lesson.");
  });

  it("uses dashboard-like spacing rhythm across the training shell surfaces", () => {
    const shellHtml = renderToStaticMarkup(
      <TrainingCourseShell
        mode="manager"
        stage={<div>Stage</div>}
        structureRail={<div>Curriculum map</div>}
      />,
    );
    const stageHtml = renderToStaticMarkup(
      <TrainingModuleStage
        canManage
        onPrimaryAction={() => {}}
        onSelectView={() => {}}
        primaryAction="Plan assignments"
        quizContent={<div>Quiz content</div>}
        selectedModule={baseModules[0]}
        stageBand={<div>Stage metrics</div>}
        stageView="lesson"
        statusMessage="Training progress saved."
      />,
    );
    const tocHtml = renderToStaticMarkup(
      <TrainingModuleToc
        modules={baseModules}
        onSelectModule={() => {}}
        selectedModuleId={baseModules[0]?.id ?? null}
      />,
    );
    expect(shellHtml).toContain('data-training-course-shell="manager"');
    expect(shellHtml).toContain('data-training-builder-workbench=""');
    expect(shellHtml).not.toContain('data-training-admin-drawer=""');
    expect(shellHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(shellHtml).not.toContain('data-forge-workspace-layout="two-rails"');
    expect(shellHtml).not.toContain('data-training-admin-rail=""');
    expect(stageHtml).toContain("relative space-y-6");
    expect(stageHtml).toContain("rounded-[1.25rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/45 p-6");
    expect(tocHtml).toContain("rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-panel-bg)] p-6");
    expect(`${stageHtml}${tocHtml}`).not.toContain("#74b1ff");
  });

  it("renders active-state semantics for the curriculum map and stage switcher", () => {
    const html = renderToStaticMarkup(
      <TrainingLearnerPanel
        initialModules={baseModules}
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
