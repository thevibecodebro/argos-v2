import { AuthenticatedRouteLoading } from "@/components/authenticated-route-state";

export default function Loading() {
  return (
    <AuthenticatedRouteLoading
      description="Loading product activity notifications and unread status."
      eyebrow="Inbox"
      lines={3}
      size="standard"
      title="Notifications"
    />
  );
}
