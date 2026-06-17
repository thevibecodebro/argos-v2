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
    disconnectPath: string;
    locationId?: string | null;
    locationName?: string | null;
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

const disconnectFallbacks: Record<IntegrationService, string> = {
  zoom: "Unable to disconnect Zoom. Try again.",
  ghl: "Unable to disconnect Go High Level. Try again.",
};

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
  disconnectPath: string;
  locationId?: string | null;
  locationName?: string | null;
};

function GhlCard({
  available,
  connectPath,
  connected,
  connectedAt,
  disconnectPath,
  locationName,
}: GhlCardProps) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);
  const [connectedAtState, setConnectedAtState] = useState(connectedAt);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [locationNameState, setLocationNameState] = useState(locationName);

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
        Connect Go High Level to sync contacts and automate post-call workflows.
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
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
          )
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
        disconnectPath={ghl.disconnectPath}
        locationId={ghl.locationId}
        locationName={ghl.locationName}
      />
    </div>
  );
}
