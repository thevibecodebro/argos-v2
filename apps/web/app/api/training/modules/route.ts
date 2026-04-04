import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingModules } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await getTrainingModules(createTrainingRepository(), authUser.id);
  return fromServiceResult(result);
}
