"use client";

import { useEffect } from "react";
import { AuthenticatedRouteError } from "@/components/authenticated-route-state";

export default function AuthenticatedError({
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
      description="The authenticated workspace hit a recoverable rendering error."
      error={error}
      eyebrow="Sales forge"
      reset={reset}
      size="wide"
      title="Workspace"
    />
  );
}
