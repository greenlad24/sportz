/** שלד למקום פרסומת (placeholder). רוחב קבוע 235px - יוחלף בפרסומת אמיתית. */
export function AdSlot({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-[235px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-soft text-center ${className}`}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
        פרסומת
      </span>
      <span className="mt-1 text-[11px] text-ink-muted">235 × 600</span>
    </div>
  );
}
