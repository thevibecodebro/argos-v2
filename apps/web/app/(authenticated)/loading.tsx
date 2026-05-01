import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading the authenticated Argos workspace."
      eyebrow="Sales forge"
      lines={5}
      size="wide"
      title="Workspace"
    />
  );
}
