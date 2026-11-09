"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { entryStyles } from "@/components/auth/entry-surface";

export function InviteAcceptButton({
  autoAccept = false,
  token,
}: {
  autoAccept?: boolean;
  token: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAcceptStarted = useRef(false);

  const handleAccept = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to accept invite.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }, [router, token]);

  useEffect(() => {
    if (!autoAccept || autoAcceptStarted.current) {
      return;
    }

    autoAcceptStarted.current = true;
    void handleAccept();
  }, [autoAccept, handleAccept]);

  const showPassiveState = autoAccept && !error;

  return (
    <div data-auto-accept={autoAccept ? "true" : undefined}>
      {showPassiveState ? (
        <p
          aria-live="polite"
          className="text-sm font-medium text-[var(--forge-muted)]"
          role="status"
        >
          Joining your workspace...
        </p>
      ) : (
        <button
          className={`${entryStyles.primary} forge-focus-ring`}
          disabled={loading}
          onClick={handleAccept}
          type="button"
        >
          {loading ? "Accepting..." : "Accept invite"}
        </button>
      )}
      {error ? <p className="mt-3 text-sm text-[var(--forge-danger)]" role="alert">{error}</p> : null}
    </div>
  );
}
