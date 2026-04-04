import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  return fromServiceResult(
    await getComplianceStatus(createComplianceRepository(), authUser.id),
  );
}
