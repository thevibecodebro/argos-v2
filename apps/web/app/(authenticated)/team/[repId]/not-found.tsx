import { AuthenticatedRouteNotFound } from "@/components/authenticated-route-state";

export default function NotFound() {
  return (
    <AuthenticatedRouteNotFound
      actionHref="/team"
      actionLabel="Back to team"
      description="The selected rep is unavailable in your current team view or does not have profile data yet."
      eyebrow="Coaching"
      icon="person_search"
      size="standard"
      title="Rep profile"
    />
  );
}
