import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrainingPanel } from "../components/training-panel";

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

const baseTeamProgress = [
  {
    repId: "rep-1",
    firstName: "Maya",
    lastName: "Chen",
    email: "maya@example.com",
    assigned: 3,
    passed: 2,
    completionRate: 67,
  },
];

describe("TrainingPanel", () => {
  it("does not show Create module to reps", () => {
    const html = renderToStaticMarkup(
      createElement(TrainingPanel, {
        canManage: false,
        aiAvailable: false,
        initialModules: baseModules,
        initialTeamProgress: baseTeamProgress,
      }),
    );

    expect(html).not.toContain("Create module");
    expect(html).not.toContain("Generate with AI");
  });

  it("shows Create module to managers", () => {
    const html = renderToStaticMarkup(
      createElement(TrainingPanel, {
        canManage: true,
        aiAvailable: true,
        initialModules: baseModules,
        initialTeamProgress: baseTeamProgress,
      }),
    );

    expect(html).toContain("Create module");
    expect(html).toContain("Team Progress");
    expect(html).toContain("Average completion");
    expect(html).toContain("Maya Chen");
  });

  it("shows Generate with AI to managers", () => {
    const html = renderToStaticMarkup(
      createElement(TrainingPanel, {
        canManage: true,
        aiAvailable: true,
        initialModules: baseModules,
        initialTeamProgress: baseTeamProgress,
      }),
    );

    expect(html).toContain("Generate with AI");
  });

  it("disables the AI button when unavailable", () => {
    const html = renderToStaticMarkup(
      createElement(TrainingPanel, {
        canManage: true,
        aiAvailable: false,
        initialModules: baseModules,
        initialTeamProgress: baseTeamProgress,
      }),
    );

    expect(html).toContain("Generate with AI");
    expect(html).toContain('disabled=""');
  });
});
