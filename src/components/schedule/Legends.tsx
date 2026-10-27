import { useMemo } from "react";
import { essentialLegend, skillLegend, type LegendEntry } from "@/lib/schedule/legend";
import type { ScheduleRow } from "@/lib/schedule/rows";
import { BNCC_SKILLS } from "@/lib/skills/bncc";
import type { ColumnId, Display } from "@/types";

function Legend({ title, entries }: { title: string; entries: LegendEntry[] }) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="mb-1 text-[15px] leading-[22px] font-bold print:text-[10pt]">{title}</h2>
      <dl className="space-y-1">
        {entries.map((e) => (
          <div key={e.code} className="flex gap-2">
            <dt className="w-28 shrink-0 font-bold print:w-24">{e.code}</dt>
            <dd className={e.text ? "" : "text-muted-foreground"}>{e.text ?? "descrição não encontrada"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Legendas abaixo da tabela: só entram as que o professor ligou e cuja coluna está visível. */
export function Legends({ rows, columns, display }: { rows: ScheduleRow[]; columns: ColumnId[]; display: Display }) {
  const lessons = useMemo(() => rows.flatMap((r) => (r.lesson ? [r.lesson] : [])), [rows]);
  const showSkills = display.skillsLegend && columns.includes("skills");
  const showAe = display.essentialLegend && columns.includes("essentialLearning");
  if (!showSkills && !showAe) return null;
  return (
    <div className="mt-6 space-y-4 text-sm leading-5 print:mt-4 print:text-[9.5pt] print:leading-[12.5pt]">
      {showSkills && <Legend title="Habilidades" entries={skillLegend(lessons, BNCC_SKILLS)} />}
      {showAe && <Legend title="Aprendizagens Essenciais" entries={essentialLegend(lessons)} />}
    </div>
  );
}
