"use client";

import { cn } from "@argos-v2/ui";
import type { TrainingModuleRecord } from "@/lib/training/service";

export type TrainingQuizQuestionDraft = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

export type TrainingQuizEditorProps = {
  onChange: (nextValue: TrainingQuizQuestionDraft[]) => void;
  value: TrainingQuizQuestionDraft[];
};

export function createEmptyTrainingQuizQuestionDraft(): TrainingQuizQuestionDraft {
  return {
    prompt: "",
    options: ["", ""],
    correctOptionIndex: 0,
  };
}

export function quizDataToTrainingQuizQuestionDrafts(
  quizData: TrainingModuleRecord["quizData"],
): TrainingQuizQuestionDraft[] {
  return quizData?.questions.map((question) => ({
    prompt: question.question,
    options: [...question.options],
    correctOptionIndex: question.correctIndex,
  })) ?? [];
}

export function normalizeTrainingQuizQuestionDrafts(
  drafts: TrainingQuizQuestionDraft[],
): TrainingModuleRecord["quizData"] {
  const questions = drafts.flatMap((draft) => {
    const prompt = draft.prompt.trim();
    const options = draft.options
      .map((option, index) => ({ index, value: option.trim() }))
      .filter((option) => option.value);
    const correctOption = options.find((option) => option.index === draft.correctOptionIndex);

    if (
      !prompt ||
      options.length < 2 ||
      !Number.isInteger(draft.correctOptionIndex) ||
      draft.correctOptionIndex < 0 ||
      !correctOption
    ) {
      return [];
    }

    return [
      {
        question: prompt,
        options: options.map((option) => option.value),
        correctIndex: options.findIndex((option) => option.index === draft.correctOptionIndex),
      },
    ];
  });

  return questions.length ? { questions } : null;
}

function ensureVisibleQuestions(value: TrainingQuizQuestionDraft[]) {
  return value.length > 0 ? value : [createEmptyTrainingQuizQuestionDraft()];
}

export function appendTrainingQuizQuestionDraft(
  value: TrainingQuizQuestionDraft[],
): TrainingQuizQuestionDraft[] {
  return [...ensureVisibleQuestions(value), createEmptyTrainingQuizQuestionDraft()];
}

function updateQuestion(
  value: TrainingQuizQuestionDraft[],
  questionIndex: number,
  updater: (draft: TrainingQuizQuestionDraft) => TrainingQuizQuestionDraft,
) {
  const visibleQuestions = ensureVisibleQuestions(value);

  return visibleQuestions.map((question, index) => (index === questionIndex ? updater(question) : question));
}

export function canRemoveTrainingQuizQuestionOption(
  draft: TrainingQuizQuestionDraft,
  optionIndex: number,
): boolean {
  return draft.options.length > 2 && draft.correctOptionIndex !== optionIndex;
}

export function removeTrainingQuizQuestionOption(
  draft: TrainingQuizQuestionDraft,
  optionIndex: number,
): TrainingQuizQuestionDraft {
  if (!canRemoveTrainingQuizQuestionOption(draft, optionIndex)) {
    return draft;
  }

  const options = draft.options.filter((_, index) => index !== optionIndex);
  const correctOptionIndex =
    draft.correctOptionIndex > optionIndex ? draft.correctOptionIndex - 1 : draft.correctOptionIndex;

  return {
    ...draft,
    correctOptionIndex,
    options,
  };
}

export function TrainingQuizEditor({ onChange, value }: TrainingQuizEditorProps) {
  const visibleQuestions = ensureVisibleQuestions(value);

  function handleAddQuestion() {
    onChange(appendTrainingQuizQuestionDraft(value));
  }

  function handleRemoveQuestion(questionIndex: number) {
    onChange(value.filter((_, index) => index !== questionIndex));
  }

  function handleUpdateQuestion(
    questionIndex: number,
    updater: (draft: TrainingQuizQuestionDraft) => TrainingQuizQuestionDraft,
  ) {
    onChange(updateQuestion(value, questionIndex, updater));
  }

  function handleAddOption(questionIndex: number) {
    handleUpdateQuestion(questionIndex, (draft) => ({
      ...draft,
      options: [...draft.options, ""],
    }));
  }

  function handleRemoveOption(questionIndex: number, optionIndex: number) {
    handleUpdateQuestion(questionIndex, (draft) => {
      return removeTrainingQuizQuestionOption(draft, optionIndex);
    });
  }

  return (
    <section className="rounded-2xl border border-[#45484f]/15 bg-[#161a21]/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">
            Quick quiz builder
          </p>
          <p className="mt-1 text-sm text-[#a9abb3]">
            Add questions, options, and correct answers without raw JSON.
          </p>
        </div>
        <button
          className="rounded-xl border border-[#45484f]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10"
          onClick={handleAddQuestion}
          type="button"
        >
          Add question
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {visibleQuestions.map((question, questionIndex) => (
          <article
            className="rounded-xl border border-[#45484f]/10 bg-[#10131a]/80 p-4"
            key={`question-${questionIndex}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Question {questionIndex + 1}</p>
              <button
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3] hover:text-white"
                onClick={() => handleRemoveQuestion(questionIndex)}
                type="button"
              >
                Remove question
              </button>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
                Prompt
              </span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-[#45484f]/15 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
                onChange={(event) =>
                  handleUpdateQuestion(questionIndex, (draft) => ({ ...draft, prompt: event.target.value }))
                }
                value={question.prompt}
              />
            </label>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">Options</p>
                  <button
                    className="rounded-lg border border-[#45484f]/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ecedf6] transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10"
                    onClick={() => handleAddOption(questionIndex)}
                    type="button"
                  >
                    Add option
                  </button>
                </div>

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div className="flex items-center gap-2" key={`${questionIndex}-${optionIndex}`}>
                      <input
                        aria-label={`Option ${optionIndex + 1}`}
                        className="min-w-0 flex-1 rounded-xl border border-[#45484f]/15 bg-[#10131a] px-4 py-3 text-sm text-white outline-none"
                        onChange={(event) =>
                          handleUpdateQuestion(questionIndex, (draft) => ({
                            ...draft,
                            options: draft.options.map((currentOption, currentIndex) =>
                              currentIndex === optionIndex ? event.target.value : currentOption,
                            ),
                          }))
                        }
                        value={option}
                      />
                      {question.options.length > 2 ? (
                        <button
                          className={cn(
                            "rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                            canRemoveTrainingQuizQuestionOption(question, optionIndex)
                              ? "border-[#45484f]/20 text-[#a9abb3] hover:border-[#74b1ff]/30 hover:text-white"
                              : "cursor-not-allowed border-[#45484f]/10 text-[#45484f]",
                          )}
                          disabled={!canRemoveTrainingQuizQuestionOption(question, optionIndex)}
                          onClick={() => handleRemoveOption(questionIndex, optionIndex)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
                  Correct answer
                </span>
                <select
                  className={cn(
                    "w-full rounded-xl border border-[#45484f]/15 bg-[#10131a] px-4 py-3 text-sm text-white outline-none",
                  )}
                  onChange={(event) =>
                    handleUpdateQuestion(questionIndex, (draft) => ({
                      ...draft,
                      correctOptionIndex: Number.parseInt(event.target.value, 10),
                    }))
                  }
                  value={question.correctOptionIndex}
                >
                  {question.options.map((option, optionIndex) => (
                    <option key={`${questionIndex}-${optionIndex}`} value={optionIndex}>
                      {option.trim() || `Option ${optionIndex + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
