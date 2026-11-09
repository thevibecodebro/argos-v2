import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { UploadWorkspace } from "@/components/upload-workspace";
import { UploadCallPanel } from "@/components/panel-loaders/upload-call-panel-loader";
import { notFound } from "next/navigation";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function UploadPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) notFound();
  await requireManagedCapabilityForPage(authUser.id, "call_upload");

  return <AuthenticatedPageContainer><UploadWorkspace><UploadCallPanel /></UploadWorkspace></AuthenticatedPageContainer>;
}
