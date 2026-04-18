type HighlightNoteProps = {
  note: string;
};

export function HighlightNote({ note }: HighlightNoteProps) {
  return (
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
        Manager note
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{note}</p>
    </div>
  );
}
