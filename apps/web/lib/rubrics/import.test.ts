import { describe, expect, it } from "vitest";
import { parseCsvRubricImport, parseJsonRubricImport } from "./import";

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
});
