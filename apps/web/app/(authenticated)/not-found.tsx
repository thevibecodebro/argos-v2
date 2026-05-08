import { AuthenticatedRouteNotFound } from "@/components/authenticated-route-state";

export default function NotFound() {
  return (
    <AuthenticatedRouteNotFound
      actionHref="/dashboard"
      actionLabel="Back to dashboard"
      description="This page does not exist or is not available for your account."
      eyebrow="Argos"
      icon="search"
      size="wide"
      title="Page not found"
    />
  );
}
