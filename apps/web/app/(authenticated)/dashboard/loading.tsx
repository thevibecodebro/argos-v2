import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading performance, coaching focus, training progress, and workspace activity."
      eyebrow="Operating pulse"
      lines={5}
      size="standard"
      title="Dashboard"
    />
  );
}
