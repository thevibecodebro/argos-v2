import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading starred coaching moments, recommendations, and recurring patterns."
      eyebrow="Highlights"
      lines={4}
      size="standard"
      title="Coaching evidence"
    />
  );
}
