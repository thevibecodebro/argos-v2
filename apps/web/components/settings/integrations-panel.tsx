"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeSurface } from "@/components/forge";

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
  const [zoomUserIdState, setZoomUserIdState] = useState(zoomUserId);

  async function handleDisconnect() {
    setIsMutating(true);
    const response = await fetch(disconnectPath, { method: "POST" });
    if (response.ok) {
      setIsConnected(false);
      setConnectedAtState(null);
      setZoomUserIdState(null);
      setIsDisconnected(true);
      setConfirmDisconnect(false);
      router.refresh();
    }
    setIsMutating(false);
  }

  return (
    <ForgeSurface as="section" className="p-6" variant="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
            Zoom
          </p>
          <p className="mt-2 text-xl font-semibold text-white">Call Recording Ingest</p>
        </div>

        {isConnected ? (
          <ForgeChip tone="success">Connected</ForgeChip>
        ) : (
          <ForgeChip tone="ember">Not connected</ForgeChip>
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
        Connect your Zoom account to automatically import call recordings and transcripts.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-1">
          {zoomUserIdState ? (
            <p className="text-sm text-[var(--forge-muted)]">
              <span className="text-[var(--forge-muted)]">User ID:</span>{" "}
              <span className="font-medium text-[var(--forge-text)]">{zoomUserIdState}</span>
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
        <p className="mt-3 text-sm text-[rgba(255,159,95,0.82)]">
          OAuth credentials for Zoom are not yet configured in this environment.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
            <>
              <p className="text-sm text-[var(--forge-muted)]">Are you sure?</p>
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
                onClick={() => setConfirmDisconnect(false)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Cancel
              </ForgeButton>
            </>
          ) : (
            <ForgeButton
              onClick={() => setConfirmDisconnect(true)}
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
  const [locationNameState, setLocationNameState] = useState(locationName);

  async function handleDisconnect() {
    setIsMutating(true);
    const response = await fetch(disconnectPath, { method: "POST" });
    if (response.ok) {
      setIsConnected(false);
      setConnectedAtState(null);
      setLocationNameState(null);
      setConfirmDisconnect(false);
      router.refresh();
    }
    setIsMutating(false);
  }

  return (
    <ForgeSurface as="section" className="p-6" variant="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
            Go High Level
          </p>
          <p className="mt-2 text-xl font-semibold text-white">CRM &amp; Workflow Automation</p>
        </div>

        {isConnected ? (
          <ForgeChip tone="success">Connected</ForgeChip>
        ) : (
          <ForgeChip tone="ember">Not connected</ForgeChip>
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
              <span className="font-medium text-[var(--forge-text)]">{locationNameState}</span>
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
        <p className="mt-3 text-sm text-[rgba(255,159,95,0.82)]">
          OAuth credentials for Go High Level are not yet configured in this environment.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
            <>
              <p className="text-sm text-[var(--forge-muted)]">Are you sure?</p>
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
                onClick={() => setConfirmDisconnect(false)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Cancel
              </ForgeButton>
            </>
          ) : (
            <ForgeButton
              onClick={() => setConfirmDisconnect(true)}
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
