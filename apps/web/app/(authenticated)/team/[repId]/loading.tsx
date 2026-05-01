import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading score trends, focus categories, badges, and recent calls for this rep."
      eyebrow="Coaching"
      lines={5}
      size="standard"
      title="Rep profile"
    />
  );
}
