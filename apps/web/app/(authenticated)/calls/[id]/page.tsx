import Link from "next/link";
import { notFound } from "next/navigation";
import { CallDetailPanel } from "@/components/call-detail-panel";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail, listAnnotations } from "@/lib/calls/service";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getCurrentUserProfile } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const [profile, detailResult, annotationsResult] = await Promise.all([
    getCurrentUserProfile(createDashboardRepository(), authUser.id),
    getCallDetail(createCallsRepository(), authUser.id, id),
    listAnnotations(createCallsRepository(), authUser.id, id),
  ]);

  if (!detailResult.ok) {
    notFound();
  }

  return (
    <PageFrame
      actions={[
        { href: "/calls", label: "Back to Call Library" },
        { href: "/highlights", label: "Open Highlights" },
      ]}
      description="Call detail loads real scores, moments, transcript lines, and annotations instead of a placeholder summary."
      eyebrow="Review"
      title="Call Detail"
    >
      <div className="mb-5 rounded-[1.5rem] border border-slate-800/70 bg-[#0c1629] px-5 py-4 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Call ID</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="break-all text-sm font-medium text-slate-200">{id}</p>
          <Link className="text-sm font-medium text-blue-300 transition hover:text-blue-200" href="/calls">
            Return to library
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Viewer: {profile?.fullName ?? profile?.email ?? "Unknown"} · {profile?.role ?? "member"}
        </p>
      </div>
      <CallDetailPanel
        annotations={annotationsResult.ok ? annotationsResult.data.annotations : []}
        call={detailResult.data}
        canManage={profile?.role === "admin" || profile?.role === "manager" || profile?.role === "executive"}
      />
    </PageFrame>
  );
}
