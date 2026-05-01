import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading scored calls, processing status, rep ownership, and coaching readiness."
      eyebrow="Call intake"
      lines={5}
      size="wide"
      title="Call library"
    />
  );
}
