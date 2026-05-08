"use client";

import { useEffect } from "react";
import { AuthenticatedRouteError } from "@/components/authenticated-route-error";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthenticatedRouteError
      description="Review team performance with week-over-week trend, call volume, and coaching flags."
      error={error}
      eyebrow="Team"
      reset={reset}
      title="Team"
    />
  );
}
