import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  TeamRepProfileView,
  TeamRosterView,
} from "../components/team/team-views";

const dashboard = {
  reps: [
    {
      id: "rep-1",
      firstName: "Avery",
      lastName: "Stone",
      profileImageUrl: null,
      compositeScore: 91,
      weekOverWeekDelta: 6,
      needsCoaching: false,
      callCount: 18,
    },
    {
      id: "rep-2",
      firstName: "Mina",
      lastName: "Cross",
      profileImageUrl: null,
      compositeScore: 68,
      weekOverWeekDelta: -12,
      needsCoaching: true,
      callCount: 9,
    },
  ],
  teamAvgScore: 84,
  totalCallsThisMonth: 27,
  coachingFlagsCount: 1,
};

const repDashboard = {
  monthlyAvgScore: 87,
  weeklyTrend: [
    { week: "2026-02-02", avgScore: 72, callCount: 1 },
    { week: "2026-02-09", avgScore: 75, callCount: 2 },
    { week: "2026-02-16", avgScore: null, callCount: 0 },
    { week: "2026-02-23", avgScore: 80, callCount: 2 },
    { week: "2026-03-02", avgScore: 84, callCount: 1 },
    { week: "2026-03-09", avgScore: 87, callCount: 2 },
    { week: "2026-03-16", avgScore: 86, callCount: 1 },
    { week: "2026-03-23", avgScore: 89, callCount: 1 },
    { week: "2026-03-30", avgScore: 90, callCount: 2 },
    { week: "2026-04-06", avgScore: 91, callCount: 1 },
    { week: "2026-04-13", avgScore: 88, callCount: 1 },
    { week: "2026-04-20", avgScore: 92, callCount: 1 },
  ],
  lowestCategories: [
    { category: "Discovery", avgScore: 74 },
    { category: "Closing", avgScore: 79 },
    { category: "Frame Control", avgScore: 82 },
  ],
  recentCalls: [
    {
      id: "call-1",
      status: "complete",
      overallScore: 92,
      durationSeconds: 845,
      callTopic: "Northwind discovery",
      repId: "rep-1",
      createdAt: "2026-04-18T13:00:00.000Z",
      repFirstName: "Avery",
      repLastName: "Stone",
    },
  ],
  categoryAnalyticsContextLabel: null,
};

const badges = {
  badges: [
    {
      id: "certified",
      name: "Certified",
      description: "Pass your first training module.",
      emoji: "📚",
      earned: true,
      earnedAt: "2026-04-02T12:00:00.000Z",
    },
    {
      id: "roleplay_5x",
      name: "Roleplay Pro",
      description: "Complete 5 AI roleplay sessions.",
      emoji: "🎭",
      earned: false,
      earnedAt: null,
    },
  ],
};

describe("TeamRosterView", () => {
  it("renders summary metrics and roster rows", () => {
    const html = renderToStaticMarkup(createElement(TeamRosterView, { dashboard }));

    expect(html).toContain("Roster overview");
    expect(html).toContain("Rep roster");
    expect(html).toContain("Team average");
    expect(html).toContain("Needs coaching");
    expect(html).toContain("Avery Stone");
    expect(html).toContain("Mina Cross");
    expect(html).toContain("Open profile");
  });

  it("renders the empty state when no reps are available", () => {
    const html = renderToStaticMarkup(
      createElement(TeamRosterView, {
        dashboard: {
          reps: [],
          teamAvgScore: null,
          totalCallsThisMonth: 0,
          coachingFlagsCount: 0,
        },
      }),
    );

    expect(html).toContain("No team members found");
    expect(html).toContain("populate the team roster");
  });
});

describe("TeamRepProfileView", () => {
  it("renders the profile sections and uses icon badges instead of emoji characters", () => {
    const html = renderToStaticMarkup(
      createElement(TeamRepProfileView, {
        badges,
        rep: dashboard.reps[0]!,
        repDashboard,
      }),
    );

    expect(html).toContain("Team member");
    expect(html).toContain("Current snapshot");
    expect(html).toContain("Weekly trend");
    expect(html).toContain("Recent calls");
    expect(html).toContain("Badges &amp; milestones");
    expect(html).toContain("Certified");
    expect(html).not.toContain("📚");
    expect(html).not.toContain("🎭");
  });
});
