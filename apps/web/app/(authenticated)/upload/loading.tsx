import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading the call upload flow and analysis setup."
      eyebrow="Capture"
      lines={3}
      size="standard"
      title="Upload call"
    />
  );
}
