import { lessonsPerDayFor, type Curriculum, type Lesson, type PlanDocument, type Schedule, type Teacher, type Term } from "@/types";
import { computeWeeks } from "./weeks";

export type ScheduleResult =
  | { ok: true; schedule: Schedule }
  | { ok: false; error: string };

export const BLANK_PREFIX = "blank-";
export const isBlankId = (id: string) => id.startsWith(BLANK_PREFIX);
let counter = 0;
export const newBlankId = () => `${BLANK_PREFIX}${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Sequência de linhas válida: só ids que existem (aulas) ou que são linhas em branco, sem repetidos,
 * com as aulas que faltam no fim, e sem linhas em branco sobrando no final.
 */
export function normalizeRowOrder(saved: string[], allLessons: Lesson[], deleted: string[] = []): string[] {
  const gone = new Set(deleted);
  const lessons = allLessons.filter((l) => !gone.has(l.id));
  const known = new Set(lessons.map((l) => l.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of saved) {
    if (seen.has(id) || !(known.has(id) || isBlankId(id))) continue;
    seen.add(id);
    out.push(id);
  }
  for (const l of lessons) if (!seen.has(l.id)) out.push(l.id);
  while (out.length && isBlankId(out[out.length - 1])) out.pop();
  return out;
}

/** Reparte `extra` linhas a mais, uma por semana, começando pela última semana e voltando. */
export function spreadExtraRows(extra: number, rowsPerWeek: number[]): number[] {
  const out = [...rowsPerWeek];
  for (let i = 0; i < extra && out.length; i++) out[out.length - 1 - (i % out.length)] += 1;
  return out;
}

/**
 * Cada semana tem tantas linhas quantas aulas o professor dá nela (menos as vazias que ele removeu).
 * Se a sequência é maior que o total de linhas, as últimas semanas ganham uma linha a mais cada.
 */
export function buildSchedule(
  curriculum: Curriculum,
  teacher: Teacher,
  term: Term | undefined,
  doc: Pick<PlanDocument, "rowOrder" | "removedRows" | "deletedLessons"> & { klass?: string },
): ScheduleResult {
  if (!term) return { ok: false, error: "Preencha as datas do bimestre do guia." };
  const result = computeWeeks(term, { lessonsPerDay: lessonsPerDayFor(teacher, curriculum.grade, curriculum.subject, doc.klass) });
  if (!result.ok) return result;
  const order = normalizeRowOrder(doc.rowOrder, curriculum.lessons, doc.deletedLessons);
  const base = result.weeks.map((w) => Math.max(1, w.lessonSlots - (doc.removedRows[w.id] ?? 0)));
  const total = base.reduce((a, b) => a + b, 0);
  const counts = spreadExtraRows(Math.max(0, order.length - total), base);
  return {
    ok: true,
    schedule: {
      termNumber: term.number,
      weeks: result.weeks.map((w, i) => ({ ...w, lessonCount: counts[i] })),
      order,
    },
  };
}
