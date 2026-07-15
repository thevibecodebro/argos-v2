"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canonicalizeIngestionTitleText,
  evaluateIngestionTitleFilter,
  type IngestionTitleDecisionReason,
  type IngestionTitleFilterConfig,
} from "@argos-v2/call-processing";
import { ForgeButton, ForgeIcon, ForgeSurface } from "@/components/forge";
import { SettingsStatus } from "./settings-readability";

export type IntegrationsPanelProps = {
  titleFilterEnforcementEnabled: boolean;
  titleFilters: IngestionTitleFilterConfig;
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
  googleMeet: {
    available: boolean;
    connectPath: string;
    connected: boolean;
    connectedAt?: string | null;
    consentConfirmedAt?: string | null;
    defaultRepId?: string | null;
    disconnectPath: string;
    fallbackOwnerOptions?: GhlFallbackOwnerOption[];
    googleEmail?: string | null;
    lastSyncCompletedAt?: string | null;
    lastSyncError?: string | null;
    lastSyncStartedAt?: string | null;
    syncEnabled?: boolean;
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

type IntegrationService = "zoom" | "ghl" | "google_meet";
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

type TitleFilterFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type TitleFilterSaveResult =
  | { data: IngestionTitleFilterConfig; ok: true }
  | { error: string; ok: false };

const titleFilterSaveFallback =
  "Unable to save auto-ingestion title rules. Try again.";

export function prepareIngestionTitleFilterPhrase(value: string) {
  return canonicalizeIngestionTitleText(value);
}

function isIngestionTitleFilterConfig(
  value: unknown,
): value is IngestionTitleFilterConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IngestionTitleFilterConfig>;
  return (
    typeof candidate.configured === "boolean" &&
    Array.isArray(candidate.excludePhrases) &&
    candidate.excludePhrases.every((phrase) => typeof phrase === "string") &&
    Array.isArray(candidate.includePhrases) &&
    candidate.includePhrases.every((phrase) => typeof phrase === "string")
  );
}

export async function saveIngestionTitleFiltersFromBrowser(
  config: IngestionTitleFilterConfig,
  fetcher: TitleFilterFetcher = fetch,
): Promise<TitleFilterSaveResult> {
  try {
    const response = await fetcher(
      "/api/organizations/ingestion-title-filters",
      {
        body: JSON.stringify({
          excludePhrases: config.excludePhrases,
          includePhrases: config.includePhrases,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );

    if (!response.ok) {
      return {
        error: await getSafeTitleFilterActionError(response),
        ok: false,
      };
    }

    const payload: unknown = await response.json().catch(() => null);
    return isIngestionTitleFilterConfig(payload)
      ? { data: payload, ok: true }
      : { error: titleFilterSaveFallback, ok: false };
  } catch {
    return { error: titleFilterSaveFallback, ok: false };
  }
}

const titlePreviewLabels: Record<IngestionTitleDecisionReason, string> = {
  excluded: "Excluded",
  included: "Included",
  missing_title: "Missing title",
  no_include_match: "No include match",
  unconfigured: "Auto-ingestion paused",
};

export function getIngestionTitlePreviewStatus(
  title: string,
  config: IngestionTitleFilterConfig,
) {
  const decision = evaluateIngestionTitleFilter(title, config);
  const reason = config.configured ? decision.reason : "unconfigured";

  return {
    accepted: reason === "included",
    label: titlePreviewLabels[reason],
    reason,
  };
}

export function getIngestionTitlePreviewLabel(label: string, dirty: boolean) {
  return dirty ? `${label} (unsaved preview)` : label;
}

export type IngestionTitleRulesState = {
  dirty: boolean;
  draftConfig: IngestionTitleFilterConfig;
  savedConfig: IngestionTitleFilterConfig;
};

type IngestionTitleRulesAction =
  | {
      kind: "include" | "exclude";
      phrase: string;
      type: "add";
    }
  | {
      index: number;
      kind: "include" | "exclude";
      type: "remove";
    }
  | {
      config: IngestionTitleFilterConfig;
      type: "saved";
    };

function cloneIngestionTitleFilterConfig(
  config: IngestionTitleFilterConfig,
): IngestionTitleFilterConfig {
  return {
    configured: config.configured,
    excludePhrases: [...config.excludePhrases],
    includePhrases: [...config.includePhrases],
  };
}

function createIngestionTitleRulesState(
  config: IngestionTitleFilterConfig,
): IngestionTitleRulesState {
  return {
    dirty: false,
    draftConfig: cloneIngestionTitleFilterConfig(config),
    savedConfig: cloneIngestionTitleFilterConfig(config),
  };
}

export function ingestionTitleRulesReducer(
  state: IngestionTitleRulesState,
  action: IngestionTitleRulesAction,
): IngestionTitleRulesState {
  if (action.type === "saved") {
    return createIngestionTitleRulesState(action.config);
  }

  const phraseKey =
    action.kind === "include" ? "includePhrases" : "excludePhrases";
  const phrases = state.draftConfig[phraseKey];
  const nextPhrases =
    action.type === "add"
      ? [...phrases, action.phrase]
      : phrases.filter((_, index) => index !== action.index);
  const draftConfig = {
    ...state.draftConfig,
    [phraseKey]: nextPhrases,
  };

  return {
    dirty: true,
    draftConfig: {
      ...draftConfig,
      configured: draftConfig.includePhrases.length > 0,
    },
    savedConfig: state.savedConfig,
  };
}

const disconnectFallbacks: Record<IntegrationService, string> = {
  zoom: "Unable to disconnect Zoom. Try again.",
  ghl: "Unable to disconnect Go High Level. Try again.",
  google_meet: "Unable to disconnect Google Meet. Try again.",
};

const ghlActionFallback = "Unable to update Go High Level settings. Try again.";
const googleMeetActionFallback =
  "Unable to update Google Meet settings. Try again.";

export function getDisconnectConfirmationCopy(service: IntegrationService) {
  if (service === "zoom") {
    return "Disconnect Zoom from this workspace?";
  }
  return service === "ghl"
    ? "Disconnect Go High Level from this workspace?"
    : "Disconnect Google Meet from this workspace?";
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

export async function updateGoogleMeetDefaultRepFromBrowser(
  defaultRepId: string | null,
  fetcher: GhlFallbackOwnerFetcher = fetch,
): Promise<GhlFallbackOwnerResult> {
  try {
    const response = await fetcher("/api/integrations/google-meet/settings", {
      body: JSON.stringify({ defaultRepId }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });

    if (response.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: await getReadableActionError(response, googleMeetActionFallback),
    };
  } catch {
    return { ok: false, error: googleMeetActionFallback };
  }
}

type ZoomCardProps = {
  autoIngestionConfigured: boolean;
  available: boolean;
  connectPath: string;
  connected: boolean;
  connectedAt?: string | null;
  disconnectPath: string;
  titleFilterEnforcementEnabled: boolean;
  zoomUserId?: string | null;
};

function ZoomCard({
  autoIngestionConfigured,
  available,
  connectPath,
  connected,
  connectedAt,
  disconnectPath,
  titleFilterEnforcementEnabled,
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
          <p className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
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

      <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-[var(--forge-border)] bg-black/10 p-3">
        <ForgeIcon
          className={
            titleFilterEnforcementEnabled && autoIngestionConfigured
              ? "mt-0.5 text-[var(--forge-success)]"
              : "mt-0.5 text-[var(--forge-ember)]"
          }
          name={
            titleFilterEnforcementEnabled && autoIngestionConfigured
              ? "check_circle"
              : "cloud_off"
          }
        />
        <div>
          <p className="text-sm font-medium text-[var(--forge-text)]">
            {!titleFilterEnforcementEnabled
              ? "Title filtering not enabled"
              : autoIngestionConfigured
              ? "Automatic recording import ready"
              : "Automatic recording import paused"}
          </p>
          {!titleFilterEnforcementEnabled ? (
            <p className="mt-1 text-sm text-[var(--forge-muted)]">
              Title-based automatic import is rollout pending in this environment.
            </p>
          ) : !autoIngestionConfigured ? (
            <p className="mt-1 text-sm text-[var(--forge-muted)]">
              Add at least one include phrase to enable auto-ingestion.
            </p>
          ) : null}
        </div>
      </div>

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
          <p className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
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

type GoogleMeetCardProps = IntegrationsPanelProps["googleMeet"] & {
  autoIngestionConfigured: boolean;
};

function GoogleMeetCard({
  autoIngestionConfigured,
  available,
  connectPath,
  connected,
  connectedAt,
  consentConfirmedAt,
  defaultRepId,
  disconnectPath,
  fallbackOwnerOptions = [],
  googleEmail,
  lastSyncCompletedAt,
  lastSyncError,
  lastSyncStartedAt,
  syncEnabled,
}: GoogleMeetCardProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(connected);
  const [connectedAtState, setConnectedAtState] = useState(connectedAt);
  const [consentState, setConsentState] = useState(consentConfirmedAt);
  const [defaultRepIdState, setDefaultRepIdState] = useState(defaultRepId ?? "");
  const [ownerDraft, setOwnerDraft] = useState(defaultRepId ?? "");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ownerSaved, setOwnerSaved] = useState(false);
  const [syncRequested, setSyncRequested] = useState(false);
  const hasOwner = Boolean(defaultRepIdState);
  const canConfirmConsent = autoIngestionConfigured && hasOwner;
  const canSync = canConfirmConsent && Boolean(consentState);

  async function handleDisconnect() {
    setActionError(null);
    setIsMutating(true);
    const result = await disconnectIntegrationFromBrowser(
      "google_meet",
      disconnectPath,
    );

    if (result.ok) {
      setIsConnected(false);
      setConnectedAtState(null);
      setConsentState(null);
      setDefaultRepIdState("");
      setConfirmDisconnect(false);
      router.refresh();
    } else {
      setActionError(result.error);
    }
    setIsMutating(false);
  }

  async function handleOwnerSave() {
    setActionError(null);
    setOwnerSaved(false);
    setIsMutating(true);
    const result = await updateGoogleMeetDefaultRepFromBrowser(
      ownerDraft || null,
    );

    if (result.ok) {
      setDefaultRepIdState(ownerDraft);
      if (!ownerDraft) {
        setConsentState(null);
      }
      setOwnerSaved(true);
      router.refresh();
    } else {
      setActionError(result.error);
    }
    setIsMutating(false);
  }

  async function postAction(path: string) {
    setActionError(null);
    setIsMutating(true);
    try {
      const response = await fetch(path, { method: "POST" });
      if (!response.ok) {
        setActionError(
          await getReadableActionError(response, googleMeetActionFallback),
        );
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setActionError(googleMeetActionFallback);
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleConsent() {
    if (await postAction("/api/integrations/google-meet/consent")) {
      setConsentState(new Date().toISOString());
    }
  }

  async function handleSync() {
    if (await postAction("/api/integrations/google-meet/sync")) {
      setSyncRequested(true);
    }
  }

  return (
    <ForgeSurface as="section" className="p-6" variant="panel">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--forge-muted)]">
            Google Meet
          </p>
          <p className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
            Google Workspace recordings
          </p>
        </div>
        <SettingsStatus
          label={isConnected ? "Connected" : "Not connected"}
          tone={isConnected ? "success" : "ember"}
        />
      </div>

      <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
        Import completed Google Meet recordings after each meeting, resolve the
        Calendar title, and send eligible calls through the existing scoring
        pipeline.
      </p>

      {isConnected ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-1 text-sm text-[var(--forge-muted)]">
            {googleEmail ? (
              <p>
                Organizer: <span className="font-medium text-[var(--forge-text)]">{googleEmail}</span>
              </p>
            ) : null}
            {connectedAtState ? (
              <p>Connected {formatConnectedAt(connectedAtState)}</p>
            ) : null}
          </div>

          <div className="grid gap-2 rounded-[8px] border border-[var(--forge-border)] bg-black/10 p-3 text-sm text-[var(--forge-muted)] sm:grid-cols-2">
            <p>
              <span className="block text-xs">Auto-ingestion</span>
              <span className="font-medium text-[var(--forge-text)]">
                {autoIngestionConfigured
                  ? "Title rules configured"
                  : "Google Meet auto-ingestion paused"}
              </span>
            </p>
            <p>
              <span className="block text-xs">Recording consent</span>
              <span className="font-medium text-[var(--forge-text)]">
                {consentState
                  ? "Recording consent confirmed"
                  : "Consent required"}
              </span>
            </p>
            <p>
              <span className="block text-xs">Default owner</span>
              <span className="font-medium text-[var(--forge-text)]">
                {hasOwner ? "Configured" : "Not set"}
              </span>
            </p>
            <p>
              <span className="block text-xs">Recording sync</span>
              <span className="font-medium text-[var(--forge-text)]">
                {syncEnabled ? "Enabled" : "Not enabled"}
              </span>
            </p>
            <p className="sm:col-span-2">
              <span className="block text-xs">Last sync</span>
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

          <div className="space-y-3" data-google-meet-default-owner="true">
            <label
              className="block text-sm font-medium text-[var(--forge-text)]"
              htmlFor="google-meet-default-owner"
            >
              Select default owner
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="min-h-10 rounded-[8px] border border-[var(--forge-border)] bg-black/20 px-3 py-2 text-sm text-[var(--forge-text)] outline-none focus:border-[var(--forge-ember)]"
                disabled={isMutating || fallbackOwnerOptions.length === 0}
                id="google-meet-default-owner"
                onChange={(event) => {
                  setOwnerDraft(event.target.value);
                  setOwnerSaved(false);
                }}
                value={ownerDraft}
              >
                <option value="">No default owner</option>
                {fallbackOwnerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name || owner.email} ({owner.email})
                  </option>
                ))}
              </select>
              <ForgeButton
                disabled={
                  isMutating ||
                  fallbackOwnerOptions.length === 0 ||
                  ownerDraft === defaultRepIdState
                }
                onClick={() => void handleOwnerSave()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {isMutating ? "Saving..." : "Save owner"}
              </ForgeButton>
            </div>
            {!canConfirmConsent ? (
              <p className="text-sm text-[var(--forge-muted)]">
                Save an include title rule and select a default owner before confirming consent.
              </p>
            ) : null}
            {ownerSaved ? (
              <p className="text-sm text-[var(--forge-success)]">
                Default owner saved for this organization.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!available && !isConnected ? (
        <p className="mt-3 text-sm text-[color-mix(in_srgb,var(--forge-ember)_82%,transparent)]">
          Google Meet is disabled until ARGOS_GOOGLE_MEET_ENABLED is true and OAuth credentials are configured.
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-3 text-sm font-medium text-[var(--forge-danger)]" role="alert">
          {actionError}
        </p>
      ) : null}
      {syncRequested ? (
        <p className="mt-3 text-sm text-[var(--forge-muted)]" role="status">
          Sync queued. Eligible recordings from the seven-day backfill window will be re-evaluated.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            {!consentState ? (
              <ForgeButton
                disabled={isMutating || !canConfirmConsent}
                onClick={() => void handleConsent()}
                size="sm"
                type="button"
                variant="primary"
              >
                {isMutating ? "Confirming..." : "Confirm consent"}
              </ForgeButton>
            ) : (
              <ForgeButton
                disabled={isMutating || !canSync}
                onClick={() => void handleSync()}
                size="sm"
                type="button"
                variant="primary"
              >
                {isMutating ? "Queueing..." : "Sync now"}
              </ForgeButton>
            )}
            {confirmDisconnect ? (
              <>
                <p className="text-sm text-[var(--forge-muted)]">
                  {getDisconnectConfirmationCopy("google_meet")}
                </p>
                <ForgeButton
                  disabled={isMutating}
                  onClick={() => void handleDisconnect()}
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
            )}
          </>
        ) : (
          <ForgeButton
            disabled={!available}
            onClick={() => router.push(connectPath)}
            type="button"
            variant="primary"
          >
            Connect Google Meet
          </ForgeButton>
        )}
      </div>
    </ForgeSurface>
  );
}

async function getReadableActionError(
  response: Response,
  fallback = ghlActionFallback,
) {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    const message = [payload.message, payload.error].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    return typeof message === "string" ? message : fallback;
  } catch {
    return fallback;
  }
}

async function getSafeTitleFilterActionError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    const message = [payload.message, payload.error].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    return typeof message === "string" && isReadableDisconnectMessage(message)
      ? message
      : titleFilterSaveFallback;
  } catch {
    return titleFilterSaveFallback;
  }
}

type TitleFilterListEditorProps = {
  disabled: boolean;
  draft: string;
  kind: "include" | "exclude";
  onAdd: () => void;
  onDraftChange: (value: string) => void;
  onRemove: (index: number) => void;
  phrases: string[];
};

function TitleFilterListEditor({
  disabled,
  draft,
  kind,
  onAdd,
  onDraftChange,
  onRemove,
  phrases,
}: TitleFilterListEditorProps) {
  const label = kind === "include" ? "Include phrases" : "Exclude phrases";
  const inputId = `ingestion-title-${kind}`;

  return (
    <div className="min-w-0">
      <label
        className="block text-sm font-semibold text-[var(--forge-text)]"
        htmlFor={inputId}
      >
        {label}
      </label>
      <form
        className="mt-3 flex min-w-0 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <input
          className="min-h-10 min-w-0 flex-1 rounded-[8px] border border-[var(--forge-border)] bg-black/20 px-3 py-2 text-sm text-[var(--forge-text)] outline-none placeholder:text-[var(--forge-faint)] focus:border-[var(--forge-ember)]"
          disabled={disabled || phrases.length >= 50}
          id={inputId}
          maxLength={80}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={kind === "include" ? "Discovery call" : "Internal calibration"}
          value={draft}
        />
        <ForgeButton
          aria-label={`Add ${kind} phrase`}
          disabled={
            disabled || phrases.length >= 50 || !prepareIngestionTitleFilterPhrase(draft)
          }
          icon="add"
          size="sm"
          title={`Add ${kind} phrase`}
          type="submit"
          variant="secondary"
        >
          Add
        </ForgeButton>
      </form>
      <div className="mt-3 min-h-12 space-y-2">
        {phrases.length === 0 ? (
          <p className="py-2 text-sm text-[var(--forge-muted)]">No {kind} phrases.</p>
        ) : (
          phrases.map((phrase, index) => (
            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-[8px] border border-[var(--forge-border)] bg-black/10 px-3 py-2"
              key={`${phrase}-${index}`}
            >
              <span className="min-w-0 break-words text-sm text-[var(--forge-text)]">
                {phrase}
              </span>
              <ForgeButton
                aria-label={`Remove ${kind} phrase ${phrase}`}
                className="h-9 w-9 shrink-0 p-0"
                disabled={disabled}
                icon="close"
                onClick={() => onRemove(index)}
                size="sm"
                title={`Remove ${kind} phrase`}
                type="button"
                variant="ghost"
              >
                <span className="sr-only">Remove</span>
              </ForgeButton>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IngestionTitleRulesEditor({
  dispatchRulesState,
  rulesState,
  titleFilterEnforcementEnabled,
}: {
  dispatchRulesState: (action: IngestionTitleRulesAction) => void;
  rulesState: IngestionTitleRulesState;
  titleFilterEnforcementEnabled: boolean;
}) {
  const router = useRouter();
  const [includeDraft, setIncludeDraft] = useState("");
  const [excludeDraft, setExcludeDraft] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const preview = getIngestionTitlePreviewStatus(testTitle, rulesState.draftConfig);
  const previewLabel = getIngestionTitlePreviewLabel(
    !titleFilterEnforcementEnabled && preview.reason === "unconfigured"
      ? "Title filtering not enabled"
      : preview.label,
    rulesState.dirty,
  );

  function addPhrase(kind: "include" | "exclude") {
    const draft = kind === "include" ? includeDraft : excludeDraft;
    const phrase = prepareIngestionTitleFilterPhrase(draft);

    if (!phrase) {
      return;
    }

    if (kind === "include") {
      dispatchRulesState({ kind, phrase, type: "add" });
      setIncludeDraft("");
    } else {
      dispatchRulesState({ kind, phrase, type: "add" });
      setExcludeDraft("");
    }
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const result = await saveIngestionTitleFiltersFromBrowser(
      rulesState.draftConfig,
    );

    if (result.ok) {
      dispatchRulesState({ config: result.data, type: "saved" });
      setSaveMessage(
        !titleFilterEnforcementEnabled
          ? "Title rules saved. Title filtering remains disabled until rollout is enabled."
          : result.data.configured
          ? "Title rules saved. Automatic ingestion is ready."
          : "Title rules saved. Automatic ingestion is paused.",
      );
      router.refresh();
    } else {
      setSaveError(result.error);
    }

    setIsSaving(false);
  }

  return (
    <ForgeSurface
      as="section"
      className="p-6"
      data-ingestion-title-rules="true"
      variant="panel"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--forge-muted)]">Auto-ingestion</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
            Auto-ingestion title rules
          </h2>
        </div>
        <SettingsStatus
          label={
            !titleFilterEnforcementEnabled
              ? "Rollout pending"
              : rulesState.savedConfig.configured
                ? "Auto-ingestion ready"
                : "Auto-ingestion paused"
          }
          tone={
            titleFilterEnforcementEnabled && rulesState.savedConfig.configured
              ? "success"
              : "ember"
          }
        />
      </div>

      {!titleFilterEnforcementEnabled ? (
        <p className="mt-3 text-sm font-medium text-[color-mix(in_srgb,var(--forge-ember)_82%,transparent)]">
          Title filtering not enabled. Saved rules will remain inactive until the rollout is enabled.
        </p>
      ) : !rulesState.savedConfig.configured ? (
        <p className="mt-3 text-sm font-medium text-[color-mix(in_srgb,var(--forge-ember)_82%,transparent)]">
          Auto-ingestion paused until at least one include phrase is saved.
        </p>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <TitleFilterListEditor
          disabled={isSaving}
          draft={includeDraft}
          kind="include"
          onAdd={() => addPhrase("include")}
          onDraftChange={setIncludeDraft}
          onRemove={(index) => {
            dispatchRulesState({ index, kind: "include", type: "remove" });
            setSaveError(null);
            setSaveMessage(null);
          }}
          phrases={rulesState.draftConfig.includePhrases}
        />
        <TitleFilterListEditor
          disabled={isSaving}
          draft={excludeDraft}
          kind="exclude"
          onAdd={() => addPhrase("exclude")}
          onDraftChange={setExcludeDraft}
          onRemove={(index) => {
            dispatchRulesState({ index, kind: "exclude", type: "remove" });
            setSaveError(null);
            setSaveMessage(null);
          }}
          phrases={rulesState.draftConfig.excludePhrases}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 border-t border-[var(--forge-border)] pt-6 md:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)] md:items-end">
        <div className="min-w-0">
          <label
            className="block text-sm font-semibold text-[var(--forge-text)]"
            htmlFor="ingestion-title-preview"
          >
            Test a title
          </label>
          <input
            className="mt-3 min-h-10 w-full rounded-[8px] border border-[var(--forge-border)] bg-black/20 px-3 py-2 text-sm text-[var(--forge-text)] outline-none placeholder:text-[var(--forge-faint)] focus:border-[var(--forge-ember)]"
            id="ingestion-title-preview"
            onChange={(event) => setTestTitle(event.target.value)}
            placeholder="Paste a meeting title"
            value={testTitle}
          />
        </div>
        <div
          aria-live="polite"
          className="flex min-h-10 items-center gap-2 rounded-[8px] border border-[var(--forge-border)] bg-black/10 px-3 py-2 text-sm font-medium text-[var(--forge-text)]"
          data-ingestion-title-preview={preview.reason}
        >
          <ForgeIcon
            className={preview.accepted ? "text-[var(--forge-success)]" : "text-[var(--forge-ember)]"}
            name={preview.accepted ? "check_circle" : preview.reason === "unconfigured" ? "cloud_off" : "error"}
          />
          <span>{previewLabel}</span>
        </div>
      </div>

      {saveError ? (
        <p className="mt-4 text-sm font-medium text-[var(--forge-danger)]" role="alert">
          {saveError}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="mt-4 text-sm font-medium text-[var(--forge-success)]" role="status">
          {saveMessage}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <ForgeButton
          disabled={isSaving}
          icon="check"
          onClick={() => {
            void handleSave();
          }}
          type="button"
          variant="primary"
        >
          {isSaving ? "Saving..." : "Save title rules"}
        </ForgeButton>
      </div>
    </ForgeSurface>
  );
}

export function IntegrationsPanel({
  titleFilterEnforcementEnabled,
  titleFilters,
  zoom,
  ghl,
  googleMeet,
}: IntegrationsPanelProps) {
  const [rulesState, dispatchRulesState] = useReducer(
    ingestionTitleRulesReducer,
    titleFilters,
    createIngestionTitleRulesState,
  );

  return (
    <div className="space-y-5">
      <IngestionTitleRulesEditor
        dispatchRulesState={dispatchRulesState}
        rulesState={rulesState}
        titleFilterEnforcementEnabled={titleFilterEnforcementEnabled}
      />
      <ZoomCard
        autoIngestionConfigured={rulesState.savedConfig.configured}
        available={zoom.available}
        connectPath={zoom.connectPath}
        connected={zoom.connected}
        connectedAt={zoom.connectedAt}
        disconnectPath={zoom.disconnectPath}
        titleFilterEnforcementEnabled={titleFilterEnforcementEnabled}
        zoomUserId={zoom.zoomUserId}
      />
      <GoogleMeetCard
        autoIngestionConfigured={rulesState.savedConfig.configured}
        available={googleMeet.available}
        connectPath={googleMeet.connectPath}
        connected={googleMeet.connected}
        connectedAt={googleMeet.connectedAt}
        consentConfirmedAt={googleMeet.consentConfirmedAt}
        defaultRepId={googleMeet.defaultRepId}
        disconnectPath={googleMeet.disconnectPath}
        fallbackOwnerOptions={googleMeet.fallbackOwnerOptions}
        googleEmail={googleMeet.googleEmail}
        lastSyncCompletedAt={googleMeet.lastSyncCompletedAt}
        lastSyncError={googleMeet.lastSyncError}
        lastSyncStartedAt={googleMeet.lastSyncStartedAt}
        syncEnabled={googleMeet.syncEnabled}
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
