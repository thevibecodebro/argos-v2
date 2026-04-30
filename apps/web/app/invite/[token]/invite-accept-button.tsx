"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
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
  }

  return (
    <div>
      <button
        className="forge-button forge-button-primary forge-focus-ring px-6 py-3 text-sm disabled:opacity-50"
        disabled={loading}
        onClick={handleAccept}
        type="button"
      >
        {loading ? "Accepting..." : "Accept Invite"}
      </button>
      {error ? <p className="mt-3 text-sm text-[var(--forge-danger)]">{error}</p> : null}
    </div>
  );
}
