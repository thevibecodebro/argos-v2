import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { CallDetailPanel } from "@/components/panel-loaders/call-detail-panel-loader";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail, listAnnotations } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

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

  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const [profile, detailResult, annotationsResult] = await Promise.all([
    getCachedCurrentUserProfile(authUser.id),
    getCallDetail(repository, authUser.id, id),
    listAnnotations(repository, authUser.id, id),
  ]);

  if (!detailResult.ok) {
    notFound();
  }

  const call = detailResult.data;
  const topic = call.callTopic ?? "Untitled call";
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

        <CallDetailPanel
          annotations={annotationsResult.ok ? annotationsResult.data.annotations : []}
          call={call}
          canManage={canManage}
          canRetryProcessing={profile?.role === "admin"}
        />
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
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
