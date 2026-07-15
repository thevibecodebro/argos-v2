import { deleteZoomWebhook, refreshZoomToken } from "./oauth";
import { revokeGoogleToken } from "@argos-v2/google-workspace-client";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

type IntegrationProvider = "zoom" | "ghl" | "google_meet";

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
  googleMeetClientId?: string | null | undefined;
  googleMeetClientSecret?: string | null | undefined;
  googleMeetEnabled?: string | null | undefined;
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

export type GoogleMeetIntegrationStatus = {
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt: string | null;
  consentConfirmedAt: string | null;
  defaultRepId: string | null;
  disconnectPath: string;
  googleEmail: string | null;
  lastSyncCompletedAt: string | null;
  lastSyncError: string | null;
  lastSyncStartedAt: string | null;
  syncEnabled: boolean;
};

export type IntegrationStatusData = {
  canManage: boolean;
  ghl: GhlIntegrationStatus;
  googleMeet: GoogleMeetIntegrationStatus;
  zoom: ZoomIntegrationStatus;
};

export type IntegrationsRepository = {
  deleteGoogleMeetIntegration(orgId: string): Promise<boolean>;
  deleteGhlIntegration(orgId: string): Promise<boolean>;
  deleteZoomIntegration(orgId: string, connectedUserId: string): Promise<boolean>;
  acknowledgeGoogleMeetRecordingConsent(orgId: string, userId: string): Promise<void>;
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
  findGoogleMeetStatus(orgId: string): Promise<{
    connected: boolean;
    connectedAt: Date | null;
    consentConfirmedAt: Date | null;
    defaultRepId: string | null;
    googleEmail: string | null;
    lastSyncCompletedAt: Date | null;
    lastSyncError: string | null;
    lastSyncStartedAt: Date | null;
    syncEnabled: boolean;
  }>;
  findGoogleMeetIntegrationForDisconnect(orgId: string): Promise<{
    refreshToken: string;
  } | null>;
  hasConfiguredIngestionTitleFilters(orgId: string): Promise<boolean>;
  findZoomIntegrationForDisconnect(orgId: string, connectedUserId: string): Promise<{ accessToken: string; refreshToken: string; tokenExpiresAt: Date; webhookId: string | null } | null>;
  findZoomStatus(orgId: string, connectedUserId: string): Promise<{ connected: boolean; connectedAt: Date | null; zoomUserId: string | null }>;
  findOrgUserIds(orgId: string, userIds: string[]): Promise<string[]>;
  listGhlUserMappings(orgId: string): Promise<GhlUserMapping[]>;
  requestGhlSync(orgId: string): Promise<void>;
  requestGoogleMeetSync(orgId: string): Promise<void>;
  redactGoogleMeetImportsForDisconnect(orgId: string): Promise<void>;
  setGhlDefaultRep(orgId: string, repId: string | null): Promise<void>;
  setGoogleMeetDefaultRep(orgId: string, repId: string | null): Promise<void>;
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
  upsertGoogleMeetIntegration(input: {
    accessToken: string;
    connectedUserId: string;
    googleEmail: string | null;
    googleUserId: string | null;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
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
  googleMeetClientId: process.env.GOOGLE_MEET_CLIENT_ID,
  googleMeetClientSecret: process.env.GOOGLE_MEET_CLIENT_SECRET,
  googleMeetEnabled: process.env.ARGOS_GOOGLE_MEET_ENABLED,
  zoomClientId: process.env.ZOOM_CLIENT_ID,
}) {
  return {
    ghl: isGhlIntegrationConfigured(input),
    googleMeet: isGoogleMeetIntegrationConfigured(input),
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

export function isGoogleMeetIntegrationConfigured(
  input: Partial<IntegrationAvailability> = {
    googleMeetClientId: process.env.GOOGLE_MEET_CLIENT_ID,
    googleMeetClientSecret: process.env.GOOGLE_MEET_CLIENT_SECRET,
    googleMeetEnabled: process.env.ARGOS_GOOGLE_MEET_ENABLED,
  },
) {
  return (
    input.googleMeetEnabled === "true" &&
    Boolean(input.googleMeetClientId) &&
    Boolean(input.googleMeetClientSecret)
  );
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
        googleMeet: {
          available: availability.googleMeet,
          connectPath: "/api/integrations/google-meet/connect",
          connected: false,
          connectedAt: null,
          consentConfirmedAt: null,
          defaultRepId: null,
          disconnectPath: "/api/integrations/google-meet/disconnect",
          googleEmail: null,
          lastSyncCompletedAt: null,
          lastSyncError: null,
          lastSyncStartedAt: null,
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
  const unavailableGoogleMeet = {
    connected: false,
    connectedAt: null,
    consentConfirmedAt: null,
    defaultRepId: null,
    googleEmail: null,
    lastSyncCompletedAt: null,
    lastSyncError: null,
    lastSyncStartedAt: null,
    syncEnabled: false,
  };
  const [zoom, ghl, googleMeet] = await Promise.all([
    repository.findZoomStatus(viewer.org.id, viewer.id),
    availability.ghl ? repository.findGhlStatus(viewer.org.id) : Promise.resolve(unavailableGhl),
    availability.googleMeet
      ? repository.findGoogleMeetStatus(viewer.org.id)
      : Promise.resolve(unavailableGoogleMeet),
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
      googleMeet: {
        available: availability.googleMeet,
        connectPath: "/api/integrations/google-meet/connect",
        connected: googleMeet.connected,
        connectedAt: googleMeet.connectedAt?.toISOString() ?? null,
        consentConfirmedAt:
          googleMeet.consentConfirmedAt?.toISOString() ?? null,
        defaultRepId: googleMeet.defaultRepId,
        disconnectPath: "/api/integrations/google-meet/disconnect",
        googleEmail: googleMeet.googleEmail,
        lastSyncCompletedAt:
          googleMeet.lastSyncCompletedAt?.toISOString() ?? null,
        lastSyncError: googleMeet.lastSyncError,
        lastSyncStartedAt:
          googleMeet.lastSyncStartedAt?.toISOString() ?? null,
        syncEnabled: googleMeet.syncEnabled,
      },
    },
  };
}

export async function disconnectIntegration(
  repository: IntegrationsRepository,
  authUserId: string,
  provider: IntegrationProvider,
  dependencies: {
    revokeGoogleToken: typeof revokeGoogleToken;
  } = { revokeGoogleToken },
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
  } else if (provider === "ghl") {
    await repository.deleteGhlIntegration(viewer.org.id);
  } else {
    const integration = await repository.findGoogleMeetIntegrationForDisconnect(
      viewer.org.id,
    );
    if (integration) {
      await dependencies.revokeGoogleToken({ token: integration.refreshToken });
    }
    await repository.redactGoogleMeetImportsForDisconnect(viewer.org.id);
    await repository.deleteGoogleMeetIntegration(viewer.org.id);
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

export async function updateGoogleMeetSettings(
  repository: IntegrationsRepository,
  authUserId: string,
  input: { defaultRepId: string | null },
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const googleMeet = await repository.findGoogleMeetStatus(viewer.data.org.id);
  if (!googleMeet.connected) {
    return {
      ok: false,
      status: 404,
      error: "Google Meet is not connected",
    };
  }

  if (input.defaultRepId) {
    const orgUserIds = await repository.findOrgUserIds(viewer.data.org.id, [
      input.defaultRepId,
    ]);
    if (!orgUserIds.includes(input.defaultRepId)) {
      return {
        ok: false,
        status: 400,
        error: "Google Meet owner must belong to this organization",
      };
    }
  }

  await repository.setGoogleMeetDefaultRep(
    viewer.data.org.id,
    input.defaultRepId,
  );
  return { ok: true, data: { success: true } };
}

export async function acknowledgeGoogleMeetRecordingConsent(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const orgId = viewer.data.org.id;
  const googleMeet = await repository.findGoogleMeetStatus(orgId);
  if (!googleMeet.connected) {
    return {
      ok: false,
      status: 404,
      error: "Google Meet is not connected",
    };
  }

  if (!(await repository.hasConfiguredIngestionTitleFilters(orgId))) {
    return {
      ok: false,
      status: 400,
      error:
        "Add at least one include title phrase before enabling Google Meet sync",
    };
  }

  if (!googleMeet.defaultRepId) {
    return {
      ok: false,
      status: 400,
      error: "Select a default Argos rep before enabling Google Meet sync",
    };
  }

  await repository.acknowledgeGoogleMeetRecordingConsent(
    orgId,
    viewer.data.id,
  );
  return { ok: true, data: { success: true } };
}

export async function requestGoogleMeetSync(
  repository: IntegrationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await getAdminViewer(repository, authUserId);

  if (!viewer.ok) {
    return viewer;
  }

  const orgId = viewer.data.org.id;
  const googleMeet = await repository.findGoogleMeetStatus(orgId);
  if (!googleMeet.connected) {
    return {
      ok: false,
      status: 404,
      error: "Google Meet is not connected",
    };
  }

  if (!(await repository.hasConfiguredIngestionTitleFilters(orgId))) {
    return {
      ok: false,
      status: 400,
      error:
        "Add at least one include title phrase before syncing Google Meet recordings",
    };
  }

  if (!googleMeet.defaultRepId) {
    return {
      ok: false,
      status: 400,
      error: "Select a default Argos rep before syncing Google Meet recordings",
    };
  }

  if (!googleMeet.consentConfirmedAt || !googleMeet.syncEnabled) {
    return {
      ok: false,
      status: 400,
      error: "Confirm recording consent before syncing Google Meet recordings",
    };
  }

  await repository.requestGoogleMeetSync(orgId);
  return { ok: true, data: { success: true } };
}
