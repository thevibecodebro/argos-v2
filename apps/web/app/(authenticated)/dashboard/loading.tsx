import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading performance, coaching focus, and training progress."
      eyebrow="Dashboard"
      lines={5}
      size="standard"
      title="Dashboard"
    />
  );
}
