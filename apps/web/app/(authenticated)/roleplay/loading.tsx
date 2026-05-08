import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading personas, practice sessions, transcripts, and scorecards."
      eyebrow="Roleplay"
      lines={5}
      size="wide"
      title="Roleplay"
    />
  );
}
