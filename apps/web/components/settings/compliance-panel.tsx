"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeIcon, ForgeSurface } from "@/components/forge";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export type CompliancePanelProps = {
  consentMode: string | null;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  recordingEnabled: boolean;
};

export function CompliancePanel({
  consentMode,
  acknowledgedAt,
  acknowledgedByName,
  recordingEnabled,
}: CompliancePanelProps) {
  const router = useRouter();
  const [hasConsented, setHasConsented] = useState(Boolean(acknowledgedAt));
  const [consentedAt, setConsentedAt] = useState<string | null>(acknowledgedAt);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledgeConsent() {
    setError(null);
    setIsUpdating(true);

    const response = await fetch("/api/compliance/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "recording_consent_acknowledged",
        tosVersion: "2026-04-03-replit-parity",
        metadata: { source: "settings" },
      }),
    });

    const payload = (await response.json()) as { consentedAt?: string; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to update compliance status");
      setIsUpdating(false);
      return;
    }

    setHasConsented(true);
    setConsentedAt(payload.consentedAt ?? new Date().toISOString());
    setIsUpdating(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Consent status card */}
      <ForgeSurface as="section" className="p-6" variant="panel">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Recording Consent
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
          Acknowledge the call-recording consent requirement before auto-ingesting or reviewing
          recorded conversations. Recording without valid consent may violate applicable federal,
          state, or international wiretapping and privacy laws.
        </p>

        {consentMode ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                Consent Mode
              </p>
              <p className="mt-1 text-sm font-medium capitalize text-[var(--forge-text)]">{consentMode}</p>
            </div>
          </div>
        ) : null}

        {hasConsented ? (
          <div className="mt-5 rounded-xl border border-[rgba(139,215,168,0.24)] bg-[rgba(139,215,168,0.1)] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(139,215,168,0.36)] bg-[rgba(139,215,168,0.18)] text-[var(--forge-success)]">
                <ForgeIcon name="check_circle" size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--forge-success)]">
                  Recording consent acknowledged
                </p>
                <p className="mt-1.5 text-sm text-[rgba(139,215,168,0.82)]">
                  {acknowledgedByName
                    ? `Acknowledged by ${acknowledgedByName} on ${formatDate(consentedAt) ?? "recently"}.`
                    : `Last acknowledged ${formatDate(consentedAt) ?? "recently"}.`}
                </p>
                <p className="mt-1 text-xs text-[rgba(139,215,168,0.5)]">
                  Re-acknowledgment is required whenever your recording policy or applicable laws
                  change.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[rgba(255,159,95,0.22)] bg-[rgba(255,159,95,0.06)] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(255,159,95,0.36)] bg-[rgba(255,159,95,0.14)] text-[var(--forge-ember)]">
                <ForgeIcon name="warning" size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--forge-ember)]">
                  Recording consent not yet acknowledged
                </p>
                <p className="mt-1.5 text-sm text-[var(--forge-ember)]/80">
                  An org admin must acknowledge the recording policy before call auto-ingest is
                  enabled. Without acknowledgment, recordings may be collected without valid
                  participant consent.
                </p>
                <p className="mt-2 text-xs text-[var(--forge-muted)]">
                  Recordings without valid consent may violate applicable laws. Consult your legal
                  team before enabling call recording.
                </p>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-[var(--forge-danger)]">{error}</p>
        ) : null}

        <div className="mt-5">
          <ForgeButton
            disabled={isUpdating}
            onClick={() => void acknowledgeConsent()}
            size="sm"
            type="button"
            variant="secondary"
          >
            {isUpdating
              ? "Updating..."
              : hasConsented
                ? "Re-acknowledge consent policy"
                : "Acknowledge consent policy"}
          </ForgeButton>
        </div>
      </ForgeSurface>

      {/* Recording status card */}
      <ForgeSurface as="section" className="p-6" variant="panel">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Auto-Ingest Status
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--forge-muted)]">
          Automatic call ingestion pulls recordings directly from your connected integrations (e.g.
          Zoom). It is only active when recording consent has been acknowledged.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
          <span
            className={[
              "h-2 w-2 shrink-0 rounded-full",
              recordingEnabled && hasConsented
                ? "bg-[var(--forge-success)]"
                : "bg-[rgba(255,244,230,0.46)]",
            ].join(" ")}
          />
          <div>
            <p className="text-sm font-medium text-[var(--forge-text)]">
              {recordingEnabled && hasConsented
                ? "Active — recordings are being ingested automatically"
                : "Inactive — auto-ingest is not running"}
            </p>
            {!hasConsented && (
              <p className="mt-0.5 text-xs text-[var(--forge-muted)]">
                Acknowledge the consent policy above to activate auto-ingest.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--forge-muted)]">
          Auto-ingest requires both a connected integration and an acknowledged consent policy.
          Disabling auto-ingest does not delete existing recordings.
        </p>
      </ForgeSurface>
    </div>
  );
}
