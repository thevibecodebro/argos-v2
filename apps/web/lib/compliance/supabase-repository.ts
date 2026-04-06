import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type { ComplianceRepository } from "./service";

export class SupabaseComplianceRepository implements ComplianceRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async createConsentRecord(input: {
    acknowledgedBy: string;
    eventType: string;
    ipAddress: string;
    metadata?: Record<string, unknown> | null;
    orgId: string;
    tosVersion: string;
    userAgent: string;
  }) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("org_compliance")
      .insert({
        org_id: input.orgId,
        acknowledged_by: input.acknowledgedBy,
        event_type: input.eventType,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        tos_version: input.tosVersion,
        metadata: input.metadata ?? null,
      })
      .select("acknowledged_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      acknowledgedAt: toDate(data.acknowledged_at) ?? new Date(),
    };
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const user = await findUserWithOrgByAuthId(authUserId, this.supabase);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      org: user.org
        ? {
            id: user.org.id,
            name: user.org.name,
            slug: user.org.slug,
            plan: user.org.plan,
          }
        : null,
    };
  }

  async findLatestConsentByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("org_compliance")
      .select("acknowledged_at")
      .eq("org_id", orgId)
      .order("acknowledged_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          acknowledgedAt: toDate(data.acknowledged_at) ?? new Date(0),
        }
      : null;
  }
}
