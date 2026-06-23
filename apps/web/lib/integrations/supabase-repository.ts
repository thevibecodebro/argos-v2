import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type { IntegrationsRepository } from "./service";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  encryptNullableIntegrationToken,
} from "./token-encryption";

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

  async deleteZoomIntegration(orgId: string, connectedUserId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .delete()
      .eq("org_id", orgId)
      .eq("connected_user_id", connectedUserId)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.length);
  }

  async acknowledgeGhlRecordingConsent(orgId: string, userId: string) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("ghl_integrations")
      .update({
        consent_confirmed_at: new Date().toISOString(),
        consent_confirmed_by: userId,
        sync_enabled: true,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }
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
        access_token: encryptIntegrationToken(input.accessToken),
        refresh_token: encryptIntegrationToken(input.refreshToken),
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
    connectedUserId: string;
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
        connected_user_id: input.connectedUserId,
        access_token: encryptIntegrationToken(input.accessToken),
        refresh_token: encryptIntegrationToken(input.refreshToken),
        token_expires_at: input.tokenExpiresAt.toISOString(),
        webhook_id: input.webhookId ?? null,
        webhook_token: encryptNullableIntegrationToken(input.webhookToken),
        zoom_account_id: input.zoomAccountId,
        zoom_user_id: input.zoomUserId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,connected_user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async findZoomIntegrationForDisconnect(orgId: string, connectedUserId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .select("access_token, refresh_token, token_expires_at, webhook_id")
      .eq("org_id", orgId)
      .eq("connected_user_id", connectedUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      accessToken: decryptIntegrationToken(data.access_token as string),
      refreshToken: decryptIntegrationToken(data.refresh_token as string),
      tokenExpiresAt: new Date(data.token_expires_at as string),
      webhookId: (data.webhook_id as string | null) ?? null,
    };
  }

  async updateZoomTokens(orgId: string, connectedUserId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("zoom_integrations")
      .update({
        access_token: encryptIntegrationToken(tokens.accessToken),
        refresh_token: encryptIntegrationToken(tokens.refreshToken),
        token_expires_at: tokens.tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("connected_user_id", connectedUserId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async listGhlUserMappings(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("ghl_user_mappings")
      .select("id, argos_user_id, ghl_user_email, ghl_user_id, ghl_user_name, location_id")
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      argosUserId: row.argos_user_id,
      ghlUserEmail: row.ghl_user_email,
      ghlUserId: row.ghl_user_id,
      ghlUserName: row.ghl_user_name,
      locationId: row.location_id,
    }));
  }

  async requestGhlSync(orgId: string) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("ghl_integrations")
      .update({
        last_sync_error: null,
        last_sync_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async setGhlDefaultRep(orgId: string, repId: string | null) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("ghl_integrations")
      .update({
        default_rep_id: repId,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async upsertGhlUserMappings(input: {
    orgId: string;
    locationId: string;
    mappings: Array<{
      argosUserId: string;
      ghlUserEmail?: string | null;
      ghlUserId: string;
      ghlUserName?: string | null;
    }>;
  }) {
    if (!input.mappings.length) {
      return;
    }

    const supabase: any = this.supabase;
    const { error } = await supabase.from("ghl_user_mappings").upsert(
      input.mappings.map((mapping) => ({
        org_id: input.orgId,
        location_id: input.locationId,
        argos_user_id: mapping.argosUserId,
        ghl_user_email: mapping.ghlUserEmail ?? null,
        ghl_user_id: mapping.ghlUserId,
        ghl_user_name: mapping.ghlUserName ?? null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "org_id,location_id,ghl_user_id" },
    );

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
      .select("connected_at, consent_confirmed_at, default_rep_id, last_sync_completed_at, last_sync_error, last_sync_started_at, location_id, location_name, sync_enabled")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const { count: mappedUsersCount, error: countError } = data
      ? await supabase
          .from("ghl_user_mappings")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
      : { count: 0, error: null };

    if (countError) {
      throw new Error(countError.message);
    }

    return {
      connected: Boolean(data),
      connectedAt: toDate(data?.connected_at),
      consentConfirmedAt: toDate(data?.consent_confirmed_at),
      defaultRepId: data?.default_rep_id ?? null,
      lastSyncCompletedAt: toDate(data?.last_sync_completed_at),
      lastSyncError: data?.last_sync_error ?? null,
      lastSyncStartedAt: toDate(data?.last_sync_started_at),
      locationId: data?.location_id ?? null,
      locationName: data?.location_name ?? null,
      mappedUsersCount: mappedUsersCount ?? 0,
      syncEnabled: Boolean(data?.sync_enabled),
    };
  }

  async findZoomStatus(orgId: string, connectedUserId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("zoom_integrations")
      .select("connected_at, zoom_user_id")
      .eq("org_id", orgId)
      .eq("connected_user_id", connectedUserId)
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

  async findOrgUserIds(orgId: string, userIds: string[]) {
    if (!userIds.length) {
      return [];
    }

    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", orgId)
      .in("id", userIds);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => row.id as string);
  }
}
