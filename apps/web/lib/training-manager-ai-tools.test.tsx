import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrainingManagerAiTools } from "../components/training/training-manager-ai-tools";

const selectedModule = {
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
};

describe("TrainingManagerAiTools", () => {
  it("renders module-scoped AI drafting actions for managers", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerAiTools
        aiAvailable
        canManage
        contextNotes=""
        isBusy={false}
        onContextNotesChange={() => {}}
        onGenerate={() => {}}
        selectedModule={selectedModule}
      />,
    );

    expect(html).toContain("Lesson drafting");
    expect(html).toContain("Draft lesson content");
    expect(html).toContain("Draft quiz");
    expect(html).toContain("Context notes");
    expect(html).toContain("Discovery That Finds the Real Pain");
    expect(html).not.toContain('disabled=""');
  });

  it("disables the drafting actions when course context or AI is missing", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerAiTools
        aiAvailable={false}
        canManage
        contextNotes=""
        isBusy={false}
        onContextNotesChange={() => {}}
        onGenerate={() => {}}
        selectedModule={{
          ...selectedModule,
          description: null,
          videoUrl: null,
        }}
      />,
    );

    expect(html).toContain("Add course context to enable module-scoped drafts.");
    expect(html).toContain("Draft lesson content");
    expect(html).toContain("Draft quiz");
    expect(html).toContain('disabled=""');
  });

  it("surfaces notes-only grounding and disables actions while busy", () => {
    const html = renderToStaticMarkup(
      <TrainingManagerAiTools
        aiAvailable
        canManage
        contextNotes="Ground this in stalled reporting workflows."
        isBusy
        onContextNotesChange={() => {}}
        onGenerate={() => {}}
        selectedModule={{
          ...selectedModule,
          description: null,
          videoUrl: null,
        }}
      />,
    );

    expect(html).toContain("Ground this in stalled reporting workflows.");
    expect(html).toContain('disabled=""');
  });
});
