import { notFound } from "next/navigation";
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
      <div className="flex-1 p-8">
        <div className="mx-auto w-full max-w-7xl">
          <section className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm leading-7 text-amber-100">
            <p className="font-bold text-amber-300">Roleplay unavailable</p>
            <p className="mt-1">{result.error}</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto w-full max-w-7xl space-y-12">
        <RoleplayPanel
          initialPersonas={result.data.personas}
          initialSessions={result.data.sessions}
        />
      </div>
    </div>
  );
}
