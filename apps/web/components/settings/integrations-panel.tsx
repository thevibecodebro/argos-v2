"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeSurface } from "@/components/forge";
import { SettingsStatus } from "./settings-readability";

export type IntegrationsPanelProps = {
  zoom: {
    available: boolean;
    connectPath: string;
    connected: boolean;
    connectedAt?: string | null;
    disconnectPath: string;
    zoomUserId?: string | null;
  };
  ghl: {
    available: boolean;
    connectPath: string;
    connected: boolean;
    connectedAt?: string | null;
    consentConfirmedAt?: string | null;
    defaultRepId?: string | null;
    disconnectPath: string;
    lastSyncCompletedAt?: string | null;
    lastSyncError?: string | null;
    lastSyncStartedAt?: string | null;
    locationId?: string | null;
    locationName?: string | null;
    mappedUsersCount?: number;
    syncEnabled?: boolean;
    fallbackOwnerOptions?: GhlFallbackOwnerOption[];
  };
};

function formatConnectedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type IntegrationService = "zoom" | "ghl";
type DisconnectFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type DisconnectResult = { ok: true } | { error: string; ok: false };
type GhlFallbackOwnerFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type GhlFallbackOwnerResult = { ok: true } | { error: string; ok: false };
type GhlFallbackOwnerOption = {
  email: string;
  id: string;
  name: string;
  role: string | null;
};

const disconnectFallbacks: Record<IntegrationService, string> = {
  zoom: "Unable to disconnect Zoom. Try again.",
  ghl: "Unable to disconnect Go High Level. Try again.",
};

const ghlActionFallback = "Unable to update Go High Level settings. Try again.";

export function getDisconnectConfirmationCopy(service: IntegrationService) {
  return service === "zoom"
    ? "Disconnect Zoom from this workspace?"
    : "Disconnect Go High Level from this workspace?";
}

export async function getDisconnectErrorMessage(
  service: IntegrationService,
  response: Response,
) {
  const fallback = disconnectFallbacks[service];

  try {
    const payload = (await response.json()) as {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
    };
    const message = [payload.message, payload.error, payload.detail].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    return typeof message === "string" && isReadableDisconnectMessage(message)
      ? message
      : fallback;
  } catch {
    return fallback;
  }
}

function isReadableDisconnectMessage(value: string) {
  const message = value.trim();
  return message.length > 0 && !/^[a-z0-9]+(_[a-z0-9]+)+$/i.test(message);
}

export async function disconnectIntegrationFromBrowser(
  service: IntegrationService,
  disconnectPath: string,
  fetcher: DisconnectFetcher = fetch,
): Promise<DisconnectResult> {
  try {
    const response = await fetcher(disconnectPath, { method: "POST" });

    if (response.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: await getDisconnectErrorMessage(service, response),
    };
  } catch {
    return {
      ok: false,
      error: disconnectFallbacks[service],
    };
  }
}

export async function updateGhlDefaultRepFromBrowser(
  defaultRepId: string | null,
  fetcher: GhlFallbackOwnerFetcher = fetch,
): Promise<GhlFallbackOwnerResult> {
  try {
    const response = await fetcher("/api/integrations/ghl/mappings", {
      body: JSON.stringify({ defaultRepId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (response.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: await getReadableActionError(response),
    };
  } catch {
    return {
      ok: false,
      error: ghlActionFallback,
    };
  }
}

type ZoomCardProps = {
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt?: string | null;
  disconnectPath: string;
  zoomUserId?: string | null;
};

function ZoomCard({
  available,
  connectPath,
  connected,
  connectedAt,
  disconnectPath,
  zoomUserId,
}: ZoomCardProps) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);
  const [connectedAtState, setConnectedAtState] = useState(connectedAt);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [zoomUserIdState, setZoomUserIdState] = useState(zoomUserId);

  async function handleDisconnect() {
    setDisconnectError(null);
    setIsMutating(true);

    try {
      const result = await disconnectIntegrationFromBrowser(
        "zoom",
        disconnectPath,
      );
      if (result.ok) {
        setIsConnected(false);
        setConnectedAtState(null);
        setZoomUserIdState(null);
        setIsDisconnected(true);
        setConfirmDisconnect(false);
        router.refresh();
      } else {
        setDisconnectError(result.error);
      }
    } catch {
      setDisconnectError(disconnectFallbacks.zoom);
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <ForgeSurface as="section" className="p-6" variant="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--forge-muted)]">Zoom</p>
          <p className="mt-2 text-xl font-semibold text-white">
            Call Recording Ingest
          </p>
        </div>

        {isConnected ? (
          <SettingsStatus label="Connected" tone="success" />
        ) : (
          <SettingsStatus label="Not connected" tone="ember" />
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
        Connect your Zoom account to automatically import call recordings and
        transcripts.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-1">
          {zoomUserIdState ? (
            <p className="text-sm text-[var(--forge-muted)]">
              <span className="text-[var(--forge-muted)]">User ID:</span>{" "}
              <span className="font-medium text-[var(--forge-text)]">
                {zoomUserIdState}
              </span>
            </p>
          ) : null}
          {connectedAtState ? (
            <p className="text-sm text-[var(--forge-muted)]">
              Connected {formatConnectedAt(connectedAtState)}
            </p>
          ) : null}
        </div>
      ) : null}

      {!available && !isConnected ? (
        <p className="mt-3 text-sm text-[color-mix(in_srgb,var(--forge-ember)_82%,transparent)]">
          OAuth credentials for Zoom are not yet configured in this environment.
        </p>
      ) : null}

      {disconnectError ? (
        <p
          className="mt-3 text-sm font-medium text-[var(--forge-danger)]"
          role="alert"
        >
          {disconnectError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
            <>
              <p className="text-sm text-[var(--forge-muted)]">
                {getDisconnectConfirmationCopy("zoom")}
              </p>
              <ForgeButton
                disabled={isMutating}
                onClick={() => {
                  void handleDisconnect();
                }}
                size="sm"
                type="button"
                variant="danger"
              >
                {isMutating ? "Disconnecting..." : "Yes, disconnect"}
              </ForgeButton>
              <ForgeButton
                disabled={isMutating}
                onClick={() => {
                  setDisconnectError(null);
                  setConfirmDisconnect(false);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Cancel
              </ForgeButton>
            </>
          ) : (
            <ForgeButton
              onClick={() => {
                setDisconnectError(null);
                setConfirmDisconnect(true);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Disconnect
            </ForgeButton>
          )
        ) : (
          <ForgeButton
            disabled={!available}
            onClick={() => router.push(connectPath)}
            type="button"
            variant="primary"
          >
            Connect Zoom
          </ForgeButton>
        )}
      </div>
    </ForgeSurface>
  );
}

type GhlCardProps = {
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt?: string | null;
  consentConfirmedAt?: string | null;
  defaultRepId?: string | null;
  disconnectPath: string;
  lastSyncCompletedAt?: string | null;
  lastSyncError?: string | null;
  lastSyncStartedAt?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  mappedUsersCount?: number;
  syncEnabled?: boolean;
  fallbackOwnerOptions?: GhlFallbackOwnerOption[];
};

function GhlCard({
  available,
  connectPath,
  connected,
  connectedAt,
  consentConfirmedAt,
  defaultRepId,
  disconnectPath,
  lastSyncCompletedAt,
  lastSyncError,
  lastSyncStartedAt,
  locationName,
  mappedUsersCount,
  syncEnabled,
  fallbackOwnerOptions = [],
}: GhlCardProps) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);
  const [connectedAtState, setConnectedAtState] = useState(connectedAt);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [ghlActionError, setGhlActionError] = useState<string | null>(null);
  const [isGhlActionPending, setIsGhlActionPending] = useState(false);
  const [consentConfirmedAtState, setConsentConfirmedAtState] = useState(consentConfirmedAt);
  const [syncRequested, setSyncRequested] = useState(false);
  const [locationNameState, setLocationNameState] = useState(locationName);
  const [defaultRepIdState, setDefaultRepIdState] = useState(defaultRepId ?? "");
  const [fallbackOwnerDraft, setFallbackOwnerDraft] = useState(defaultRepId ?? "");
  const [isSavingFallbackOwner, setIsSavingFallbackOwner] = useState(false);
  const [fallbackOwnerSaved, setFallbackOwnerSaved] = useState(false);
  const hasOwnerPath = Boolean(defaultRepIdState) || (mappedUsersCount ?? 0) > 0;

  async function handleDisconnect() {
    setDisconnectError(null);
    setIsMutating(true);

    try {
      const result = await disconnectIntegrationFromBrowser(
        "ghl",
        disconnectPath,
      );
      if (result.ok) {
        setIsConnected(false);
        setConnectedAtState(null);
        setLocationNameState(null);
        setConfirmDisconnect(false);
        router.refresh();
      } else {
        setDisconnectError(result.error);
      }
    } catch {
      setDisconnectError(disconnectFallbacks.ghl);
    } finally {
      setIsMutating(false);
    }
  }

  async function postGhlAction(path: string) {
    setGhlActionError(null);
    setIsGhlActionPending(true);

    try {
      const response = await fetch(path, { method: "POST" });

      if (!response.ok) {
        setGhlActionError(await getReadableActionError(response));
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setGhlActionError(ghlActionFallback);
      return false;
    } finally {
      setIsGhlActionPending(false);
    }
  }

  async function handleConsent() {
    const ok = await postGhlAction("/api/integrations/ghl/consent");

    if (ok) {
      setConsentConfirmedAtState(new Date().toISOString());
    }
  }

  async function handleSyncNow() {
    const ok = await postGhlAction("/api/integrations/ghl/sync");

    if (ok) {
      setSyncRequested(true);
    }
  }

  async function handleFallbackOwnerSave() {
    setGhlActionError(null);
    setFallbackOwnerSaved(false);
    setIsSavingFallbackOwner(true);

    try {
      const result = await updateGhlDefaultRepFromBrowser(
        fallbackOwnerDraft || null,
      );

      if (result.ok) {
        setDefaultRepIdState(fallbackOwnerDraft);
        setFallbackOwnerSaved(true);
        router.refresh();
      } else {
        setGhlActionError(result.error);
      }
    } finally {
      setIsSavingFallbackOwner(false);
    }
  }

  return (
    <ForgeSurface as="section" className="p-6" variant="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--forge-muted)]">
            Go High Level
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            CRM &amp; Workflow Automation
          </p>
        </div>

        {isConnected ? (
          <SettingsStatus label="Connected" tone="success" />
        ) : (
          <SettingsStatus label="Not connected" tone="ember" />
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
        Connect Go High Level to import dialed call recordings into Argos for
        review, scoring, and coaching.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-1">
          {locationNameState ? (
            <p className="text-sm text-[var(--forge-muted)]">
              <span className="text-[var(--forge-muted)]">Location:</span>{" "}
              <span className="font-medium text-[var(--forge-text)]">
                {locationNameState}
              </span>
            </p>
          ) : null}
          {connectedAtState ? (
            <p className="text-sm text-[var(--forge-muted)]">
              Connected {formatConnectedAt(connectedAtState)}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 rounded-[8px] border border-[var(--forge-border)] bg-black/10 p-3 text-sm text-[var(--forge-muted)] sm:grid-cols-2">
            <p>
              <span className="block text-xs text-[var(--forge-muted)]">
                Call Recording Sync
              </span>
              <span className="font-medium text-[var(--forge-text)]">
                {syncEnabled ? "Enabled" : "Not enabled"}
              </span>
            </p>
            <p>
              <span className="block text-xs text-[var(--forge-muted)]">
                Consent
              </span>
              <span className="font-medium text-[var(--forge-text)]">
                {consentConfirmedAtState ? "Consent confirmed" : "Consent required"}
              </span>
            </p>
            <p>
              <span className="block text-xs text-[var(--forge-muted)]">
                Mapped users
              </span>
              <span className="font-medium text-[var(--forge-text)]">
                {mappedUsersCount ?? 0}
              </span>
            </p>
            <p>
              <span className="block text-xs text-[var(--forge-muted)]">
                Fallback owner
              </span>
              <span className="font-medium text-[var(--forge-text)]">
                {defaultRepIdState ? "Configured" : "Not set"}
              </span>
            </p>
            <p className="sm:col-span-2">
              <span className="block text-xs text-[var(--forge-muted)]">
                Last sync
              </span>
              <span className="font-medium text-[var(--forge-text)]">
                {lastSyncCompletedAt
                  ? formatConnectedAt(lastSyncCompletedAt)
                  : lastSyncStartedAt
                    ? `Started ${formatConnectedAt(lastSyncStartedAt)}`
                  : "No completed sync yet"}
              </span>
            </p>
            {lastSyncError ? (
              <p className="sm:col-span-2 text-[var(--forge-danger)]">
                {lastSyncError}
              </p>
            ) : null}
          </div>
          <div
            className="mt-4 space-y-3"
            data-ghl-fallback-owner="true"
          >
            <label
              className="block text-sm font-medium text-[var(--forge-text)]"
              htmlFor="ghl-fallback-owner"
            >
              Select fallback owner
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="min-h-10 rounded-[8px] border border-[var(--forge-border)] bg-black/20 px-3 py-2 text-sm text-[var(--forge-text)] outline-none focus:border-[var(--forge-ember)]"
                disabled={isSavingFallbackOwner || fallbackOwnerOptions.length === 0}
                id="ghl-fallback-owner"
                onChange={(event) => {
                  setFallbackOwnerDraft(event.target.value);
                  setFallbackOwnerSaved(false);
                }}
                value={fallbackOwnerDraft}
              >
                <option value="">No fallback owner</option>
                {fallbackOwnerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name || owner.email} ({owner.email})
                  </option>
                ))}
              </select>
              <ForgeButton
                disabled={
                  isSavingFallbackOwner ||
                  fallbackOwnerOptions.length === 0 ||
                  fallbackOwnerDraft === defaultRepIdState
                }
                onClick={() => {
                  void handleFallbackOwnerSave();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                {isSavingFallbackOwner ? "Saving..." : "Save owner"}
              </ForgeButton>
            </div>
            {fallbackOwnerOptions.length === 0 ? (
              <p className="text-sm text-[var(--forge-muted)]">
                Add an Argos user before enabling unmatched GHL call imports.
              </p>
            ) : null}
            {!hasOwnerPath ? (
              <p className="text-sm text-[var(--forge-muted)]">
                Choose a fallback owner or map GHL users before syncing.
              </p>
            ) : null}
            {fallbackOwnerSaved ? (
              <p className="text-sm text-[var(--forge-muted)]">
                Fallback owner saved for this organization.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!available && !isConnected ? (
        <p className="mt-3 text-sm text-[color-mix(in_srgb,var(--forge-ember)_82%,transparent)]">
          Go High Level is disabled until ARGOS_GHL_ENABLED is true and OAuth
          credentials are configured.
        </p>
      ) : null}

      {disconnectError ? (
        <p
          className="mt-3 text-sm font-medium text-[var(--forge-danger)]"
          role="alert"
        >
          {disconnectError}
        </p>
      ) : null}

      {ghlActionError ? (
        <p
          className="mt-3 text-sm font-medium text-[var(--forge-danger)]"
          role="alert"
        >
          {ghlActionError}
        </p>
      ) : null}

      {syncRequested ? (
        <p className="mt-3 text-sm text-[var(--forge-muted)]">
          Sync queued. The worker will import new eligible GHL recordings.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            {!consentConfirmedAtState ? (
              <ForgeButton
                disabled={isGhlActionPending}
                onClick={() => {
                  void handleConsent();
                }}
                size="sm"
                type="button"
                variant="primary"
              >
                {isGhlActionPending ? "Confirming..." : "Confirm consent"}
              </ForgeButton>
            ) : (
              <ForgeButton
                disabled={isGhlActionPending || !hasOwnerPath}
                onClick={() => {
                  void handleSyncNow();
                }}
                size="sm"
                type="button"
                variant="primary"
              >
                {isGhlActionPending ? "Queueing..." : "Sync now"}
              </ForgeButton>
            )}
            {confirmDisconnect ? (
            <>
              <p className="text-sm text-[var(--forge-muted)]">
                {getDisconnectConfirmationCopy("ghl")}
              </p>
              <ForgeButton
                disabled={isMutating}
                onClick={() => {
                  void handleDisconnect();
                }}
                size="sm"
                type="button"
                variant="danger"
              >
                {isMutating ? "Disconnecting..." : "Yes, disconnect"}
              </ForgeButton>
              <ForgeButton
                disabled={isMutating}
                onClick={() => {
                  setDisconnectError(null);
                  setConfirmDisconnect(false);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Cancel
              </ForgeButton>
            </>
          ) : (
            <ForgeButton
              onClick={() => {
                setDisconnectError(null);
                setConfirmDisconnect(true);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Disconnect
            </ForgeButton>
          )}
          </>
        ) : (
          <ForgeButton
            disabled={!available}
            onClick={() => router.push(connectPath)}
            type="button"
            variant="primary"
          >
            Connect Go High Level
          </ForgeButton>
        )}
      </div>
    </ForgeSurface>
  );
}

async function getReadableActionError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    const message = [payload.message, payload.error].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    return typeof message === "string" ? message : ghlActionFallback;
  } catch {
    return ghlActionFallback;
  }
}

export function IntegrationsPanel({ zoom, ghl }: IntegrationsPanelProps) {
  return (
    <div className="space-y-5">
      <ZoomCard
        available={zoom.available}
        connectPath={zoom.connectPath}
        connected={zoom.connected}
        connectedAt={zoom.connectedAt}
        disconnectPath={zoom.disconnectPath}
        zoomUserId={zoom.zoomUserId}
      />
      <GhlCard
        available={ghl.available}
        connectPath={ghl.connectPath}
        connected={ghl.connected}
        connectedAt={ghl.connectedAt}
        consentConfirmedAt={ghl.consentConfirmedAt}
        defaultRepId={ghl.defaultRepId}
        disconnectPath={ghl.disconnectPath}
        lastSyncCompletedAt={ghl.lastSyncCompletedAt}
        lastSyncError={ghl.lastSyncError}
        lastSyncStartedAt={ghl.lastSyncStartedAt}
        locationId={ghl.locationId}
        locationName={ghl.locationName}
        mappedUsersCount={ghl.mappedUsersCount}
        syncEnabled={ghl.syncEnabled}
        fallbackOwnerOptions={ghl.fallbackOwnerOptions}
      />
    </div>
  );
}
