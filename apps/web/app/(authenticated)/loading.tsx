import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading Argos."
      eyebrow="Argos"
      lines={5}
      size="wide"
      title="Loading"
    />
  );
}
