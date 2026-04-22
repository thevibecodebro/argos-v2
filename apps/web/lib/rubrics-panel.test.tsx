import { createElement } from "react";
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

describe("RubricsPanel", () => {
  it("renders the active rubric summary, wizard entry points, and version history", () => {
    const html = renderToStaticMarkup(
      createElement(RubricsPanel, {
        initialActiveRubric: activeRubric,
        initialHistory: history,
        defaultTemplate,
      }),
    );

    expect(html).toContain("Active Rubric");
    expect(html).toContain("Revenue Scorecard v4");
    expect(html).toContain("Choose Source");
    expect(html).toContain("Edit Draft");
    expect(html).toContain("Review &amp; Fix");
    expect(html).toContain("Publish");
    expect(html).toContain("New Draft from Active");
    expect(html).toContain("Clone Historical Version");
    expect(html).toContain("Start from Default Template");
    expect(html).toContain("Import CSV");
    expect(html).toContain("Import JSON");
    expect(html).toContain("Version History");
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
});
