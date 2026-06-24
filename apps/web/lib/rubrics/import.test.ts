import { describe, expect, it } from "vitest";
import {
  RUBRIC_IMPORT_LIMITS,
  parseCsvRubricImport,
  parseJsonRubricImport,
} from "./import";

describe("parseCsvRubricImport", () => {
  it("keeps valid rows and reports invalid rows separately", () => {
    const result = parseCsvRubricImport(
      [
        "name,slug,description,weight,excellent,proficient,developing,lookFor",
        '"Build Rapport",rapport,"Opens with relevant context",5,"Strong opener","Solid opener","Weak opener","Professional tone|Relevant context"',
        '"",broken,"Missing name",0,"","","",""',
      ].join("\n"),
      "Imported CSV Rubric",
    );

    expect(result.rubric.name).toBe("Imported CSV Rubric");
    expect(result.rubric.categories).toHaveLength(1);
    expect(result.rubric.categories[0]).toMatchObject({
      slug: "rapport",
      name: "Build Rapport",
      weight: 5,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: 3,
        field: "name",
      }),
      expect.objectContaining({
        row: 3,
        field: "weight",
      }),
    ]);
  });

  it("preserves quoted multiline cells in a single csv row", () => {
    const result = parseCsvRubricImport(
      [
        "name,slug,description,weight,excellent,proficient,developing,lookFor",
        '"Discovery",discovery,"Line one',
        'Line two",10,"Great","Good","Weak","Pain|Urgency"',
      ].join("\n"),
      "Imported CSV Rubric",
    );

    expect(result.issues).toEqual([]);
    expect(result.rubric.categories).toHaveLength(1);
    expect(result.rubric.categories[0]).toMatchObject({
      slug: "discovery",
      name: "Discovery",
      description: "Line one\nLine two",
      weight: 10,
    });
  });

  it("rejects csv content before parsing when the file is over the byte limit", () => {
    const result = parseCsvRubricImport(
      "x".repeat(RUBRIC_IMPORT_LIMITS.maxContentBytes + 1),
      "oversized.csv",
    );

    expect(result.rubric.categories).toHaveLength(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: null,
        field: "file",
        message: expect.stringContaining("at most"),
      }),
    ]);
  });

  it("rejects csv imports that exceed the row cap before normalizing entries", () => {
    const result = parseCsvRubricImport(
      [
        "name,slug,description,weight,excellent,proficient,developing,lookFor",
        "Discovery,discovery,,10,Great,Good,Weak,Pain",
        "Close,close,,10,Great,Good,Weak,Urgency",
      ].join("\n"),
      "rows.csv",
      { maxCsvRows: 2 },
    );

    expect(result.rubric.categories).toHaveLength(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: null,
        field: "file",
        message: expect.stringContaining("at most 2 rows"),
      }),
    ]);
  });
});

describe("parseJsonRubricImport", () => {
  it("accepts a rubric-shaped JSON payload and reports invalid categories", () => {
    const result = parseJsonRubricImport(
      JSON.stringify({
        name: "Imported JSON Rubric",
        description: "Imported from JSON",
        categories: [
          {
            slug: "discovery",
            name: "Discovery",
            description: "Depth of discovery",
            weight: 15,
            scoringCriteria: {
              excellent: "Uncovers pain and urgency",
              proficient: "Finds some pain",
              developing: "Stays surface level",
              lookFor: ["Pain", "Urgency"],
            },
          },
          {
            slug: "",
            name: "",
            description: "",
            weight: 0,
            scoringCriteria: {},
          },
        ],
      }),
      "fallback.json",
    );

    expect(result.rubric.name).toBe("Imported JSON Rubric");
    expect(result.rubric.categories).toHaveLength(1);
    expect(result.issues).toEqual([
      expect.objectContaining({ row: 2, field: "slug" }),
      expect.objectContaining({ row: 2, field: "name" }),
      expect.objectContaining({ row: 2, field: "weight" }),
    ]);
  });

  it("rejects json content before parsing when the payload is over the byte limit", () => {
    const result = parseJsonRubricImport(
      "x".repeat(RUBRIC_IMPORT_LIMITS.maxContentBytes + 1),
      "oversized.json",
    );

    expect(result.rubric.categories).toHaveLength(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: null,
        field: "file",
        message: expect.stringContaining("at most"),
      }),
    ]);
  });

  it("rejects json imports that exceed the category cap before normalizing categories", () => {
    const result = parseJsonRubricImport(
      JSON.stringify({
        name: "Too many categories",
        categories: [
          {
            slug: "one",
            name: "One",
            description: "",
            weight: 1,
            scoringCriteria: {},
          },
          {
            slug: "two",
            name: "Two",
            description: "",
            weight: 1,
            scoringCriteria: {},
          },
        ],
      }),
      "too-many.json",
      { maxCategories: 1 },
    );

    expect(result.rubric.categories).toHaveLength(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: null,
        field: "categories",
        message: expect.stringContaining("at most 1 categories"),
      }),
    ]);
  });

  it("rejects imported categories that exceed the lookFor item cap", () => {
    const result = parseJsonRubricImport(
      JSON.stringify({
        name: "Too many look-fors",
        categories: [
          {
            slug: "discovery",
            name: "Discovery",
            description: "",
            weight: 1,
            scoringCriteria: {
              excellent: "Great",
              proficient: "Good",
              developing: "Weak",
              lookFor: ["Pain", "Urgency"],
            },
          },
        ],
      }),
      "too-many-look-fors.json",
      { maxLookForItems: 1 },
    );

    expect(result.rubric.categories).toHaveLength(0);
    expect(result.issues).toEqual([
      expect.objectContaining({
        row: 1,
        field: "lookFor",
        message: expect.stringContaining("at most 1 items"),
      }),
    ]);
  });
});
