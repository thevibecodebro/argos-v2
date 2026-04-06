"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationStatusData } from "@/lib/integrations/service";

type IntegrationsSettingsPanelProps = {
  initialStatuses: IntegrationStatusData;
  notices?: string[];
};

function formatConnectedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ProviderCardProps = {
  canManage: boolean;
  description: string;
  name: string;
  onDisconnect: () => Promise<void>;
  onManage: () => void;
  provider: IntegrationStatusData["zoom"] | IntegrationStatusData["ghl"];
};

function ProviderCard({
  canManage,
  description,
  name,
  onDisconnect,
  onManage,
  provider,
}: ProviderCardProps) {
  const [isMutating, setIsMutating] = useState(false);

  async function handleDisconnect() {
    setIsMutating(true);
    await onDisconnect();
    setIsMutating(false);
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-800/70 bg-[#0c1629] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{name}</p>
      <p className="mt-3 text-xl font-semibold text-white">
        {provider.connected ? "Connected" : provider.available ? "Ready to connect" : "Not configured"}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
      {provider.connectedAt ? (
        <p className="mt-3 text-sm text-slate-500">Connected {formatConnectedAt(provider.connectedAt)}</p>
      ) : null}
      {"zoomUserId" in provider && provider.zoomUserId ? (
        <p className="mt-2 text-sm text-slate-500">User: {provider.zoomUserId}</p>
      ) : null}
      {"locationName" in provider && provider.locationName ? (
        <p className="mt-2 text-sm text-slate-500">{provider.locationName}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {provider.connected ? (
          <button
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
            disabled={!canManage || isMutating}
            onClick={() => {
              void handleDisconnect();
            }}
            type="button"
          >
            {isMutating ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
            disabled={!canManage}
            onClick={onManage}
            type="button"
          >
            {provider.available ? "Connect" : "View setup status"}
          </button>
        )}
      </div>

      {!canManage ? (
        <p className="mt-3 text-sm text-slate-500">Only admins can change integrations.</p>
      ) : null}
      {!provider.available ? (
        <p className="mt-3 text-sm text-amber-200">OAuth credentials are still missing for this provider.</p>
      ) : null}
    </div>
  );
}

export function IntegrationsSettingsPanel({
  initialStatuses,
  notices = [],
}: IntegrationsSettingsPanelProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);

  async function disconnect(provider: "zoom" | "ghl") {
    const current = provider === "zoom" ? statuses.zoom : statuses.ghl;
    const response = await fetch(current.disconnectPath, { method: "POST" });

    if (response.ok) {
      setStatuses((existing) => ({
        ...existing,
        [provider]: {
          ...existing[provider],
          connected: false,
          connectedAt: null,
          ...(provider === "zoom"
            ? { zoomUserId: null }
            : { locationId: null, locationName: null }),
        },
      }));
      router.refresh();
    }
  }

  function manage(connectPath: string) {
    router.push(connectPath);
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <div
          className="rounded-[1.25rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          key={notice}
        >
          {notice}
        </div>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <ProviderCard
          canManage={statuses.canManage}
          description="Connect Zoom to enable cloud-recording ingest and webhook-based call capture."
          name="Zoom"
          onDisconnect={async () => disconnect("zoom")}
          onManage={() => manage(statuses.zoom.connectPath)}
          provider={statuses.zoom}
        />
        <ProviderCard
          canManage={statuses.canManage}
          description="Connect Go High Level to sync CRM location data and note push workflows."
          name="Go High Level"
          onDisconnect={async () => disconnect("ghl")}
          onManage={() => manage(statuses.ghl.connectPath)}
          provider={statuses.ghl}
        />
      </div>
    </div>
  );
}
