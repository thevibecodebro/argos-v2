import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { UploadCallPanel } from "@/components/panel-loaders/upload-call-panel-loader";

export default function UploadPage() {
  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-upload-route="capture-workflow">
        <OperationalToolbar
          actions={[{ href: "/calls", icon: "subject", label: "View call library", variant: "secondary" }]}
          description="Upload a call recording, run the scoring flow, and jump directly into the generated detail page."
          eyebrow="Capture"
          title="Upload Call"
        />
        <OperationalMetricStrip
          metrics={[
            {
              icon: "upload_file",
              label: "Choose recording",
              tone: "gold",
              value: "Select file",
            },
            {
              icon: "edit_note",
              label: "Add call context",
              tone: "muted",
              value: "Name call",
            },
            {
              icon: "query_stats",
              label: "Upload and analyze",
              tone: "cyan",
              value: "Scorecard",
            },
            {
              icon: "arrow_outward",
              label: "Destination",
              tone: "success",
              value: "Call detail",
            },
          ]}
        />
        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <UploadCallPanel />
          </div>
          <OperationalPreviewDrawer
            actions={[{ href: "/calls", icon: "subject", label: "Open call library", variant: "secondary" }]}
            description="Keep uploads predictable: choose a supported recording, name it clearly, then let Argos prepare the review."
            eyebrow="Readiness"
            title="Upload readiness"
          >
            <div className="grid gap-2 text-sm">
              <ReadinessRow label="Accepted files" value="MP3, WAV, M4A, MP4, WebM" />
              <ReadinessRow label="Required context" value="Call name" />
              <ReadinessRow label="After upload" value="Analysis queue" />
              <ReadinessRow label="Next view" value="Call detail" />
            </div>
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function ReadinessRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="text-right font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
