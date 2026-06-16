import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading dashboard attention queue."
      eyebrow="Dashboard"
      lines={5}
      size="standard"
      title="Dashboard"
    />
  );
}
