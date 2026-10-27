import type { Lesson, Schedule, Week } from "@/types";

export type ScheduleRow = {
  /** Identifica a linha no arrastar: o id da aula/linha em branco, ou `empty-<posição>` se não há nada. */
  key: string;
  /** Posição da linha na tabela inteira (0 = primeira). */
  position: number;
  week: Week;
  weekIndex: number;
  /** Quantas linhas a semana ocupa (rowSpan); só na primeira linha da semana. */
  weekSpan: number | null;
  /** Quantas linhas a semana tem; vale para todas as linhas dela. */
  weekRows: number;
  /** Id guardado na sequência para esta linha (aula ou linha em branco), se houver. */
  itemId: string | null;
  lesson: Lesson | null;
};

/** Linhas da tabela: a posição k mostra order[k]; a semana sai da soma acumulada de lessonCount. */
export function buildRows(schedule: Schedule, lessons: Lesson[]): ScheduleRow[] {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const rows: ScheduleRow[] = [];
  let position = 0;
  schedule.weeks.forEach((week, weekIndex) => {
    for (let k = 0; k < week.lessonCount; k++) {
      const itemId = schedule.order[position] ?? null;
      rows.push({
        key: itemId ?? `empty-${position}`,
        position,
        week,
        weekIndex,
        weekSpan: k === 0 ? week.lessonCount : null,
        weekRows: week.lessonCount,
        itemId,
        lesson: itemId ? (byId.get(itemId) ?? null) : null,
      });
      position += 1;
    }
  });
  return rows;
}
