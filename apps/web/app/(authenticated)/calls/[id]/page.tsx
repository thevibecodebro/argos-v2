import Link from "next/link";
import { notFound } from "next/navigation";
import { CallDetailPanel } from "@/components/call-detail-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail, getCallHighlightManagementAccess, listAnnotations } from "@/lib/calls/service";
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

  const callsRepository = createCallsRepository();

  const [profile, detailResult, annotationsResult, highlightManagementResult] = await Promise.all([
    getCurrentUserProfile(createDashboardRepository(), authUser.id),
    getCallDetail(callsRepository, authUser.id, id),
    listAnnotations(callsRepository, authUser.id, id),
    getCallHighlightManagementAccess(callsRepository, authUser.id, id),
  ]);

  if (!detailResult.ok) {
    notFound();
  }

  const call = detailResult.data;
  const topic = call.callTopic ?? "Untitled call";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#74b1ff]">
            <Link className="opacity-60 transition hover:opacity-100" href="/calls">
              Call Library
            </Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="truncate">{topic}</span>
          </nav>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Call Detail
              <span className="ml-4 break-all text-2xl font-light text-[#74b1ff]/40">#{id}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Viewer: {profile?.fullName ?? profile?.email ?? "Unknown"} · {profile?.role ?? "member"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
            href="/calls"
          >
            Back to library
          </Link>
          <Link
            className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-3 text-sm font-extrabold text-[#002345] shadow-[0_0_20px_rgba(116,177,255,0.15)] transition hover:opacity-90"
            href="/highlights"
          >
            Share Insight
          </Link>
        </div>
      </div>

      <CallDetailPanel
        annotations={annotationsResult.ok ? annotationsResult.data.annotations : []}
        call={call}
        canManage={highlightManagementResult.ok ? highlightManagementResult.data.canManage : false}
      />
    </div>
  );
}
