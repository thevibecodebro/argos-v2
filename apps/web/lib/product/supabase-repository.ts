import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { parseAppUserRole } from "@/lib/users/roles";
import type { ProductRepository } from "./service";

type UserRow = Pick<
  Tables<"users">,
  "id" | "email" | "role" | "first_name" | "last_name" | "org_id"
>;
type OrganizationRow = Pick<Tables<"organizations">, "id" | "name" | "slug" | "plan">;
type CallRow = Pick<
  Tables<"calls">,
  "id" | "rep_id" | "call_topic" | "created_at" | "overall_score" | "status"
>;

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly supabasePromise = createSupabaseServerClient()) {}

  private async getSupabase() {
    return this.supabasePromise;
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, org_id")
      .eq("id", authUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const user = data as UserRow | null;

    if (!user) {
      return null;
    }

    let org = null;
    if (user.org_id) {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, plan")
        .eq("id", user.org_id)
        .maybeSingle();

      if (orgError) {
        throw new Error(orgError.message);
      }

      org = (orgData as OrganizationRow | null) ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      role: parseAppUserRole(user.role),
      firstName: user.first_name,
      lastName: user.last_name,
      org,
    };
  }

  async findCallsByOrgId(orgId: string, limit: number) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("calls")
      .select("id, rep_id, call_topic, created_at, overall_score, status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const calls = (data ?? []) as CallRow[];
    const repIds = Array.from(new Set(calls.map((call) => call.rep_id)));
    const repNames = await this.getRepNameMap(repIds);

    return calls.map((call) => ({
      id: call.id,
      repId: call.rep_id,
      repName: repNames.get(call.rep_id) ?? "Unknown rep",
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      status: call.status,
    }));
  }

  async findCallsByRepId(repId: string, limit: number) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("calls")
      .select("id, rep_id, call_topic, created_at, overall_score, status")
      .eq("rep_id", repId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const calls = (data ?? []) as CallRow[];
    const repNames = await this.getRepNameMap([repId]);

    return calls.map((call) => ({
      id: call.id,
      repId: call.rep_id,
      repName: repNames.get(call.rep_id) ?? "Unknown rep",
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      status: call.status,
    }));
  }

  async findUsersByOrgId(orgId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, org_id")
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    const users = (data ?? []) as UserRow[];
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, plan")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError) {
      throw new Error(orgError.message);
    }

    const org = (orgData as OrganizationRow | null) ?? null;

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: parseAppUserRole(user.role),
      firstName: user.first_name,
      lastName: user.last_name,
      org,
    }));
  }

  private async getRepNameMap(repIds: string[]) {
    if (!repIds.length) {
      return new Map<string, string>();
    }

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name")
      .in("id", repIds);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<
      Pick<Tables<"users">, "id" | "email" | "first_name" | "last_name">
    >;

    return new Map(
      rows.map((row) => [
        row.id,
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email,
      ]),
    );
  }
}
