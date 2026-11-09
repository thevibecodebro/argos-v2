"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeIcon } from "@/components/forge";
import styles from "./configuration-panels.module.css";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
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

    const payload = (await response.json()) as {
      consentedAt?: string;
      error?: string;
    };

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
    <div className={styles.root} data-settings-compliance="true">
      <section className={styles.section} aria-labelledby="recording-consent-title">
        <h2 className={styles.heading} id="recording-consent-title">Recording consent</h2>
        <p className={styles.description}>
          Acknowledge the recording policy before importing calls. Your organization is responsible for obtaining valid participant consent.
        </p>
        {consentMode ? (
          <dl className="mt-5 text-sm">
            <dt className="text-[var(--forge-muted)]">Consent mode</dt>
            <dd className="mt-1 capitalize">{consentMode}</dd>
          </dl>
        ) : null}
        <div className={styles.notice}>
          <ForgeIcon
            className={hasConsented ? "mt-0.5 shrink-0 text-[var(--forge-success)]" : "mt-0.5 shrink-0 text-[var(--forge-ember)]"}
            name={hasConsented ? "check_circle" : "warning"}
            size={20}
          />
          <div>
            <p className="text-sm font-medium text-[var(--forge-text)]">
              {hasConsented ? "Recording consent acknowledged" : "Recording consent not yet acknowledged"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">
              {hasConsented
                ? acknowledgedByName
                  ? `Acknowledged by ${acknowledgedByName} on ${formatDate(consentedAt) ?? "recently"}.`
                  : `Last acknowledged ${formatDate(consentedAt) ?? "recently"}.`
                : "An organization admin must acknowledge the policy before automatic call imports can run."}
            </p>
            {hasConsented ? <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">Re-acknowledge when your recording policy or applicable laws change.</p> : null}
          </div>
        </div>
        <p className="mb-5 text-xs leading-6 text-[var(--forge-muted)]">
          Recording without valid consent may violate applicable wiretapping and privacy laws. Consult your legal team before enabling recording.
        </p>
        {error ? <p className="mb-4 text-sm text-[var(--forge-danger)]" role="alert">{error}</p> : null}
        <ForgeButton disabled={isUpdating} onClick={() => void acknowledgeConsent()} size="sm" type="button" variant="secondary">
          {isUpdating ? "Updating..." : hasConsented ? "Re-acknowledge consent policy" : "Acknowledge consent policy"}
        </ForgeButton>
        <p aria-live="polite" className="sr-only" role="status">{isUpdating ? "Updating recording consent." : hasConsented ? "Recording consent acknowledged." : ""}</p>
      </section>
      <section className={styles.section} aria-labelledby="auto-ingest-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={styles.heading} id="auto-ingest-title">Auto-ingest status</h2>
          <span className="inline-flex items-center gap-2 text-sm text-[var(--forge-text)]">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${recordingEnabled && hasConsented ? "bg-[var(--forge-success)]" : "bg-[var(--forge-muted)]"}`} />
            {recordingEnabled && hasConsented ? "Active" : "Inactive"}
          </span>
        </div>
        <p className={styles.description}>
          {recordingEnabled && hasConsented
            ? "Recordings are being ingested automatically."
            : "Automatic call imports are not running."}
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--forge-muted)]">
          Auto-ingest requires a connected integration, recording sync, and an acknowledged consent policy. Acknowledging this policy alone does not enable imports.
        </p>
        <p className="mt-2 text-xs leading-6 text-[var(--forge-muted)]">Existing recordings are retained when automatic imports stop.</p>
      </section>
    </div>
  );
}
