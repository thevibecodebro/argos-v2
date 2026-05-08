import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading team performance, week-over-week trend, call volume, and coaching flags."
      eyebrow="Team"
      lines={5}
      size="standard"
      title="Team"
    />
  );
}
