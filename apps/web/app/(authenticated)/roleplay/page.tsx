import { notFound } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { RoleplayPanel } from "@/components/roleplay-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export default async function RoleplayPage() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const result = await listRoleplaySessions(createRoleplayRepository(), authUser.id);

  if (!result.ok) {
    return (
      <PageFrame
        actions={[{ href: "/training", label: "Open training" }]}
        description="Roleplay needs an app user record and organization before sessions can be created."
        eyebrow="Provisioning"
        title="Roleplay"
        tone="warning"
      >
        <section className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 p-6 text-sm leading-7 text-amber-100">
          {result.error}
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      actions={[
        { href: "/training", label: "Open training" },
        { href: "/calls", label: "Open calls" },
      ]}
      description="Roleplay supports persona selection, live transcript practice, voice mode, and deterministic scorecards."
      eyebrow="Simulation"
      title="Roleplay"
    >
      <RoleplayPanel
        initialPersonas={result.data.personas}
        initialSessions={result.data.sessions}
      />
    </PageFrame>
  );
}
