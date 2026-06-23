import { deleteZoomWebhook, refreshZoomToken } from "./oauth";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

type IntegrationProvider = "zoom" | "ghl";

export type GhlUserMapping = {
  id: string;
  argosUserId: string;
  ghlUserEmail: string | null;
  ghlUserId: string;
  ghlUserName: string | null;
  locationId: string;
};

type IntegrationAvailability = {
  ghlClientId: string | null | undefined;
  ghlClientSecret: string | null | undefined;
  ghlEnabled: string | null | undefined;
  zoomClientId: string | null | undefined;
};

export type ZoomIntegrationStatus = {
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt: string | null;
  disconnectPath: string;
  zoomUserId: string | null;
};

export type GhlIntegrationStatus = {
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt: string | null;
  consentConfirmedAt: string | null;
  defaultRepId: string | null;
  disconnectPath: string;
  lastSyncCompletedAt: string | null;
  lastSyncError: string | null;
  lastSyncStartedAt: string | null;
  locationId: string | null;
  locationName: string | null;
  mappedUsersCount: number;
  syncEnabled: boolean;
};

export type IntegrationStatusData = {
  canManage: boolean;
  ghl: GhlIntegrationStatus;
  zoom: ZoomIntegrationStatus;
};

export type IntegrationsRepository = {
  deleteGhlIntegration(orgId: string): Promise<boolean>;
  deleteZoomIntegration(orgId: string, connectedUserId: string): Promise<boolean>;
  acknowledgeGhlRecordingConsent(orgId: string, userId: string): Promise<void>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findGhlStatus(orgId: string): Promise<{
    connected: boolean;
    connectedAt: Date | null;
    consentConfirmedAt: Date | null;
    defaultRepId: string | null;
    lastSyncCompletedAt: Date | null;
    lastSyncError: string | null;
    lastSyncStartedAt: Date | null;
    locationId: string | null;
    locationName: string | null;
    mappedUsersCount: number;
    syncEnabled: boolean;
  }>;
  findZoomIntegrationForDisconnect(orgId: string, connectedUserId: string): Promise<{ accessToken: string; refreshToken: string; tokenExpiresAt: Date; webhookId: string | null } | null>;
  findZoomStatus(orgId: string, connectedUserId: string): Promise<{ connected: boolean; connectedAt: Date | null; zoomUserId: string | null }>;
  findOrgUserIds(orgId: string, userIds: string[]): Promise<string[]>;
  listGhlUserMappings(orgId: string): Promise<GhlUserMapping[]>;
  requestGhlSync(orgId: string): Promise<void>;
  setGhlDefaultRep(orgId: string, repId: string | null): Promise<void>;
  updateZoomTokens(orgId: string, connectedUserId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }): Promise<void>;
  upsertZoomIntegration(input: {
    accessToken: string;
    connectedUserId: string;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    webhookId?: string | null;
    webhookToken?: string | null;
    zoomAccountId: string | null;
    zoomUserId: string | null;
  }): Promise<void>;
  upsertGhlUserMappings(input: {
    orgId: string;
    locationId: string;
    mappings: Array<{
      argosUserId: string;
      ghlUserEmail?: string | null;
      ghlUserId: string;
      ghlUserName?: string | null;
    }>;
  }): Promise<void>;
};

function canManage(role: AppUserRole | null) {
  return role === "admin";
}

function getAvailability(input: IntegrationAvailability = {
  ghlClientId: process.env.GHL_CLIENT_ID,
  ghlClientSecret: process.env.GHL_CLIENT_SECRET,
  ghlEnabled: process.env.ARGOS_GHL_ENABLED,
  zoomClientId: process.env.ZOOM_CLIENT_ID,
}) {
  return {
    ghl: isGhlIntegrationConfigured(input),
    zoom: Boolean(input.zoomClientId),
  };
}

export function isGhlIntegrationConfigured(input: Partial<IntegrationAvailability> = {
  ghlClientId: process.env.GHL_CLIENT_ID,
  ghlClientSecret: process.env.GHL_CLIENT_SECRET,
  ghlEnabled: process.env.ARGOS_GHL_ENABLED,
}) {
  return input.ghlEnabled === "true" && Boolean(input.ghlClientId) && Boolean(input.ghlClientSecret);
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
          available: availability.ghl,
          connectPath: "/api/integrations/ghl/connect",
          connected: false,
          connectedAt: null,
          consentConfirmedAt: null,
          defaultRepId: null,
          disconnectPath: "/api/integrations/ghl/disconnect",
          lastSyncCompletedAt: null,
          lastSyncError: null,
          lastSyncStartedAt: null,
          locationId: null,
          locationName: null,
          mappedUsersCount: 0,
          syncEnabled: false,
        },
        zoom: {
          available: availability.zoom,
          connectPath: "/api/integrations/zoom/connect",
          connected: false,
          connectedAt: null,
          disconnectPath: "/api/integrations/zoom/disconnect",
          zoomUserId: null,
        },
      },
    };
  }

  const unavailableGhl = {
    connected: false,
    connectedAt: null,
    consentConfirmedAt: null,
    defaultRepId: null,
    lastSyncCompletedAt: null,
    lastSyncError: null,
    lastSyncStartedAt: null,
    locationId: null,
    locationName: null,
    mappedUsersCount: 0,
    syncEnabled: false,
  };
  const [zoom, ghl] = await Promise.all([
    repository.findZoomStatus(viewer.org.id, viewer.id),
    availability.ghl ? repository.findGhlStatus(viewer.org.id) : Promise.resolve(unavailableGhl),
  ]);

  return {
    ok: true,
    data: {
      canManage: canManage(viewer.role),
      zoom: {
        available: availability.zoom,
        connectPath: "/api/integrations/zoom/connect",
        connected: zoom.connected,
        connectedAt: zoom.connectedAt?.toISOString() ?? null,
        disconnectPath: "/api/integrations/zoom/disconnect",
        zoomUserId: zoom.zoomUserId,
      },
      ghl: {
        available: availability.ghl,
        connectPath: "/api/integrations/ghl/connect",
        connected: ghl.connected,
        connectedAt: ghl.connectedAt?.toISOString() ?? null,
        consentConfirmedAt: ghl.consentConfirmedAt?.toISOString() ?? null,
        defaultRepId: ghl.defaultRepId,
        disconnectPath: "/api/integrations/ghl/disconnect",
        lastSyncCompletedAt: ghl.lastSyncCompletedAt?.toISOString() ?? null,
        lastSyncError: ghl.lastSyncError,
        lastSyncStartedAt: ghl.lastSyncStartedAt?.toISOString() ?? null,
        locationId: ghl.locationId,
        locationName: ghl.locationName,
        mappedUsersCount: ghl.mappedUsersCount,
        syncEnabled: ghl.syncEnabled,
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

  if (provider !== "zoom" && !canManage(viewer.role)) {
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
    const integration = await repository.findZoomIntegrationForDisconnect(viewer.org.id, viewer.id);

    if (integration?.webhookId) {
      try {
        let { accessToken } = integration;

        if (integration.tokenExpiresAt <= new Date()) {
          const refreshed = await refreshZoomToken(integration.refreshToken);
          await repository.updateZoomTokens(viewer.org.id, viewer.id, refreshed);
          accessToken = refreshed.accessToken;
        }

        await deleteZoomWebhook({ accessToken, webhookId: integration.webhookId });
      } catch {
        // Best-effort — proceed with disconnect even if webhook deletion fails
      }
    }

    await repository.deleteZoomIntegration(viewer.org.id, viewer.id);
  } else {
    await repository.deleteGhlIntegration(viewer.org.id);
  }

  return {
    ok: true,
    data: { provider, success: true },
  };
}

async function getAdminViewer(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<DashboardUserRecord & { org: NonNullable<DashboardUserRecord["org"]> }>> {
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
      ok: false,
      status: 404,
      error: "User is not assigned to an organization",
    };
  }

  return {
    ok: true,
    data: viewer as DashboardUserRecord & { org: NonNullable<DashboardUserRecord["org"]> },
  };
}

export async function acknowledgeGhlRecordingConsent(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const ghl = await repository.findGhlStatus(viewer.data.org.id);

  if (!ghl.connected) {
    return {
      ok: false,
      status: 404,
      error: "GoHighLevel is not connected",
    };
  }

  await repository.acknowledgeGhlRecordingConsent(viewer.data.org.id, viewer.data.id);

  return { ok: true, data: { success: true } };
}

export async function listGhlUserMappings(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ mappings: GhlUserMapping[] }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  return {
    ok: true,
    data: {
      mappings: await repository.listGhlUserMappings(viewer.data.org.id),
    },
  };
}

export async function updateGhlUserMappings(
  repository: IntegrationsRepository,
  authUserId: string,
  input: {
    defaultRepId?: string | null;
    mappings?: Array<{
      argosUserId: string;
      ghlUserEmail?: string | null;
      ghlUserId: string;
      ghlUserName?: string | null;
    }>;
  },
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const ghl = await repository.findGhlStatus(viewer.data.org.id);

  if (!ghl.connected || !ghl.locationId) {
    return {
      ok: false,
      status: 404,
      error: "GoHighLevel is not connected",
    };
  }

  const selectedArgosUserIds = [
    ...(input.defaultRepId ? [input.defaultRepId] : []),
    ...(input.mappings?.map((mapping) => mapping.argosUserId) ?? []),
  ];
  const uniqueSelectedArgosUserIds = [...new Set(selectedArgosUserIds)];

  if (uniqueSelectedArgosUserIds.length) {
    const orgUserIds = new Set(
      await repository.findOrgUserIds(viewer.data.org.id, uniqueSelectedArgosUserIds),
    );
    const hasCrossTenantUserId = uniqueSelectedArgosUserIds.some((userId) => !orgUserIds.has(userId));

    if (hasCrossTenantUserId) {
      return {
        ok: false,
        status: 400,
        error: "GHL mappings can only reference users in this organization",
      };
    }
  }

  if (input.defaultRepId !== undefined) {
    await repository.setGhlDefaultRep(viewer.data.org.id, input.defaultRepId);
  }

  if (input.mappings?.length) {
    await repository.upsertGhlUserMappings({
      orgId: viewer.data.org.id,
      locationId: ghl.locationId,
      mappings: input.mappings,
    });
  }

  return { ok: true, data: { success: true } };
}

export async function requestGhlSync(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const ghl = await repository.findGhlStatus(viewer.data.org.id);

  if (!ghl.connected) {
    return {
      ok: false,
      status: 404,
      error: "GoHighLevel is not connected",
    };
  }

  if (!ghl.consentConfirmedAt) {
    return {
      ok: false,
      status: 400,
      error: "Confirm recording consent before syncing GoHighLevel calls",
    };
  }

  await repository.requestGhlSync(viewer.data.org.id);

  return { ok: true, data: { success: true } };
}
