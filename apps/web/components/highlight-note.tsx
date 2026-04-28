import { ForgeChip, ForgeSurface } from "./forge";

type HighlightNoteProps = {
  note: string;
};

export function HighlightNote({ note }: HighlightNoteProps) {
  return (
    <ForgeSurface className="mt-3 p-3" variant="inset">
      <ForgeChip tone="gold">Manager note</ForgeChip>
      <p className="mt-2 text-sm leading-relaxed text-[var(--forge-text)]">{note}</p>
    </ForgeSurface>
  );
}
