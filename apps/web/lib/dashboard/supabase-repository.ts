import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { parseAppUserRole } from "@/lib/users/roles";
import type { DashboardRepository } from "./service";

type DashboardUserRow = Pick<
  Tables<"users">,
  "id" | "email" | "role" | "first_name" | "last_name" | "org_id"
>;
type OrganizationRow = Pick<Tables<"organizations">, "id" | "name" | "slug" | "plan">;
type DashboardCallRow = Pick<
  Tables<"calls">,
  "id" | "call_topic" | "created_at" | "overall_score" | "status"
>;

export class SupabaseDashboardRepository implements DashboardRepository {
  constructor(
    private readonly supabasePromise = createSupabaseServerClient(),
  ) {}

  private async getSupabase() {
    return this.supabasePromise;
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const supabase = await this.getSupabase();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, org_id")
      .eq("id", authUserId)
      .maybeSingle();

    if (userError) {
      throw new Error(userError.message);
    }

    const dashboardUser = user as DashboardUserRow | null;

    if (!dashboardUser) {
      return null;
    }

    let org = null;

    if (dashboardUser.org_id) {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, plan")
        .eq("id", dashboardUser.org_id)
        .maybeSingle();

      if (orgError) {
        throw new Error(orgError.message);
      }

      org = orgData as OrganizationRow | null;
    }

    return {
      id: dashboardUser.id,
      email: dashboardUser.email,
      role: parseAppUserRole(dashboardUser.role),
      firstName: dashboardUser.first_name,
      lastName: dashboardUser.last_name,
      org,
    };
  }

  async findRecentCallsByRepId(repId: string, limit: number) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("calls")
      .select("id, call_topic, created_at, overall_score, status")
      .eq("rep_id", repId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const calls = (data ?? []) as DashboardCallRow[];

    return calls.map((call) => ({
      id: call.id,
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      status: call.status,
    }));
  }

  async findScoredCallsByRepIdSince(repId: string, since: Date) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("calls")
      .select("id, call_topic, created_at, overall_score, status")
      .eq("rep_id", repId)
      .eq("status", "complete")
      .gte("created_at", since.toISOString())
      .not("overall_score", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const calls = (data ?? []) as DashboardCallRow[];

    return calls.map((call) => ({
      id: call.id,
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      status: call.status,
    }));
  }
}
