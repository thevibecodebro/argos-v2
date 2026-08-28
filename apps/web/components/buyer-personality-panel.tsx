"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeErrorState, ForgeSurface } from "@/components/forge";
import type { BuyerPersonalityProfile } from "@argos-v2/call-processing";

export function BuyerPersonalityPanel({
  callId,
  profile,
  status,
  speakerLabels,
  speakerSamples,
}: {
  callId: string;
  profile: BuyerPersonalityProfile | null;
  status: string | null;
  speakerLabels: string[];
  speakerSamples?: Record<string, string[]>;
}) {
  const router = useRouter();
  const [selectedSpeaker, setSelectedSpeaker] = useState(profile?.buyerSpeakerLabels[0] ?? speakerLabels[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmBuyerSpeaker() {
    if (!selectedSpeaker) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/calls/${callId}/buyer-personality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerSpeakerLabel: selectedSpeaker }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to rebuild the buyer personality.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to rebuild the buyer personality.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)]" data-buyer-personality-panel="true">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--forge-text)]">Buyer Personality</h2>
          <p className="mt-1 text-sm text-[var(--forge-muted)]">An anonymized behavior profile used to make generated roleplays realistic.</p>
        </div>
        <ForgeChip tone={status === "ready" ? "success" : status === "needs_review" ? "ember" : "muted"}>
          {status === "needs_review" ? "Needs speaker review" : status ?? "Pending"}
        </ForgeChip>
      </div>
      <div className="space-y-4 p-4">
        {profile ? (
          <>
            <p className="text-sm leading-6 text-[var(--forge-text)]">{profile.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileList title="Motivations" values={profile.motivations} />
              <ProfileList title="Concerns" values={profile.concerns} />
              <ProfileList title="Decision criteria" values={profile.decisionCriteria} />
              <ProfileList title="Objections" values={profile.objections.map((item) => item.topic)} />
            </div>
            <ForgeSurface className="p-3 text-sm text-[var(--forge-muted)]" variant="inset">
              Directness {profile.communicationStyle.directness} · Warmth {profile.communicationStyle.warmth} · Skepticism {profile.communicationStyle.skepticism} · Decision style {profile.communicationStyle.decisionStyle}
            </ForgeSurface>
          </>
        ) : (
          <p className="text-sm text-[var(--forge-muted)]">The recording is still being prepared, or the profile could not be loaded.</p>
        )}

        {status === "needs_review" && speakerLabels.length ? (
          <div className="space-y-3 rounded-lg border border-[var(--forge-border)] p-3">
            <label className="block text-sm font-semibold text-[var(--forge-text)]">
              Which speaker is the buyer?
              <select className="mt-2 w-full rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 py-2" onChange={(event) => setSelectedSpeaker(event.target.value)} value={selectedSpeaker}>
                {speakerLabels.map((speaker) => <option key={speaker} value={speaker}>{speaker}</option>)}
              </select>
            </label>
            {(speakerSamples?.[selectedSpeaker] ?? []).length ? (
              <div className="space-y-2 text-sm text-[var(--forge-muted)]">
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">Transcript samples</p>
                {(speakerSamples?.[selectedSpeaker] ?? []).slice(0, 2).map((sample, index) => (
                  <blockquote className="border-l-2 border-[var(--forge-border)] pl-3" key={`${selectedSpeaker}-${index}`}>{sample}</blockquote>
                ))}
              </div>
            ) : null}
            <ForgeButton disabled={busy || !selectedSpeaker} onClick={() => void confirmBuyerSpeaker()} size="sm" type="button" variant="primary">
              {busy ? "Rebuilding..." : "Confirm buyer speaker"}
            </ForgeButton>
          </div>
        ) : null}
        {error ? <ForgeErrorState description={error} title="Buyer profile update failed" /> : null}
      </div>
    </section>
  );
}

function ProfileList({ title, values }: { title: string; values: string[] }) {
  return <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">{title}</h3><ul className="mt-2 space-y-1 text-sm text-[var(--forge-text)]">{values.length ? values.map((value) => <li key={value}>• {value}</li>) : <li className="text-[var(--forge-muted)]">No evidence found</li>}</ul></div>;
}
