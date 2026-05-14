"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
          className="rounded-lg border border-[rgba(241,191,123,0.24)] bg-[rgba(241,191,123,0.08)] px-4 py-3 text-sm font-semibold text-[var(--forge-gold)]"
          role="status"
        >
          Joining your workspace...
        </p>
      ) : (
        <button
          className="forge-button forge-button-primary forge-focus-ring px-6 py-3 text-sm disabled:opacity-50"
          disabled={loading}
          onClick={handleAccept}
          type="button"
        >
          {loading ? "Accepting..." : "Accept invite"}
        </button>
      )}
      {error ? <p className="mt-3 text-sm text-[var(--forge-danger)]">{error}</p> : null}
    </div>
  );
}
