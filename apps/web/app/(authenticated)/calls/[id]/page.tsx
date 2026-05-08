import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { CallDetailPanel } from "@/components/panel-loaders/call-detail-panel-loader";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail, listAnnotations } from "@/lib/calls/service";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const [profile, detailResult, annotationsResult] = await Promise.all([
    getCachedCurrentUserProfile(authUser.id),
    getCallDetail(createCallsRepository(), authUser.id, id),
    listAnnotations(createCallsRepository(), authUser.id, id),
  ]);

  if (!detailResult.ok) {
    notFound();
  }

  const call = detailResult.data;
  const topic = call.callTopic ?? "Untitled call";
  const repName = formatRepName(call);
  const canManage =
    profile?.role === "admin" ||
    profile?.role === "manager" ||
    profile?.role === "executive";

  return (
    <AuthenticatedPageContainer
      data-call-detail-shell="forge-review-bench"
      size="wide"
    >
      <OperationalWorkspace data-call-detail-route="review-bench">
        <OperationalToolbar
          actions={[
            { href: "/calls", icon: "arrow_back", label: "Call Library", variant: "secondary" },
            { href: "/highlights", icon: "insights", label: "Open Highlights", variant: "primary" },
          ]}
          description={`Access scoped to ${profile?.role ?? "member"} permissions.`}
          eyebrow="Call detail"
          status={{ icon: "query_stats", label: call.status, tone: statusTone(call.status) }}
          title={topic}
        >
          <nav className="flex min-w-0 items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            <Link className="transition hover:text-[var(--forge-gold)]" href="/calls">
              Call Library
            </Link>
            <span>/</span>
            <span className="truncate text-[var(--forge-gold)]">{topic}</span>
          </nav>
        </OperationalToolbar>

        <OperationalMetricStrip
          metrics={[
            {
              icon: "person",
              label: "Rep",
              tone: "muted",
              value: repName,
            },
            {
              icon: "timer",
              label: "Duration",
              tone: "cyan",
              value: formatDuration(call.durationSeconds),
            },
            {
              icon: "monitoring",
              label: "Overall score",
              tone: scoreTone(call.overallScore),
              value: call.overallScore ?? "--",
            },
            {
              icon: "fact_check",
              label: "Analysis status",
              tone: statusTone(call.status),
              value: call.status,
            },
          ]}
        />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <CallDetailPanel
              annotations={annotationsResult.ok ? annotationsResult.data.annotations : []}
              call={call}
              canManage={canManage}
            />
          </div>
          <OperationalPreviewDrawer
            actions={[{ href: "/highlights", icon: "insights", label: "Open Highlights", variant: "secondary" }]}
            description="Score, status, and review readiness for this call."
            eyebrow="Insight drawer"
            title="Call summary"
          >
            <div className="grid gap-2 text-sm">
              <SummaryRow label="Score" value={call.overallScore ?? "--"} />
              <SummaryRow label="Status" value={call.status} />
              <SummaryRow label="Duration" value={formatDuration(call.durationSeconds)} />
              <SummaryRow label="Can manage" value={canManage ? "Yes" : "No"} />
            </div>
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function formatRepName(call: { repFirstName?: string | null; repLastName?: string | null }) {
  return [call.repFirstName, call.repLastName].filter(Boolean).join(" ") || "Scoped viewer";
}

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number") return "--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function scoreTone(value: number | null | undefined) {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "danger";
}

function statusTone(status: string | null | undefined) {
  const normalized = status?.toLowerCase();
  if (normalized === "complete") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "processing" || normalized === "transcribing" || normalized === "evaluating") {
    return "ember";
  }
  return "muted";
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
