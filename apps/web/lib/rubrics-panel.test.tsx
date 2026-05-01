import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  RubricsPanel,
  createRubricDraftRequest,
  fetchRubricDetailRequest,
  previewRubricImportRequest,
  publishRubricRequest,
} from "../components/settings/rubrics-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const activeRubric = {
  id: "rubric-4",
  orgId: "org-1",
  version: 4,
  name: "Revenue Scorecard v4",
  description: "Current production rubric",
  status: "active" as const,
  isActive: true,
  isTemplate: false,
  createdBy: "user-1",
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z",
  categoryCount: 2,
  categories: [
    {
      id: "cat-1",
      rubricId: "rubric-4",
      slug: "rapport",
      name: "Build Rapport",
      description: "Start strong",
      weight: 5,
      sortOrder: 0,
      scoringCriteria: {
        excellent: "Strong opener",
        proficient: "Solid opener",
        developing: "Weak opener",
        lookFor: ["Relevant context"],
      },
      createdAt: "2026-04-21T00:00:00.000Z",
    },
    {
      id: "cat-2",
      rubricId: "rubric-4",
      slug: "discovery",
      name: "Discovery",
      description: "Uncover pain",
      weight: 15,
      sortOrder: 1,
      scoringCriteria: {
        excellent: "Gets to pain",
        proficient: "Some discovery",
        developing: "Surface questions",
        lookFor: ["Pain"],
      },
      createdAt: "2026-04-21T00:00:00.000Z",
    },
  ],
};

const history = [
  {
    id: "rubric-4",
    orgId: "org-1",
    version: 4,
    name: "Revenue Scorecard v4",
    description: "Current production rubric",
    status: "active" as const,
    isActive: true,
    isTemplate: false,
    createdBy: "user-1",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
    categoryCount: 2,
  },
  {
    id: "rubric-3",
    orgId: "org-1",
    version: 3,
    name: "Revenue Scorecard v3",
    description: "Previous rubric",
    status: "draft" as const,
    isActive: false,
    isTemplate: false,
    createdBy: "user-1",
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    categoryCount: 2,
  },
];

const defaultTemplate = {
  name: "Revenue Scorecard",
  description: "Template",
  categories: [
    {
      slug: "rapport",
      name: "Build Rapport",
      description: "Start strong",
      weight: 5,
      sortOrder: 0,
      scoringCriteria: {
        excellent: "Strong opener",
        proficient: "Solid opener",
        developing: "Weak opener",
        lookFor: ["Relevant context"],
      },
    },
  ],
};

const rubricsPanelSource = readFileSync(new URL("../components/settings/rubrics-panel.tsx", import.meta.url), "utf8");

function expectOutlineNoneClassesToUseForgeFocus(source: string) {
  const classes = source.match(/"[^"]*outline-none[^"]*"/g) ?? [];

  expect(classes.length).toBeGreaterThan(0);
  expect(classes.every((className) => className.includes("focus-visible:border-[var(--forge-gold)]"))).toBe(true);
  expect(classes.every((className) => className.includes("focus-visible:ring-2"))).toBe(true);
  expect(classes.every((className) => className.includes("focus-visible:ring-[var(--forge-gold)]/35"))).toBe(true);
}

describe("RubricsPanel", () => {
  it("renders the scoring builder rail, compact category editor, and publish readiness panel", () => {
    const html = renderToStaticMarkup(
      createElement(RubricsPanel, {
        initialActiveRubric: activeRubric,
        initialHistory: history,
        defaultTemplate,
      }),
    );

    expect(html).toContain('data-rubric-builder-rail=""');
    expect(html).toContain('data-rubric-category-editor=""');
    expect(html).toContain('data-rubric-readiness-panel=""');
    expect(html).toContain('data-forge-workspace-layout="two-rails"');
    expect(html).toContain('data-forge-workspace-main="true"');
    expect(html.indexOf('data-rubric-builder-rail=""')).toBeLessThan(
      html.indexOf('data-rubric-category-editor=""'),
    );
    expect(html.indexOf('data-rubric-category-editor=""')).toBeLessThan(
      html.indexOf('data-rubric-readiness-panel=""'),
    );
    expect(html).toContain("forge-workspace-layout");
    expect(html).toContain("forge-workspace-rail");
    expect(html).toContain('data-forge-workspace-rail-group="Source options"');
    expect(html).toContain('data-forge-workspace-rail-group="Clone or import"');
    expect(html).toContain('data-forge-workspace-rail-group="Active version"');
    expect(html).toContain('data-forge-workspace-rail-group="Workflow"');
    expect(html).toContain('data-forge-workspace-rail-group="Readiness"');
    expect(html).toContain('data-forge-workspace-rail-group="Publish controls"');
    expect(html).toContain('data-rubric-publish-controls="streamlined"');
    expect(html).toContain('data-forge-workspace-rail-action="true"');
    expect(html).not.toContain('xl:order-1');
    expect(html).not.toContain('xl:order-2');
    expect(html).not.toContain('xl:order-3');
    expect(html).toContain('aria-label="Rubric admin controls"');
    expect(html).toContain('data-settings-nav-theme="forge"');
    expect(html).toContain("Source and versions");
    expect(html).toContain("Active Rubric");
    expect(html).toContain("Revenue Scorecard v4");
    expect(html).toContain("Category editor");
    expect(html).toContain("Published scoring categories");
    expect(html).toContain('data-rubric-category-row=""');
    expect(html).toContain("Build Rapport");
    expect(html).toContain("Weight");
    expect(html).toContain("Readiness panel");
    expect(html).toContain("Validation issues");
    expect(html).toContain("Import warnings");
    expect(html).toContain("Server draft");
    expect(html).toContain("No draft started");
    expect(html).toContain("Choose Source");
    expect(html).toContain("Edit Draft");
    expect(html).toContain("Review &amp; Fix");
    expect(html).toContain("Publish");
    expect(html).toContain("New Draft from Active");
    expect(html).toContain("Clone Historical Version");
    expect(html).toContain("Start from Default Template");
    expect(html).toContain("Import CSV");
    expect(html).toContain("Import JSON");
    expect(html).toContain("Preview Import");
    expect(html).toContain('aria-label="Import CSV rubric file"');
    expect(rubricsPanelSource).toContain('setRubricRequestStatus("prepare")');
    expect(rubricsPanelSource).toContain('setRubricRequestStatus("publish")');
    expect(rubricsPanelSource).toContain("Preparing rubric draft.");
    expect(rubricsPanelSource).toContain("Publishing rubric draft.");
    expect(html).toContain("Publish Draft");
    expect(html).not.toContain("Review Draft");
    expect(html).toContain("Version History");
    expect(html).not.toContain(">content_copy<");
    expect(html).not.toContain(">auto_fix<");
    expect(html).not.toContain(">publish<");
  });

  it("requests historical rubric detail through the rubrics api", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "rubric-3", version: 3, categories: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchRubricDetailRequest(fetchMock as typeof fetch, "rubric-3")).resolves.toEqual({
      ok: true,
      data: { id: "rubric-3", version: 3, categories: [] },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics?rubricId=rubric-3", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("previews rubric imports through the rubrics api", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rubric: defaultTemplate, issues: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      previewRubricImportRequest(fetchMock as typeof fetch, {
        sourceType: "csv_import",
        fileName: "rubric.csv",
        content: "name,slug,weight",
      }),
    ).resolves.toEqual({
      ok: true,
      data: { rubric: defaultTemplate, issues: [] },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preview: true,
        sourceType: "csv_import",
        fileName: "rubric.csv",
        content: "name,slug,weight",
      }),
    });
  });

  it("creates draft rubrics through the rubrics api", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "rubric-5", version: 5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      createRubricDraftRequest(fetchMock as typeof fetch, {
        sourceType: "manual",
        rubric: defaultTemplate,
      }),
    ).resolves.toEqual({
      ok: true,
      data: { id: "rubric-5", version: 5 },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual",
        rubric: defaultTemplate,
      }),
    });
  });

  it("publishes draft rubrics through the publish api", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "rubric-5", isActive: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(publishRubricRequest(fetchMock as typeof fetch, "rubric-5")).resolves.toEqual({
      ok: true,
      data: { id: "rubric-5", isActive: true },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rubrics/rubric-5/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("uses visible Forge focus styling on rubric admin inputs", () => {
    expect(rubricsPanelSource).toContain('data-rubric-focus-hardened="true"');
    expectOutlineNoneClassesToUseForgeFocus(rubricsPanelSource);
  });

  it("keeps the destructive category remove action outside the summary toggle", () => {
    const summaryStart = rubricsPanelSource.indexOf("<summary");
    const summaryEnd = rubricsPanelSource.indexOf("</summary>", summaryStart);
    const summaryMarkup = rubricsPanelSource.slice(summaryStart, summaryEnd);
    const removeActionIndex = rubricsPanelSource.indexOf('data-rubric-category-remove-action="body"');

    expect(summaryStart).toBeGreaterThanOrEqual(0);
    expect(summaryEnd).toBeGreaterThan(summaryStart);
    expect(summaryMarkup).not.toContain("Remove");
    expect(removeActionIndex).toBeGreaterThan(summaryEnd);
    expect(rubricsPanelSource).toContain("Remove category");
  });
});
