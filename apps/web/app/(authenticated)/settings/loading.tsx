import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return <AuthenticatedRouteLoading contained description="Loading account, people, teams, integrations, compliance, and rubric controls." eyebrow="Settings" lines={4} title="Settings" variant="form" />;
}
