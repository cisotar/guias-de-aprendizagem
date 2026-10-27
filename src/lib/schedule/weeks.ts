import { addDays, format, getISODay, parseISO, isValid, startOfWeek } from "date-fns";
import type { LessonsPerDay, Term, Week } from "@/types";

export type WeeksResult =
  | { ok: true; weeks: Week[] }
  | { ok: false; error: string };

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

/** Semanas (segunda a sexta) do bimestre que têm ao menos um dia de aula. */
export function computeWeeks(
  term: Pick<Term, "number" | "start" | "end">,
  teacher: { lessonsPerDay: LessonsPerDay },
): WeeksResult {
  const start = parseISO(term.start);
  const end = parseISO(term.end);
  if (!isValid(start) || !isValid(end)) {
    return { ok: false, error: "Preencha o início e o fim do bimestre." };
  }
  if (end <= start) {
    return { ok: false, error: "O fim do bimestre precisa ser depois do início." };
  }
  const perDay = (dow: number) => teacher.lessonsPerDay[dow as 1 | 2 | 3 | 4 | 5] ?? 0;
  if ([1, 2, 3, 4, 5].every((d) => perDay(d) === 0)) {
    return { ok: false, error: "Informe ao menos um dia com aula." };
  }

  const byMonday = new Map<string, { days: string[]; teaching: number; slots: number }>();
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = getISODay(d);
    if (dow > 5) continue;
    const monday = fmt(startOfWeek(d, { weekStartsOn: 1 }));
    const entry = byMonday.get(monday) ?? { days: [], teaching: 0, slots: 0 };
    entry.days.push(fmt(d));
    if (perDay(dow) > 0) {
      entry.teaching += 1;
      entry.slots += perDay(dow);
    }
    byMonday.set(monday, entry);
  }

  const weeks: Week[] = [];
  for (const [, { days, teaching, slots }] of byMonday) {
    if (teaching === 0) continue;
    weeks.push({
      id: `${term.number}-${days[0]}`,
      start: days[0],
      end: days[days.length - 1],
      teachingDays: teaching,
      lessonSlots: slots,
      lessonCount: 0,
    });
  }
  if (weeks.length === 0) {
    return { ok: false, error: "Nenhum dia de aula cai dentro do bimestre." };
  }
  return { ok: true, weeks };
}
