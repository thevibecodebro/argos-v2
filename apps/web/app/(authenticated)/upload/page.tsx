import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { UploadCallPanel } from "@/components/panel-loaders/upload-call-panel-loader";
import { notFound } from "next/navigation";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function UploadPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) notFound();
  await requireManagedCapabilityForPage(authUser.id, "call_upload");

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
