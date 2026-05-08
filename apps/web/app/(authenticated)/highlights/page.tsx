import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeIcon,
} from "@/components/forge";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";

export default async function HighlightsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const result = authUser
    ? await listHighlights(createCallsRepository(), authUser.id)
    : null;
  const highlights = result?.ok ? result.data.highlights : [];

  const categoryCounts: Record<string, number> = {};
  for (const highlight of highlights) {
    const category = highlight.category ?? "Highlight";
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const withRecommendation = highlights.filter((highlight) => highlight.recommendation).length;
  const completeness =
    highlights.length > 0
      ? Math.round((withRecommendation / highlights.length) * 100)
      : null;
  const selectedHighlight = highlights[0] ?? null;

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace
        data-highlights-layout="evidence-inbox"
        data-highlights-surface="operational-evidence"
      >
        <OperationalToolbar
          actions={[{ href: "/calls", label: "Back to call library", variant: "secondary" }]}
          description="Review saved coaching moments and recommendations."
          eyebrow="Review"
          status={{ icon: "auto_awesome", label: `${highlights.length} items`, tone: "muted" }}
          title="Highlights"
        />

        <OperationalMetricStrip
          metrics={[
            {
              icon: "auto_awesome",
              label: "Saved moments",
              tone: "gold",
              value: highlights.length,
            },
            {
              icon: "insights",
              label: "Top pattern",
              tone: "cyan",
              value: topCategory ?? "None yet",
            },
            {
              icon: "task_alt",
              label: "With recommendations",
              tone: completeness !== null && completeness >= 80 ? "success" : "gold",
              value: completeness !== null ? `${completeness}%` : "--",
            },
            {
              icon: "subject",
              label: "With guidance",
              tone: withRecommendation > 0 ? "success" : "muted",
              value: withRecommendation,
            },
          ]}
        />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className="min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.88)] shadow-[inset_0_1px_0_rgba(255,244,230,0.04)]"
            data-forge-table="true"
            data-highlights-library="operational-table"
          >
            <div className="border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    Saved moments
                  </p>
                  <p className="mt-1 text-sm text-[var(--forge-muted)]">
                    Open the source call for transcript context and scorecard notes.
                  </p>
                </div>
                <ForgeChip tone="muted">
                  {highlights.length} {highlights.length === 1 ? "item" : "items"}
                </ForgeChip>
              </div>
            </div>

            {highlights.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                      <th className="px-4 py-3" scope="col">Type</th>
                      <th className="px-4 py-3" scope="col">Observation</th>
                      <th className="px-4 py-3" scope="col">Recommendation</th>
                      <th className="px-4 py-3" scope="col">Source</th>
                      <th className="px-4 py-3 text-right" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {highlights.map((highlight, index) => (
                      <tr
                        className="transition hover:bg-[rgba(241,191,123,0.045)]"
                        data-highlight-row={index === 0 ? "selected" : "default"}
                        key={highlight.id}
                      >
                        <td className="px-4 py-4 align-top">
                          <ForgeChip tone={index === 0 ? "gold" : "cyan"}>
                            {highlight.category ?? "Highlight"}
                            {highlight.severity ? ` · ${highlight.severity}` : ""}
                          </ForgeChip>
                        </td>
                        <td className="max-w-[280px] px-4 py-4 align-top text-sm font-semibold leading-5 text-[var(--forge-text)]">
                          <p className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                            {highlight.observation ?? "No observation recorded."}
                          </p>
                        </td>
                        <td className="max-w-[300px] px-4 py-4 align-top text-sm leading-5 text-[var(--forge-muted)]">
                          <p className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                            {highlight.recommendation ?? "No recommendation yet."}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-[var(--forge-muted)]">
                          <div className="max-w-[220px] truncate">
                            {highlight.callTopic ?? "Source call"}
                          </div>
                          <p className="mt-1 text-xs">{formatTimestamp(highlight.callCreatedAt)}</p>
                        </td>
                        <td className="px-4 py-4 text-right align-top">
                          <ForgeButton
                            href={`/calls/${highlight.callId}`}
                            size="sm"
                            trailingIcon="arrow_forward"
                            variant="secondary"
                          >
                            Open call
                          </ForgeButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <ForgeEmptyState
                  description="Managers can star moments from a call detail page to build a reusable coaching library here."
                  icon="auto_awesome"
                  title="No highlights yet"
                />
              </div>
            )}
          </div>

          <OperationalPreviewDrawer
            actions={
              selectedHighlight
                ? [{ href: `/calls/${selectedHighlight.callId}`, label: "Open call", variant: "primary" }]
                : [{ href: "/calls", label: "Open call library", variant: "secondary" }]
            }
            description={
              selectedHighlight?.recommendation ??
              "Select an evidence row to inspect its recommendation and source call."
            }
            eyebrow="Selected evidence"
            title={selectedHighlight?.category ?? "No evidence selected"}
          >
            {selectedHighlight ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.66)] p-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    Observation
                  </p>
                  <p className="mt-2 text-sm leading-5 text-[var(--forge-text)]">
                    {selectedHighlight.observation}
                  </p>
                </div>
                {selectedHighlight.highlightNote ? (
                  <div className="rounded-lg border border-[rgba(255,159,95,0.24)] bg-[rgba(255,159,95,0.06)] p-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-ember)]">
                      Manager note
                    </p>
                    <p className="mt-2 text-sm leading-5 text-[var(--forge-text)]">
                      {selectedHighlight.highlightNote}
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-sm text-[var(--forge-muted)]">
                  <ForgeIcon name="subject" size={16} />
                  <span className="min-w-0 truncate">
                    {selectedHighlight.callTopic ?? "Source call"}
                  </span>
                </div>
              </div>
            ) : null}
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No source date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
