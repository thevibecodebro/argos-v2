import type { ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import {
  ForgeChip,
  ForgeIcon,
  ForgeScoreMeter,
  ForgeStatCard,
  ForgeStatusPanel,
  ForgeSurface,
  type ForgeTone,
} from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  getHomepageProductCaptureRoute,
  type HomepageProductCaptureSlug,
} from "@/lib/homepage-product-capture";

type DemoRep = {
  calls: number;
  focus: string;
  movement: number;
  name: string;
  rank: number;
  score: number;
  status: "Needs coaching" | "Stable";
};

type DemoCall = {
  duration: string;
  rep: string;
  score: number | null;
  status: "Complete" | "Evaluating" | "Failed";
  topic: string;
  uploaded: string;
};

type DemoMoment = {
  category: string;
  note: string;
  observation: string;
  recommendation: string;
  severity: ForgeTone;
  timestamp: string;
};

const demoReps: DemoRep[] = [
  { calls: 8, focus: "Price pushback", movement: -8, name: "Avery Brooks", rank: 1, score: 91, status: "Stable" },
  { calls: 6, focus: "Discovery depth", movement: 6, name: "Maya Chen", rank: 2, score: 84, status: "Stable" },
  { calls: 5, focus: "Next step clarity", movement: -11, name: "Chris Patel", rank: 3, score: 67, status: "Needs coaching" },
  { calls: 4, focus: "Objection control", movement: -9, name: "Nina Ross", rank: 4, score: 62, status: "Needs coaching" },
  { calls: 3, focus: "Proof before price", movement: 4, name: "Jordan Lee", rank: 5, score: 78, status: "Stable" },
];

const demoCalls: DemoCall[] = [
  { duration: "32:18", rep: "Avery Brooks", score: 91, status: "Complete", topic: "Northstar renewal review", uploaded: "Jun 14, 2026" },
  { duration: "28:04", rep: "Maya Chen", score: 84, status: "Complete", topic: "Beacon discovery call", uploaded: "Jun 13, 2026" },
  { duration: "35:42", rep: "Chris Patel", score: 67, status: "Complete", topic: "Atlas pricing pushback", uploaded: "Jun 12, 2026" },
  { duration: "22:16", rep: "Nina Ross", score: 62, status: "Complete", topic: "Cobalt next-step miss", uploaded: "Jun 11, 2026" },
  { duration: "18:39", rep: "Avery Brooks", score: 88, status: "Complete", topic: "Summit close plan", uploaded: "Jun 10, 2026" },
  { duration: "12:07", rep: "Maya Chen", score: null, status: "Evaluating", topic: "Riverline intake", uploaded: "Jun 9, 2026" },
];

const demoMoments: DemoMoment[] = [
  {
    category: "Objection",
    note: "Practice this before Chris' next call.",
    observation: "The buyer raised budget risk and the rep moved to discounting before confirming impact.",
    recommendation: "Acknowledge the constraint, restate the business cost, then offer phased rollout.",
    severity: "ember",
    timestamp: "12:44",
  },
  {
    category: "Discovery",
    note: "Strong question sequence. Use as a team example.",
    observation: "Maya slowed the call down and asked what changed in the buying committee.",
    recommendation: "Keep this question in the opening discovery block.",
    severity: "success",
    timestamp: "04:18",
  },
  {
    category: "Next step",
    note: "Manager follow-up required.",
    observation: "The rep ended with a soft follow-up instead of a dated mutual action.",
    recommendation: "Lock calendar, owner, and success criteria before ending the call.",
    severity: "danger",
    timestamp: "27:09",
  },
  {
    category: "Proof",
    note: "Attach to proof-before-price module.",
    observation: "The rep named a proof point after price came up, not before.",
    recommendation: "Lead with outcome proof earlier in the solution stage.",
    severity: "cyan",
    timestamp: "19:31",
  },
];

const trainingModules = [
  { due: "Jun 19", progress: "In progress", score: "68%", title: "Price pushback without discounting" },
  { due: "Jun 21", progress: "Assigned", score: "Pending", title: "Discovery depth: committee change" },
  { due: "Jun 24", progress: "Passed", score: "92%", title: "Next step clarity" },
];

const roleplayTurns = [
  { role: "Buyer", text: "I like the idea, but this feels expensive for a team our size." },
  { role: "Rep", text: "That makes sense. Before we talk price, can I confirm what the missed follow-up problem is costing right now?" },
  { role: "Buyer", text: "The main issue is inconsistent rep behavior after coaching sessions." },
  { role: "Rep", text: "Then the rollout should start with the team standard, not another tool checklist." },
  { role: "Buyer", text: "Okay, show me how we would prove that changed in the first month." },
];

export function HomepageProductCapture({
  slug,
}: {
  slug: HomepageProductCaptureSlug;
}) {
  const route = getHomepageProductCaptureRoute(slug);

  if (!route) {
    return null;
  }

  return (
    <main
      className="flex min-h-screen items-stretch justify-stretch overflow-hidden bg-[radial-gradient(circle_at_82%_12%,rgba(241,191,123,0.12),transparent_30rem),#050403] text-[var(--forge-text)]"
      data-homepage-product-capture-root="true"
    >
      <section
        aria-label={`Argos ${route.label} product capture`}
        className="relative h-screen w-screen overflow-hidden bg-[rgba(12,11,10,0.96)] p-6"
        data-homepage-product-capture={slug}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(241,191,123,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(241,191,123,0.04)_1px,transparent_1px)] bg-[size:34px_34px] opacity-70" />
        <div className="relative z-10 h-full">
          {renderCaptureView(slug)}
        </div>
      </section>
    </main>
  );
}

function renderCaptureView(slug: HomepageProductCaptureSlug) {
  switch (slug) {
    case "dashboard":
      return <DashboardCapture />;
    case "calls":
      return <CallsCapture />;
    case "scorecard":
      return <ScorecardCapture />;
    case "highlights":
      return <HighlightsCapture />;
    case "training":
      return <TrainingCapture />;
    case "roleplay":
      return <RoleplayCapture />;
    case "team":
      return <TeamCapture />;
    case "leaderboard":
      return <LeaderboardCapture />;
  }
}

function DashboardCapture() {
  const queue = [
    { action: "Open profile", label: "Chris Patel", signal: "67 score", status: "Needs coaching", type: "Rep coaching" },
    { action: "Assign training", label: "Nina Ross", signal: "2 flagged moments", status: "Attention", type: "Team coaching" },
    { action: "Open call", label: "Atlas pricing pushback", signal: "3 moments", status: "Review", type: "Call review" },
    { action: "Open roleplay", label: "Roleplay not completed", signal: "0 sessions", status: "Practice", type: "Roleplay" },
    { action: "Open training", label: "Training below target", signal: "71% complete", status: "Watch", type: "Training" },
  ];

  return (
    <CaptureWorkspace
      description="Start with the items that need attention, then move into the right workspace."
      status="Manager view"
      title="Dashboard"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TablePanel
          badge="5 items"
          columns={["Work item", "Signal", "Status", "Action"]}
          eyebrow="Needs attention"
          rows={queue.map((item, index) => [
            <WorkItem icon={index < 2 ? "warning" : "target"} key="work" label={item.label} sublabel={item.type} tone={index < 2 ? "ember" : "gold"} />,
            <strong key="signal">{item.signal}</strong>,
            <ForgeChip key="status" tone={index < 2 ? "ember" : "gold"}>{item.status}</ForgeChip>,
            <span className="font-semibold text-[var(--forge-gold)]" key="action">{item.action}</span>,
          ])}
        />
        <OperationalPreviewDrawer
          actions={[{ href: "#", icon: "person", label: "Open profile", variant: "primary" }]}
          description="Chris is flagged because pricing objections are pulling the call away from the standard."
          eyebrow="Selected item"
          title="Chris Patel"
        >
          <DetailRows
            rows={[
              ["Type", "Rep coaching"],
              ["Signal", "67 score"],
              ["Status", "Needs coaching"],
              ["Next move", "Assign price pushback"],
            ]}
          />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function CallsCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Upload call"
      description="Find and review scored calls."
      status="6 records"
      title="Calls"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="mb-3 rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.58)] p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-xs font-semibold">
                {["All calls", "Needs review", "Low score", "High score", "Processing"].map((view, index) => (
                  <span
                    className={cn(
                      "rounded-md px-2.5 py-1.5",
                      index === 0
                        ? "bg-[rgba(216,170,104,0.13)] text-[var(--forge-gold)]"
                        : "text-[var(--forge-muted)]",
                    )}
                    key={view}
                  >
                    {view}
                  </span>
                ))}
              </div>
              <span className="text-xs font-medium text-[var(--forge-muted)]">6 records</span>
            </div>
          </div>
          <TablePanel
            columns={["Call", "Rep", "Score", "Status", "Uploaded"]}
            rows={demoCalls.map((call) => [
              <WorkItem icon="subject" key="call" label={call.topic} sublabel={call.duration} tone={call.status === "Evaluating" ? "cyan" : "gold"} />,
              call.rep,
              <ForgeScoreMeter key="score" label={`${call.topic} score`} showValue value={call.score} />,
              <ForgeChip key="status" tone={call.status === "Complete" ? "success" : call.status === "Evaluating" ? "cyan" : "danger"}>{call.status}</ForgeChip>,
              call.uploaded,
            ])}
          />
        </section>
        <OperationalPreviewDrawer
          actions={[{ href: "#", icon: "open_in_new", label: "Open detail", variant: "primary" }]}
          description="Selected row summary."
          eyebrow="Selected call"
          title="Northstar renewal review"
        >
          <DetailRows rows={[["Score", "91"], ["Rep", "Avery Brooks"], ["Duration", "32:18"], ["Status", "Complete"]]} />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function ScorecardCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Open highlights"
      description="Access scoped to manager permissions."
      status="complete"
      title="Atlas pricing pushback"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-3">
          <ForgeSurface className="overflow-hidden p-0" variant="inset">
            <PanelHead badge="6 lines" subtitle="Speaker turns and timestamps from this call." title="Transcript" />
            <div className="divide-y divide-[var(--forge-border)]">
              {[
                ["Buyer", "10:12", "We need this to be less expensive if we are going to roll it out this quarter."],
                ["Chris", "10:31", "I understand. We can probably get creative on price if that is the blocker."],
                ["Buyer", "10:52", "The bigger blocker is proving the team will actually use it."],
              ].map(([speaker, time, text]) => (
                <TranscriptLine key={`${speaker}-${time}`} speaker={speaker} text={text} time={time} />
              ))}
            </div>
          </ForgeSurface>
          <ForgeSurface className="overflow-hidden p-0" variant="inset">
            <PanelHead badge="3 moments" subtitle="Coaching moments, highlights, strengths, and improvement areas." title="Evidence" />
            <div className="grid gap-3 p-4">
              {demoMoments.slice(0, 3).map((moment) => (
                <MomentCard key={moment.timestamp} moment={moment} />
              ))}
            </div>
          </ForgeSurface>
        </section>
        <OperationalPreviewDrawer
          actions={[{ href: "#", icon: "record_voice_over", label: "Generate Roleplay", variant: "primary" }]}
          description="Review readiness, create practice, and leave one coaching note."
          eyebrow="Coaching action"
          title="Practice from this call"
        >
          <ForgeStatusPanel
            className="px-3 py-4"
            description="Recording and transcript data are linked."
            icon="graphic_eq"
            title="Review data ready"
            tone="success"
          />
          <DetailRows rows={[["Overall score", "67"], ["Weakest category", "Objection"], ["Recommended drill", "Price pushback"]]} />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function HighlightsCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Back to call library"
      description="Review saved coaching moments and recommendations."
      status="4 items"
      title="Highlights"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TablePanel
          badge="4 items"
          columns={["Type", "Observation", "Recommendation", "Source"]}
          eyebrow="Saved moments"
          rows={demoMoments.map((moment, index) => [
            <ForgeChip key="type" tone={index === 0 ? "gold" : moment.severity}>{moment.category}</ForgeChip>,
            <span className="font-semibold text-[var(--forge-text)]" key="observation">{moment.observation}</span>,
            moment.recommendation,
            index === 0 ? "Atlas pricing pushback" : "Beacon discovery call",
          ])}
        />
        <OperationalPreviewDrawer
          actions={[{ href: "#", label: "Open call", variant: "primary" }]}
          description="Acknowledge the constraint, restate the business cost, then offer phased rollout."
          eyebrow="Selected evidence"
          title="Objection"
        >
          <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.66)] p-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">Observation</p>
            <p className="mt-2 text-sm leading-5 text-[var(--forge-text)]">{demoMoments[0].observation}</p>
          </div>
          <div className="rounded-lg border border-[rgba(255,159,95,0.24)] bg-[rgba(255,159,95,0.06)] p-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-ember)]">Manager note</p>
            <p className="mt-2 text-sm leading-5 text-[var(--forge-text)]">{demoMoments[0].note}</p>
          </div>
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function TrainingCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Team progress"
      description="Review assigned modules and complete the next lesson."
      status="My training"
      title="Training"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ForgeSurface className="p-4" variant="panel">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--forge-muted)]">Assigned modules</p>
          <div className="mt-4 grid gap-3">
            {trainingModules.map((module, index) => (
              <button
                className={cn(
                  "rounded-xl border px-4 py-3 text-left",
                  index === 0
                    ? "border-[rgba(241,191,123,0.38)] bg-[rgba(241,191,123,0.08)]"
                    : "border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)]",
                )}
                key={module.title}
                type="button"
              >
                <p className="text-sm font-semibold text-[var(--forge-text)]">{module.title}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--forge-muted)]">
                  <span>Due {module.due}</span>
                  <span>{module.progress}</span>
                </div>
              </button>
            ))}
          </div>
        </ForgeSurface>
        <ForgeSurface className="p-6" variant="panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--forge-gold)]">Course player</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--forge-text)]">Price pushback without discounting</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--forge-muted)]">
                Practice the sequence for acknowledging budget pressure, returning to business cost, and creating a phased next step.
              </p>
            </div>
            <ForgeChip tone="ember">In progress</ForgeChip>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <ForgeStatCard label="Status" tone="gold" value="In progress" valueSize="compact" />
            <ForgeStatCard label="Due date" tone="muted" value="Jun 19" valueSize="compact" />
            <ForgeStatCard label="Last score" tone="ember" value="68%" valueSize="compact" />
          </div>
          <div className="mt-6 rounded-[1.25rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-5">
            <p className="text-sm font-semibold text-[var(--forge-text)]">Checkpoint question</p>
            <p className="mt-3 text-sm text-[var(--forge-muted)]">
              When a buyer says the rollout is too expensive, what should the rep confirm before discussing price?
            </p>
            <div className="mt-4 grid gap-2">
              {["The discount ceiling", "The cost of the current behavior", "The buyer's preferred contract length"].map((answer, index) => (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    index === 1
                      ? "border-[rgba(241,191,123,0.34)] bg-[rgba(241,191,123,0.08)] text-[var(--forge-gold)]"
                      : "border-[var(--forge-border)] text-[var(--forge-muted)]",
                  )}
                  key={answer}
                >
                  {answer}
                </div>
              ))}
            </div>
          </div>
        </ForgeSurface>
      </div>
    </CaptureWorkspace>
  );
}

function RoleplayCapture() {
  return (
    <CaptureWorkspace
      actionLabel="History"
      description="Practice sales conversations from call evidence and coaching scenarios."
      status="3 personas"
      title="Roleplay"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-3">
          <ForgeSurface className="p-4" variant="inset">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--forge-gold)]">Generated from call</p>
                <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">Price pushback simulation</h2>
                <p className="mt-1 text-sm text-[var(--forge-muted)]">Focus: Objection handling from Atlas pricing pushback.</p>
              </div>
              <ForgeChip tone="gold">Active</ForgeChip>
            </div>
          </ForgeSurface>
          <div className="min-h-[430px] rounded-lg border border-[var(--forge-border)] bg-[rgba(12,11,10,0.52)] p-4">
            <div className="grid gap-3">
              {roleplayTurns.map((turn, index) => (
                <div
                  className={cn("flex gap-3", turn.role === "Rep" ? "justify-end" : "justify-start")}
                  key={`${turn.role}-${index}`}
                >
                  <div
                    className={cn(
                      "max-w-[72%] rounded-2xl border p-4 text-sm leading-6",
                      turn.role === "Rep"
                        ? "rounded-tr-none border-[rgba(241,191,123,0.24)] bg-[rgba(241,191,123,0.09)] text-[var(--forge-text)]"
                        : "rounded-tl-none border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] text-[var(--forge-muted)]",
                    )}
                  >
                    <p>{turn.text}</p>
                    <p className="mt-2 text-xs font-semibold text-[var(--forge-gold)]">{turn.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <OperationalPreviewDrawer
          description="Current scoring, readiness, and post-session guidance."
          eyebrow="Simulation score"
          title="Session Scorecard"
        >
          <ForgeStatCard description="Rep acknowledged the price concern and returned to business impact before offering the next step." label="Overall score" tone="gold" value="78" />
          <div className="grid grid-cols-2 gap-3">
            <ForgeStatCard label="Confidence" tone="muted" value="Medium" valueSize="compact" />
            <ForgeStatCard label="Stage" tone="gold" value="Objection" valueSize="compact" />
          </div>
          <DetailRows rows={[["Discovery", "82"], ["Objection", "71"], ["Closing", "76"], ["Next drill", "Phase rollout"]]} />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function TeamCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Open leaderboard"
      description="Review team performance, coaching focus, and rep-level score movement."
      status="5 active reps"
      title="Team"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TablePanel
          badge="2 need review"
          columns={["Rep", "Score", "Calls", "Trend", "Status"]}
          eyebrow="Rep roster"
          rows={demoReps.slice(0, 4).map((rep) => [
            <WorkItem icon="person" key="rep" label={rep.name} sublabel={rep.focus} tone={rep.status === "Needs coaching" ? "ember" : "gold"} />,
            <strong className={scoreTextClass(rep.score)} key="score">{rep.score}</strong>,
            rep.calls,
            <span className={rep.movement < 0 ? "text-[var(--forge-ember)]" : "text-[var(--forge-success)]"} key="movement">{formatDelta(rep.movement)}</span>,
            <ForgeChip key="status" tone={rep.status === "Needs coaching" ? "ember" : "muted"}>{rep.status}</ForgeChip>,
          ])}
        />
        <OperationalPreviewDrawer
          actions={[{ href: "#", label: "Assign training", variant: "primary" }]}
          description="This rep is flagged for coaching. Review recent calls before assigning training."
          eyebrow="Selected rep"
          title="Chris Patel"
        >
          <DetailRows rows={[["Average score", "67"], ["Calls reviewed", "5"], ["Week movement", "-11"], ["Coaching focus", "Next step clarity"]]} />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function LeaderboardCapture() {
  return (
    <CaptureWorkspace
      actionLabel="Open team view"
      description="Compare rank, score quality, call volume, and improvement across your team."
      status="5 ranked reps"
      title="Leaderboard"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TablePanel
          columns={["Rank", "Rep", "Score", "Calls", "Movement", "Focus area"]}
          rows={demoReps.map((rep) => [
            <span className="font-semibold text-[var(--forge-gold)]" key="rank">#{rep.rank}</span>,
            <WorkItem icon="leaderboard" key="rep" label={rep.name} sublabel="Team profile" tone="gold" />,
            <strong className={scoreTextClass(rep.score)} key="score">{rep.score}</strong>,
            rep.calls,
            <span className={rep.movement < 0 ? "text-[var(--forge-ember)]" : "text-[var(--forge-success)]"} key="movement">{formatDelta(rep.movement)}</span>,
            <ForgeChip key="focus" tone={rep.score < 70 ? "ember" : "muted"}>{rep.score < 70 ? "Needs review" : "Maintain quality"}</ForgeChip>,
          ])}
        />
        <OperationalPreviewDrawer
          actions={[{ href: "#", label: "Open profile", variant: "primary" }]}
          description="Rank is based on quality, call activity, and improvement signals for the selected period."
          eyebrow="Rep insight"
          title="Avery Brooks"
        >
          <DetailRows rows={[["Quality score", "91"], ["Call volume", "8"], ["Improvement", "+4"], ["Coaching action", "Maintain pace"]]} />
        </OperationalPreviewDrawer>
      </div>
    </CaptureWorkspace>
  );
}

function CaptureWorkspace({
  actionLabel = "Open workspace",
  children,
  description,
  status,
  title,
}: {
  actionLabel?: string;
  children: ReactNode;
  description: string;
  status: string;
  title: string;
}) {
  return (
    <OperationalWorkspace className="h-full">
      <OperationalToolbar
        actions={[{ href: "#", icon: "arrow_forward", label: actionLabel, variant: "secondary" }]}
        description={description}
        eyebrow="Argos demo preview"
        status={{ icon: "dashboard", label: status, tone: "muted" }}
        title={title}
      />
      {children}
    </OperationalWorkspace>
  );
}

function TablePanel({
  badge,
  columns,
  eyebrow,
  rows,
}: {
  badge?: string;
  columns: string[];
  eyebrow?: string;
  rows: ReactNode[][];
}) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.88)] shadow-[inset_0_1px_0_rgba(255,244,230,0.04)]"
      data-forge-table="true"
    >
      {eyebrow || badge ? (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] px-4 py-3">
          <div>
            {eyebrow ? (
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                {eyebrow}
              </p>
            ) : null}
          </div>
          {badge ? <ForgeChip tone="gold">{badge}</ForgeChip> : null}
        </div>
      ) : null}
      <div className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
              {columns.map((column) => (
                <th className="px-4 py-3" key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--forge-border)]">
            {rows.map((cells, rowIndex) => (
              <tr className="transition hover:bg-[rgba(241,191,123,0.045)]" key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td
                    className={cn(
                      "px-4 py-3 align-middle text-sm text-[var(--forge-muted)]",
                      cellIndex === 0 ? "text-[var(--forge-text)]" : null,
                    )}
                    key={cellIndex}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkItem({
  icon,
  label,
  sublabel,
  tone,
}: {
  icon: string;
  label: string;
  sublabel: string;
  tone: ForgeTone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", iconToneClass(tone))}>
        <ForgeIcon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{label}</p>
        <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{sublabel}</p>
      </div>
    </div>
  );
}

function DetailRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0" key={label}>
          <span className="text-[var(--forge-muted)]">{label}</span>
          <span className="text-right font-semibold text-[var(--forge-text)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function PanelHead({
  badge,
  subtitle,
  title,
}: {
  badge: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--forge-text)]">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">{subtitle}</p>
      </div>
      <ForgeChip tone="muted">{badge}</ForgeChip>
    </div>
  );
}

function TranscriptLine({
  speaker,
  text,
  time,
}: {
  speaker: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-xs font-semibold text-[var(--forge-cyan)]">
        {speaker.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--forge-text)]">{speaker}</span>
          <span className="text-xs text-[var(--forge-muted)]">{time}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">{text}</p>
      </div>
    </div>
  );
}

function MomentCard({ moment }: { moment: DemoMoment }) {
  return (
    <ForgeSurface className="p-4" variant="inset">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ForgeChip icon="history" tone="gold">{moment.timestamp}</ForgeChip>
        <ForgeChip tone={moment.severity}>{moment.category}</ForgeChip>
      </div>
      <p className="text-sm font-medium leading-relaxed text-[var(--forge-text)]">{moment.observation}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--forge-muted)]">{moment.recommendation}</p>
    </ForgeSurface>
  );
}

function iconToneClass(tone: ForgeTone) {
  if (tone === "success") return "border-[rgba(139,215,168,0.24)] bg-[rgba(139,215,168,0.08)] text-[var(--forge-success)]";
  if (tone === "danger") return "border-[rgba(255,113,108,0.26)] bg-[rgba(255,113,108,0.08)] text-[var(--forge-danger)]";
  if (tone === "ember") return "border-[rgba(255,159,95,0.24)] bg-[rgba(255,159,95,0.07)] text-[var(--forge-ember)]";
  if (tone === "cyan") return "border-[rgba(136,218,247,0.24)] bg-[rgba(136,218,247,0.07)] text-[var(--forge-cyan)]";
  return "border-[rgba(241,191,123,0.24)] bg-[rgba(241,191,123,0.08)] text-[var(--forge-gold)]";
}

function scoreTextClass(value: number) {
  if (value >= 85) return "text-[var(--forge-success)]";
  if (value >= 70) return "text-[var(--forge-gold)]";
  if (value >= 60) return "text-[var(--forge-ember)]";
  return "text-[var(--forge-danger)]";
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
