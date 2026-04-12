import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type { IntegrationsRepository } from "./service";

export class SupabaseIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async deleteGhlIntegration(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("ghl_integrations")
      .delete()
      .eq("org_id", orgId)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.length);
  }

  async deleteZoomIntegration(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .delete()
      .eq("org_id", orgId)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.length);
  }

  async upsertGhlIntegration(input: {
    accessToken: string;
    locationId: string;
    locationName: string | null;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }) {
    const supabase: any = this.supabase;
    const { error } = await supabase.from("ghl_integrations").upsert(
      {
        org_id: input.orgId,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        location_id: input.locationId,
        location_name: input.locationName,
        token_expires_at: input.tokenExpiresAt.toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async upsertZoomIntegration(input: {
    accessToken: string;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    webhookId?: string | null;
    webhookToken?: string | null;
    zoomAccountId: string | null;
    zoomUserId: string | null;
  }) {
    const supabase: any = this.supabase;
    const { error } = await supabase.from("zoom_integrations").upsert(
      {
        org_id: input.orgId,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        token_expires_at: input.tokenExpiresAt.toISOString(),
        webhook_id: input.webhookId ?? null,
        webhook_token: input.webhookToken ?? null,
        zoom_account_id: input.zoomAccountId,
        zoom_user_id: input.zoomUserId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async findZoomIntegrationForDisconnect(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .select("access_token, refresh_token, token_expires_at, webhook_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      tokenExpiresAt: new Date(data.token_expires_at as string),
      webhookId: (data.webhook_id as string | null) ?? null,
    };
  }

  async updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("zoom_integrations")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }
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

  async findGhlStatus(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("ghl_integrations")
      .select("connected_at, location_id, location_name")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return {
      connected: Boolean(data),
      connectedAt: toDate(data?.connected_at),
      locationId: data?.location_id ?? null,
      locationName: data?.location_name ?? null,
    };
  }

  async findZoomStatus(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .select("connected_at, zoom_user_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return {
      connected: Boolean(data),
      connectedAt: toDate(data?.connected_at),
      zoomUserId: data?.zoom_user_id ?? null,
    };
  }
}
