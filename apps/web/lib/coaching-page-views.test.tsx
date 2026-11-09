import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeaderboardPageView } from "../components/leaderboard-page-view";
import { TrainingBuilderPageView, TrainingLearnerPageView, TrainingTeamPageView } from "../components/training/training-pages";
import { TeamPageView } from "../components/team/team-pages";

const entry = { userId: "synthetic-rep", firstName: "Avery", lastName: "Stone", profileImageUrl: null, rank: 2, value: 78 };

describe("coaching page views", () => {
  it("keeps rank, score, volume, and signed movement together without a pretend selection", () => {
    const html = renderToStaticMarkup(<LeaderboardPageView leaderboard={{ topQuality: [entry], topVolume: [{...entry,value:9}], mostImproved: [{...entry,value:-3}] }} />);
    expect(html).toContain('data-leaderboard-route="rank-table"');
    expect(html).toContain('data-leaderboard-mobile-list="true"');
    expect(html).toContain('href="/team/synthetic-rep"');
    expect(html).toContain('#2');
    expect(html).toContain('>78<');
    expect(html).toContain('>9<');
    expect(html).toContain('>-3<');
    expect(html).not.toContain('+-3');
    expect(html).not.toContain('data-selected-object-drawer');
    expect(html).not.toContain('Focus area');
  });

  it("keeps source entries that only have volume or improvement, without inventing a score", () => {
    const html = renderToStaticMarkup(<LeaderboardPageView leaderboard={{topQuality:[],topVolume:[{...entry,value:4}],mostImproved:[]}} />);
    expect(html).toContain('Avery Stone');
    expect(html).toContain('>4<');
    expect(html).toContain('—');
    expect(html).not.toContain('Needs review');
  });

  it("shows a useful empty ledger", () => {
    expect(renderToStaticMarkup(<LeaderboardPageView leaderboard={null} />)).toContain('No leaderboard data');
    expect(renderToStaticMarkup(<TeamPageView dashboard={null} />)).toContain('No team members found');
  });

  it("keeps curriculum and team links contextual to manager permissions", () => {
    const learner = renderToStaticMarkup(<TrainingLearnerPageView canManage={false} canViewHighlights modules={[]}><div>Lesson content</div></TrainingLearnerPageView>);
    const manager = renderToStaticMarkup(<TrainingLearnerPageView canManage modules={[]}><div>Lesson content</div></TrainingLearnerPageView>);
    expect(learner).toContain('Lesson content');
    expect(learner).toContain('href="/highlights"');
    expect(learner).not.toContain('href="/training/builder"');
    expect(learner).not.toContain('href="/training/team"');
    expect(manager).toContain('href="/training/builder"');
    expect(manager).toContain('href="/training/team"');
    expect(manager).toContain('aria-current="page"');
  });

  it("lets real curriculum content own the stage without a second header", () => {
    const html = renderToStaticMarkup(<TrainingBuilderPageView aiAvailable={false} initialModules={[]} initialTeamProgress={{modules:[],repProgress:[]}} initialTeamRows={[]}><div>Curriculum workbench</div></TrainingBuilderPageView>);
    expect(html).toContain('Curriculum workbench');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Training navigation"');
  });

  it("keeps every training row actionable with completion and status on phone and desktop", () => {
    const html = renderToStaticMarkup(<TrainingTeamPageView canViewProfiles teamRows={[{repId:'synthetic-rep',firstName:'Avery',lastName:'Stone',email:'synthetic@example.test',assigned:2,passed:1,completionRate:50}]} />);
    expect(html.match(/href="\/team\/synthetic-rep"/g)).toHaveLength(2);
    expect(html).toContain('50%');
    expect(html).toContain('Needs follow-up');
    expect(html).toContain('data-training-mobile-progress="true"');
    expect(html).not.toContain('data-selected-object-drawer');
  });
  it("hides unavailable destinations while retaining the same underlying information", () => {
    const rank = renderToStaticMarkup(<LeaderboardPageView canViewProfiles={false} leaderboard={{topQuality:[entry],topVolume:[],mostImproved:[]}} />);
    expect(rank).toContain("Avery Stone");
    expect(rank).not.toContain('href="/team');
    const learner = renderToStaticMarkup(<TrainingLearnerPageView canManage canViewManagerPages={false} canViewHighlights={false} modules={[]}><div>Lesson content</div></TrainingLearnerPageView>);
    expect(learner).not.toContain('href="/highlights"');
    expect(learner).not.toContain('href="/training/team"');
    expect(learner).not.toContain('href="/training/builder"');
    const progress = renderToStaticMarkup(<TrainingTeamPageView canViewProfiles={false} teamRows={[{repId:'synthetic-rep',firstName:'Avery',lastName:'Stone',email:'synthetic@example.test',assigned:2,passed:1,completionRate:50}]} />);
    expect(progress).toContain("Avery Stone");
    expect(progress).toContain("50%");
    expect(progress).not.toContain('href="/team/');
  });

});
