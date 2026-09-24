"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeDialog } from "@/components/forge-dialog";
import { ForgeButton } from "@/components/forge";

type DeleteRecordingButtonProps = {
  callId: string;
  callTopic: string;
  detailPage?: boolean;
};

export function DeleteRecordingButton({ callId, callTopic, detailPage = false }: DeleteRecordingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteRecording() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/calls/${encodeURIComponent(callId)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not delete this recording. Please try again.");
      }

      setOpen(false);
      if (detailPage) router.replace("/calls");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this recording. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ForgeButton
        aria-label={`Delete recording ${callTopic}`}
        icon="delete"
        onClick={() => { setError(null); setOpen(true); }}
        size="sm"
        type="button"
        variant="danger"
      >
        Delete
      </ForgeButton>
      <ForgeDialog
        description={`Delete “${callTopic}” and its recording, transcript, scorecard, and related call data? This cannot be undone.`}
        footer={
          <>
            <ForgeButton disabled={deleting} onClick={() => setOpen(false)} type="button" variant="secondary">Cancel</ForgeButton>
            <ForgeButton disabled={deleting} onClick={() => { void deleteRecording(); }} type="button" variant="danger">
              {deleting ? "Deleting..." : "Delete recording"}
            </ForgeButton>
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title="Delete recording?"
      >
        {error ? <p role="alert" className="text-sm text-[var(--forge-danger)]">{error}</p> : null}
      </ForgeDialog>
    </>
  );
}
