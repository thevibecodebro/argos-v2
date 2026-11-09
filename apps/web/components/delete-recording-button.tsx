"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import styles from "./review-workspace.module.css";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;
    // A native popover keeps tenant theme inheritance and escapes the table's
    // overflow and the mobile navigation's stacking context.
    menu.showPopover?.();
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const width = bounds.width || 192;
    const height = bounds.height || 52;
    const bottomBar = document.querySelector<HTMLElement>('[data-mobile-tabbar="true"]')?.getBoundingClientRect();
    const bottom = bottomBar?.height ? Math.min(window.innerHeight, bottomBar.top) : window.innerHeight;
    menu.style.left = `${Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8))}px`;
    menu.style.top = `${Math.max(8, anchor.bottom + height + 12 <= bottom ? anchor.bottom + 4 : anchor.top - height - 4)}px`;
    menuItemRef.current?.focus({ preventScroll: true });

    function handleOutside(event: Event) {
      if (event.target instanceof Node && !menu!.contains(event.target) && !trigger!.contains(event.target)) closeMenu();
    }
    function handleViewportChange() { closeMenu(true); }
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("focusin", handleOutside);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("focusin", handleOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      if (menu.isConnected) menu.hidePopover?.();
    };
  }, [menuOpen, closeMenu]);

  function openConfirmation() {
    closeMenu(true);
    setError(null);
    setOpen(true);
  }

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
      {detailPage ? <ForgeButton
        aria-label={`Delete recording ${callTopic}`}
        onClick={() => { setError(null); setOpen(true); }}
        size="sm"
        type="button"
        variant="danger"
      >
        <span className="inline-flex items-center gap-2"><Trash2 aria-hidden="true" className="shrink-0" size={16} />Delete</span>
      </ForgeButton> : <>
        <button
          aria-controls={menuOpen ? menuId : undefined}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`More actions for ${callTopic}`}
          className={styles.rowActionsTrigger}
          onClick={() => menuOpen ? closeMenu(true) : setMenuOpen(true)}
          onKeyDown={(event) => {
            if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setMenuOpen(true);
            }
          }}
          ref={triggerRef}
          title="More actions"
          type="button"
        ><MoreHorizontal aria-hidden="true" size={18} /></button>
        {menuOpen ? <div
          aria-label={`Actions for ${callTopic}`}
          className={styles.rowActionsMenu}
          id={menuId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeMenu(true);
            } else if (event.key === "Tab") {
              closeMenu(true);
            } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              menuItemRef.current?.focus();
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openConfirmation();
            }
          }}
          popover="manual"
          ref={menuRef}
          role="menu"
        >
          <button className={styles.rowActionsDelete} onClick={openConfirmation} ref={menuItemRef} role="menuitem" type="button">
            <Trash2 aria-hidden="true" size={16} />Delete recording
          </button>
        </div> : null}
      </>}
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
