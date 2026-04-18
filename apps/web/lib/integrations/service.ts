import { deleteZoomWebhook, refreshZoomToken } from "./oauth";
import { getGhlOAuthCapability, getZoomOAuthCapability } from "@/lib/capabilities/service";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403 | 404; error: string };

type IntegrationProvider = "zoom" | "ghl";

type IntegrationAvailability = {
  ghlClientSecret: string | null | undefined;
  ghlClientId: string | null | undefined;
  zoomClientSecret: string | null | undefined;
  zoomClientId: string | null | undefined;
};

export type ZoomIntegrationStatus = {
  available: boolean;
  reason: string | null;
  connectPath: string;
  connected: boolean;
  connectedAt: string | null;
  disconnectPath: string;
  zoomUserId: string | null;
};

export type GhlIntegrationStatus = {
  available: boolean;
  reason: string | null;
  connectPath: string;
  connected: boolean;
  connectedAt: string | null;
  disconnectPath: string;
  locationId: string | null;
  locationName: string | null;
};

export type IntegrationStatusData = {
  canManage: boolean;
  ghl: GhlIntegrationStatus;
  zoom: ZoomIntegrationStatus;
};

export type IntegrationsRepository = {
  deleteGhlIntegration(orgId: string): Promise<boolean>;
  deleteZoomIntegration(orgId: string): Promise<boolean>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findGhlStatus(orgId: string): Promise<{ connected: boolean; connectedAt: Date | null; locationId: string | null; locationName: string | null }>;
  findZoomIntegrationForDisconnect(orgId: string): Promise<{ accessToken: string; refreshToken: string; tokenExpiresAt: Date; webhookId: string | null } | null>;
  findZoomStatus(orgId: string): Promise<{ connected: boolean; connectedAt: Date | null; zoomUserId: string | null }>;
  updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }): Promise<void>;
};

function canManage(role: AppUserRole | null) {
  return role === "admin";
}

function getAvailability(input: IntegrationAvailability = {
  ghlClientId: process.env.GHL_CLIENT_ID,
  ghlClientSecret: process.env.GHL_CLIENT_SECRET,
  zoomClientId: process.env.ZOOM_CLIENT_ID,
  zoomClientSecret: process.env.ZOOM_CLIENT_SECRET,
}) {
  return {
    ghl: getGhlOAuthCapability({
      GHL_CLIENT_ID: input.ghlClientId ?? undefined,
      GHL_CLIENT_SECRET: input.ghlClientSecret ?? undefined,
    }),
    zoom: getZoomOAuthCapability({
      ZOOM_CLIENT_ID: input.zoomClientId ?? undefined,
      ZOOM_CLIENT_SECRET: input.zoomClientSecret ?? undefined,
    }),
  };
}

export async function getIntegrationStatuses(
  repository: IntegrationsRepository,
  authUserId: string,
  availabilityInput?: IntegrationAvailability,
): Promise<ServiceResult<IntegrationStatusData>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  const availability = getAvailability(availabilityInput);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User is not provisioned in the app database",
    };
  }

  if (!viewer.org) {
    return {
      ok: true,
      data: {
        canManage: canManage(viewer.role),
        ghl: {
          available: availability.ghl.available,
          reason: availability.ghl.reason,
          connectPath: "/api/integrations/ghl/connect",
          connected: false,
          connectedAt: null,
          disconnectPath: "/api/integrations/ghl/disconnect",
          locationId: null,
          locationName: null,
        },
        zoom: {
          available: availability.zoom.available,
          reason: availability.zoom.reason,
          connectPath: "/api/integrations/zoom/connect",
          connected: false,
          connectedAt: null,
          disconnectPath: "/api/integrations/zoom/disconnect",
          zoomUserId: null,
        },
      },
    };
  }

  const [zoom, ghl] = await Promise.all([
    repository.findZoomStatus(viewer.org.id),
    repository.findGhlStatus(viewer.org.id),
  ]);

  return {
    ok: true,
    data: {
      canManage: canManage(viewer.role),
      zoom: {
        available: availability.zoom.available,
        reason: availability.zoom.reason,
        connectPath: "/api/integrations/zoom/connect",
        connected: zoom.connected,
        connectedAt: zoom.connectedAt?.toISOString() ?? null,
        disconnectPath: "/api/integrations/zoom/disconnect",
        zoomUserId: zoom.zoomUserId,
      },
      ghl: {
        available: availability.ghl.available,
        reason: availability.ghl.reason,
        connectPath: "/api/integrations/ghl/connect",
        connected: ghl.connected,
        connectedAt: ghl.connectedAt?.toISOString() ?? null,
        disconnectPath: "/api/integrations/ghl/disconnect",
        locationId: ghl.locationId,
        locationName: ghl.locationName,
      },
    },
  };
}

export async function disconnectIntegration(
  repository: IntegrationsRepository,
  authUserId: string,
  provider: IntegrationProvider,
): Promise<ServiceResult<{ provider: IntegrationProvider; success: true }>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User is not provisioned in the app database",
    };
  }

  if (!canManage(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Only organization admins can manage integrations",
    };
  }

  if (!viewer.org) {
    return {
      ok: true,
      data: { provider, success: true },
    };
  }

  if (provider === "zoom") {
    const integration = await repository.findZoomIntegrationForDisconnect(viewer.org.id);

    if (integration?.webhookId) {
      try {
        let { accessToken } = integration;

        if (integration.tokenExpiresAt <= new Date()) {
          const refreshed = await refreshZoomToken(integration.refreshToken);
          await repository.updateZoomTokens(viewer.org.id, refreshed);
          accessToken = refreshed.accessToken;
        }

        await deleteZoomWebhook({ accessToken, webhookId: integration.webhookId });
      } catch {
        // Best-effort — proceed with disconnect even if webhook deletion fails
      }
    }

    await repository.deleteZoomIntegration(viewer.org.id);
  } else {
    await repository.deleteGhlIntegration(viewer.org.id);
  }

  return {
    ok: true,
    data: { provider, success: true },
  };
}
