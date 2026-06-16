import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
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
          description="Upload a call recording, name it clearly, and send it into analysis."
          eyebrow="Capture"
          title="Upload Call"
        />
        <section className="min-w-0">
          <div className="min-w-0">
            <UploadCallPanel />
          </div>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
