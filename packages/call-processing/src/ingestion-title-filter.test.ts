import { describe, expect, it } from "vitest";
import {
  canonicalizeIngestionTitleText,
  evaluateIngestionTitleFilter,
  type IngestionTitleFilterConfig,
} from "./ingestion-title-filter";

function config(
  includePhrases: string[],
  excludePhrases: string[] = [],
): IngestionTitleFilterConfig {
  return {
    configured: includePhrases.length > 0,
    excludePhrases,
    includePhrases,
  };
}

describe("canonicalizeIngestionTitleText", () => {
  it("strips Unicode format characters while trimming and collapsing whitespace", () => {
    expect(
      canonicalizeIngestionTitleText("  Inte\u200br\u2060nal\u00ad\t  Review  "),
    ).toBe("Internal Review");
  });
});

describe("evaluateIngestionTitleFilter", () => {
  it("normalizes Unicode, casing, and whitespace before matching a contained include", () => {
    expect(
      evaluateIngestionTitleFilter(
        "  Ｗｅｅｋｌｙ\t  Ｒｅｖｉｅｗ - North  ",
        config(["Weekly Review"]),
      ),
    ).toEqual({
      accepted: true,
      matchedPhrase: "Weekly Review",
      reason: "included",
    });
  });

  it("lets a contained exclusion win over a contained inclusion", () => {
    expect(
      evaluateIngestionTitleFilter(
        "Weekly Review - Internal Calibration",
        config(["Weekly Review"], ["Internal Calibration"]),
      ),
    ).toEqual({
      accepted: false,
      matchedPhrase: "Internal Calibration",
      reason: "excluded",
    });
  });

  it("rejects a blank normalized title as missing", () => {
    expect(evaluateIngestionTitleFilter(" \n\t ", config([]))).toEqual({
      accepted: false,
      reason: "missing_title",
    });
  });

  it("rejects a title as unconfigured when there are no include phrases", () => {
    expect(evaluateIngestionTitleFilter("Customer discovery", config([]))).toEqual({
      accepted: false,
      reason: "unconfigured",
    });
  });

  it("still applies exclusions when there are no include phrases", () => {
    expect(
      evaluateIngestionTitleFilter(
        "Internal Calibration",
        config([], ["Internal"]),
      ),
    ).toEqual({
      accepted: false,
      matchedPhrase: "Internal",
      reason: "excluded",
    });
  });

  it("rejects a configured title that contains no include phrase", () => {
    expect(
      evaluateIngestionTitleFilter(
        "Customer discovery",
        config(["Weekly Review"]),
      ),
    ).toEqual({
      accepted: false,
      reason: "no_include_match",
    });
  });
});
