import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading scored calls, status, and rep ownership."
      eyebrow="Recordings"
      lines={5}
      size="wide"
      title="Recordings"
    />
  );
}
