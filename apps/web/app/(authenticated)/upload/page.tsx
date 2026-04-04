import { PageFrame } from "@/components/page-frame";
import { UploadCallPanel } from "@/components/upload-call-panel";

export default function UploadPage() {
  return (
    <PageFrame
      actions={[{ href: "/calls", label: "View call library" }]}
      description="Upload a call recording, run the scoring flow, and jump directly into the generated detail page."
      eyebrow="Capture"
      title="Upload Call"
    >
      <UploadCallPanel />
    </PageFrame>
  );
}
