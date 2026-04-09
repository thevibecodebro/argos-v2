"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Recording Consent
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Acknowledge the call-recording consent requirement before auto-ingesting or reviewing
          recorded conversations. Recording without valid consent may violate applicable federal,
          state, or international wiretapping and privacy laws.
        </p>

        {consentMode ? (
          <div className="mt-4 flex items-center gap-3 rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Consent Mode
              </p>
              <p className="mt-1 text-sm font-medium capitalize text-slate-300">{consentMode}</p>
            </div>
          </div>
        ) : null}

        {hasConsented ? (
          <div className="mt-5 rounded-[1.2rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-xs">
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Recording consent acknowledged
                </p>
                <p className="mt-1.5 text-sm text-emerald-100/80">
                  {acknowledgedByName
                    ? `Acknowledged by ${acknowledgedByName} on ${formatDate(consentedAt) ?? "recently"}.`
                    : `Last acknowledged ${formatDate(consentedAt) ?? "recently"}.`}
                </p>
                <p className="mt-1 text-xs text-emerald-100/50">
                  Re-acknowledgment is required whenever your recording policy or applicable laws
                  change.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-amber-500/20 bg-amber-500/5 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-bold">
                !
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Recording consent not yet acknowledged
                </p>
                <p className="mt-1.5 text-sm text-amber-100/80">
                  An org admin must acknowledge the recording policy before call auto-ingest is
                  enabled. Without acknowledgment, recordings may be collected without valid
                  participant consent.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Recordings without valid consent may violate applicable laws. Consult your legal
                  team before enabling call recording.
                </p>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-5">
          <button
            className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
            disabled={isUpdating}
            onClick={() => void acknowledgeConsent()}
            type="button"
          >
            {isUpdating
              ? "Updating..."
              : hasConsented
                ? "Re-acknowledge consent policy"
                : "Acknowledge consent policy"}
          </button>
        </div>
      </section>

      {/* Recording status card */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Auto-Ingest Status
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Automatic call ingestion pulls recordings directly from your connected integrations (e.g.
          Zoom). It is only active when recording consent has been acknowledged.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
          <span
            className={[
              "h-2 w-2 shrink-0 rounded-full",
              recordingEnabled && hasConsented
                ? "bg-emerald-400"
                : "bg-slate-600",
            ].join(" ")}
          />
          <div>
            <p className="text-sm font-medium text-slate-300">
              {recordingEnabled && hasConsented
                ? "Active — recordings are being ingested automatically"
                : "Inactive — auto-ingest is not running"}
            </p>
            {!hasConsented && (
              <p className="mt-0.5 text-xs text-slate-500">
                Acknowledge the consent policy above to activate auto-ingest.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Auto-ingest requires both a connected integration and an acknowledged consent policy.
          Disabling auto-ingest does not delete existing recordings.
        </p>
      </section>
    </div>
  );
}
