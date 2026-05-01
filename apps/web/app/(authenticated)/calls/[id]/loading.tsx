import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading the transcript, scorecard, coaching moments, and call review tools."
      eyebrow="Review bench"
      lines={6}
      size="wide"
      title="Call review"
    />
  );
}
