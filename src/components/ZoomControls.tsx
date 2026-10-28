import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Zoom atual em fração (1 = 100%). */
  value: number;
  min: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
  className?: string;
};

const BTN = "grid size-11 place-items-center rounded-xl hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";

/** Pílula escura flutuante com − / restaurar / +. */
export function ZoomControls({ value, min, max, onDecrease, onIncrease, onReset, className }: Props) {
  const pct = Math.round(value * 100);
  return (
    <div role="group" aria-label="Zoom" className={cn("flex items-center gap-1 rounded-2xl bg-slate-900 p-1.5 text-white shadow-lg print:hidden", className)}>
      <button type="button" aria-label="Diminuir zoom" disabled={value <= min} onClick={onDecrease} className={BTN}><Minus aria-hidden className="size-5" /></button>
      <button type="button" aria-label={`Voltar para 100% (agora ${pct}%)`} title={`${pct}%`} onClick={onReset} className={`${BTN} text-amber-400`}><RotateCcw aria-hidden className="size-5" /></button>
      <button type="button" aria-label="Aumentar zoom" disabled={value >= max} onClick={onIncrease} className={BTN}><Plus aria-hidden className="size-5" /></button>
    </div>
  );
}
