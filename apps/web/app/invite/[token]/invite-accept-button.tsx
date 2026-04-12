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
        className="rounded-[1.1rem] bg-[#2c63f6] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
        disabled={loading}
        onClick={handleAccept}
        type="button"
      >
        {loading ? "Accepting..." : "Accept Invite"}
      </button>
      {error ? <p className="mt-3 text-sm text-[#ff7f7f]">{error}</p> : null}
    </div>
  );
}
