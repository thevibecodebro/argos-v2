import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeIcon, ForgeSurface } from "@/components/forge";
import { CallDetailPanel } from "@/components/page-panel-loaders";
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

  return (
    <div
      className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
      data-call-detail-shell="forge-review-bench"
    >
      <ForgeSurface className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-4">
            <nav className="flex items-center gap-2 font-[var(--font-display)] text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
              <Link className="text-[var(--forge-muted)] transition hover:text-[var(--forge-gold)]" href="/calls">
                Call Library
              </Link>
              <ForgeIcon className="text-[var(--forge-muted)]" name="chevron_right" size={16} />
              <span className="truncate">{topic}</span>
            </nav>

            <div>
              <p className="font-[var(--font-display)] text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                Review bench
              </p>
              <h1 className="mt-2 max-w-4xl truncate font-[var(--font-display)] text-3xl font-semibold tracking-[-0.02em] text-[var(--forge-text)]">
                {topic}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ForgeChip icon="query_stats" tone="cyan">
                  {call.overallScore ?? "No score"}
                </ForgeChip>
                <ForgeChip icon="history" tone="muted">
                  {call.status}
                </ForgeChip>
                <ForgeChip tone="gold">#{id}</ForgeChip>
                <ForgeChip tone="muted">
                  {profile?.fullName ?? profile?.email ?? "Unknown"} / {profile?.role ?? "member"}
                </ForgeChip>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ForgeButton href="/calls" icon="arrow_back" variant="secondary">
              Call Library
            </ForgeButton>
            <ForgeButton href="/highlights" icon="insights" variant="primary">
              Share Insight
            </ForgeButton>
          </div>
        </div>
      </ForgeSurface>

      <CallDetailPanel
        annotations={annotationsResult.ok ? annotationsResult.data.annotations : []}
        call={call}
        canManage={profile?.role === "admin" || profile?.role === "manager" || profile?.role === "executive"}
      />
    </div>
  );
}
