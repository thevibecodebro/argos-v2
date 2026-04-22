import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  appendTrainingQuizQuestionDraft,
  canRemoveTrainingQuizQuestionOption,
  createEmptyTrainingQuizQuestionDraft,
  normalizeTrainingQuizQuestionDrafts,
  removeTrainingQuizQuestionOption,
  TrainingQuizEditor,
} from "../components/training/training-quiz-editor";

describe("TrainingQuizEditor", () => {
  it("renders structured quiz authoring controls", () => {
    const html = renderToStaticMarkup(
      <TrainingQuizEditor
        onChange={() => {}}
        value={[]}
      />,
    );

    expect(html).toContain("Quiz builder");
    expect(html).toContain("Add question");
    expect(html).toContain("Question 1");
    expect(html).toContain("Prompt");
    expect(html).toContain("Correct answer");
    expect(html).toContain("Add option");
    expect(html).toContain("Remove question");
  });

  it("drops incomplete quiz questions when normalizing", () => {
    expect(
      normalizeTrainingQuizQuestionDrafts([
        {
          prompt: "",
          options: ["A", "B"],
          correctOptionIndex: 0,
        },
        {
          prompt: "  ",
          options: ["A", "B"],
          correctOptionIndex: 0,
        },
        {
          prompt: "What is the strongest reason to qualify early?",
          options: ["To move faster", "To focus the next step"],
          correctOptionIndex: 1,
        },
      ]),
    ).toEqual({
      questions: [
        {
          question: "What is the strongest reason to qualify early?",
          options: ["To move faster", "To focus the next step"],
          correctIndex: 1,
        },
      ],
    });
  });

  it("filters blank options and remaps the correct answer index", () => {
    expect(
      normalizeTrainingQuizQuestionDrafts([
        {
          prompt: "How should a manager review discovery quality?",
          options: ["By call volume alone", " ", "By the pain surfaced in the conversation"],
          correctOptionIndex: 2,
        },
      ]),
    ).toEqual({
      questions: [
        {
          question: "How should a manager review discovery quality?",
          options: ["By call volume alone", "By the pain surfaced in the conversation"],
          correctIndex: 1,
        },
      ],
    });
  });

  it("adds a second visible question from the empty starter state", () => {
    expect(appendTrainingQuizQuestionDraft([])).toEqual([
      createEmptyTrainingQuizQuestionDraft(),
      createEmptyTrainingQuizQuestionDraft(),
    ]);
  });

  it("prevents removing the selected correct answer or dropping below two options", () => {
    const draft = {
      prompt: "What matters most in discovery?",
      options: ["Timeline", "Pain", "Budget"],
      correctOptionIndex: 1,
    };

    expect(canRemoveTrainingQuizQuestionOption(draft, 1)).toBe(false);
    expect(removeTrainingQuizQuestionOption(draft, 1)).toEqual(draft);
    expect(
      removeTrainingQuizQuestionOption(
        {
          ...draft,
          options: ["Timeline", "Pain"],
        },
        0,
      ),
    ).toEqual({
      ...draft,
      options: ["Timeline", "Pain"],
    });
  });

  it("remaps the correct answer when removing an earlier distractor", () => {
    expect(
      removeTrainingQuizQuestionOption(
        {
          prompt: "What should a layered ask uncover?",
          options: ["Timeline", "Budget", "Root cause"],
          correctOptionIndex: 2,
        },
        0,
      ),
    ).toEqual({
      prompt: "What should a layered ask uncover?",
      options: ["Budget", "Root cause"],
      correctOptionIndex: 1,
    });
  });
});
