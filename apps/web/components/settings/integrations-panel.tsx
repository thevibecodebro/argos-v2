"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
            Zoom
          </p>
          <p className="mt-2 text-xl font-semibold text-white">Call Recording Ingest</p>
        </div>

        {isConnected ? (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Connected
          </span>
        ) : (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Not connected
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-[#a9abb3]">
        Connect your Zoom account to automatically import call recordings and transcripts.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-1">
          {zoomUserIdState ? (
            <p className="text-sm text-[#a9abb3]">
              <span className="text-[#a9abb3]">User ID:</span>{" "}
              <span className="font-medium text-[#ecedf6]">{zoomUserIdState}</span>
            </p>
          ) : null}
          {connectedAtState ? (
            <p className="text-sm text-[#a9abb3]">
              Connected {formatConnectedAt(connectedAtState)}
            </p>
          ) : null}
        </div>
      ) : null}

      {!available && !isConnected ? (
        <p className="mt-3 text-sm text-amber-200/80">
          OAuth credentials for Zoom are not yet configured in this environment.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
            <>
              <p className="text-sm text-[#a9abb3]">Are you sure?</p>
              <button
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                disabled={isMutating}
                onClick={() => {
                  void handleDisconnect();
                }}
                type="button"
              >
                {isMutating ? "Disconnecting..." : "Yes, disconnect"}
              </button>
              <button
                className="rounded-xl border border-[#45484f]/20 px-3 py-1.5 text-sm font-medium text-[#a9abb3] transition hover:border-slate-600 hover:text-[#ecedf6]"
                disabled={isMutating}
                onClick={() => setConfirmDisconnect(false)}
                type="button"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="rounded-xl border border-[#45484f]/20 px-3 py-1.5 text-sm font-medium text-[#a9abb3] transition hover:border-red-500/30 hover:text-red-300"
              onClick={() => setConfirmDisconnect(true)}
              type="button"
            >
              Disconnect
            </button>
          )
        ) : (
          <button
            className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
            disabled={!available}
            onClick={() => router.push(connectPath)}
            type="button"
          >
            Connect Zoom
          </button>
        )}
      </div>
    </section>
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
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
            Go High Level
          </p>
          <p className="mt-2 text-xl font-semibold text-white">CRM &amp; Workflow Automation</p>
        </div>

        {isConnected ? (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Connected
          </span>
        ) : (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Not connected
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-[#a9abb3]">
        Connect Go High Level to sync contacts and automate post-call workflows.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-1">
          {locationNameState ? (
            <p className="text-sm text-[#a9abb3]">
              <span className="text-[#a9abb3]">Location:</span>{" "}
              <span className="font-medium text-[#ecedf6]">{locationNameState}</span>
            </p>
          ) : null}
          {connectedAtState ? (
            <p className="text-sm text-[#a9abb3]">
              Connected {formatConnectedAt(connectedAtState)}
            </p>
          ) : null}
        </div>
      ) : null}

      {!available && !isConnected ? (
        <p className="mt-3 text-sm text-amber-200/80">
          OAuth credentials for Go High Level are not yet configured in this environment.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          confirmDisconnect ? (
            <>
              <p className="text-sm text-[#a9abb3]">Are you sure?</p>
              <button
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                disabled={isMutating}
                onClick={() => {
                  void handleDisconnect();
                }}
                type="button"
              >
                {isMutating ? "Disconnecting..." : "Yes, disconnect"}
              </button>
              <button
                className="rounded-xl border border-[#45484f]/20 px-3 py-1.5 text-sm font-medium text-[#a9abb3] transition hover:border-slate-600 hover:text-[#ecedf6]"
                disabled={isMutating}
                onClick={() => setConfirmDisconnect(false)}
                type="button"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="rounded-xl border border-[#45484f]/20 px-3 py-1.5 text-sm font-medium text-[#a9abb3] transition hover:border-red-500/30 hover:text-red-300"
              onClick={() => setConfirmDisconnect(true)}
              type="button"
            >
              Disconnect
            </button>
          )
        ) : (
          <button
            className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
            disabled={!available}
            onClick={() => router.push(connectPath)}
            type="button"
          >
            Connect Go High Level
          </button>
        )}
      </div>
    </section>
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
