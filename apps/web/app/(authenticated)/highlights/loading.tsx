import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading saved coaching moments and recommendations."
      eyebrow="Highlights"
      lines={4}
      size="standard"
      title="Highlights"
    />
  );
}
