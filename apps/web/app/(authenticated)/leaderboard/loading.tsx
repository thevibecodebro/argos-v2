import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading rank, score quality, call volume, and team improvement data."
      eyebrow="Performance"
      lines={4}
      size="standard"
      title="Leaderboard"
    />
  );
}
