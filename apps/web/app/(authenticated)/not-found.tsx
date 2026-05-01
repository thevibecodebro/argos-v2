import { AuthenticatedRouteNotFound } from "@/components/authenticated-route-state";

export default function NotFound() {
  return (
    <AuthenticatedRouteNotFound
      actionHref="/dashboard"
      actionLabel="Back to dashboard"
      description="This workspace route does not exist or is not available for your current account."
      eyebrow="Sales forge"
      icon="search"
      size="wide"
      title="Workspace route"
    />
  );
}
