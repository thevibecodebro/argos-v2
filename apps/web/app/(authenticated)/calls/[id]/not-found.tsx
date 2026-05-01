import { AuthenticatedRouteNotFound } from "@/components/authenticated-route-state";

export default function NotFound() {
  return (
    <AuthenticatedRouteNotFound
      actionHref="/calls"
      actionLabel="Back to call library"
      description="This call is unavailable in your current workspace or has not finished creating review data."
      eyebrow="Review bench"
      icon="call_log"
      size="wide"
      title="Call review"
    />
  );
}
