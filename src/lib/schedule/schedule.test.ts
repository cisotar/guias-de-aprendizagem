import { describe, expect, it } from "vitest";
import { computeWeeks } from "./weeks";
import { buildRows } from "./rows";
import { buildSchedule, normalizeRowOrder, spreadExtraRows } from "./build";
import type { Lesson, LessonsPerDay } from "@/types";

describe("computeWeeks", () => {
  const term = (start: string, end: string) => ({ number: 4, start, end });
  const days = (...on: number[]) => ({ lessonsPerDay: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...Object.fromEntries(on.map((d) => [d, 1])) } as import("@/types").LessonsPerDay });
  const mon = days(1);

  it("bimestre começando numa quarta corta a primeira semana", () => {
    const r = computeWeeks(term("2026-10-07", "2026-10-23"), days(3, 5));
    expect(r.ok && r.weeks[0]).toMatchObject({ start: "2026-10-07", end: "2026-10-09", teachingDays: 2 });
  });
  it("descarta semanas sem dia de aula", () => {
    // 07/10 (quarta) a 16/10 (sexta), só segundas: a semana de 05/10 não tem segunda dentro do período
    const r = computeWeeks(term("2026-10-07", "2026-10-16"), mon);
    expect(r.ok && r.weeks.map((w) => w.start)).toEqual(["2026-10-12"]);
  });
  it("peso da semana é a soma das aulas dos dias", () => {
    const r = computeWeeks(term("2026-10-05", "2026-10-09"), { lessonsPerDay: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 } });
    expect(r.ok && r.weeks[0]).toMatchObject({ teachingDays: 2, lessonSlots: 3 });
  });
  it("termina numa segunda", () => {
    const r = computeWeeks(term("2026-10-05", "2026-10-12"), mon);
    expect(r.ok && r.weeks.map((w) => [w.start, w.end])).toEqual([
      ["2026-10-05", "2026-10-09"],
      ["2026-10-12", "2026-10-12"],
    ]);
  });
  it("começa num sábado", () => {
    const r = computeWeeks(term("2026-10-10", "2026-10-16"), mon);
    expect(r.ok && r.weeks[0]).toMatchObject({ start: "2026-10-12", end: "2026-10-16" });
  });
  it("um único dia", () => {
    const r = computeWeeks(term("2026-10-05", "2026-10-06"), mon);
    expect(r.ok && r.weeks).toHaveLength(1);
  });
  it("fim anterior ao início é erro", () => {
    expect(computeWeeks(term("2026-10-10", "2026-10-01"), mon).ok).toBe(false);
  });
  it("sem dias de aula é erro", () => {
    expect(computeWeeks(term("2026-10-05", "2026-10-30"), days()).ok).toBe(false);
  });
});

describe("buildSchedule", () => {
  const lesson = (n: number): Lesson => ({
    id: `l${n}`, number: n, title: `A${n}`, content: [], objectives: [], skills: [], essentialLearning: [],
  });
  const curriculum = (n: number) => ({ grade: "1ª série", term: 4, subject: "Geografia", lessons: Array.from({ length: n }, (_, i) => lesson(i + 1)) });
  // 4 semanas de segunda a sexta; 2 aulas na segunda e 1 na quarta = 3 linhas por semana
  const term = { number: 4, start: "2026-10-05", end: "2026-10-30" };
  const assignment = (grade: string, subject: string, lessonsPerDay: LessonsPerDay) => ({ grade, subject, classes: [], classLessons: {}, lessonsPerDay });
  const teacher = { name: "", assignments: [assignment("1ª série", "Geografia", { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 })] };
  const rowsOf = (n: number, doc = { rowOrder: [] as string[], removedRows: {} as Record<string, number>, deletedLessons: [] as string[] }) => {
    const c = curriculum(n);
    const r = buildSchedule(c, teacher, term, doc);
    if (!r.ok) throw new Error(r.error);
    return { schedule: r.schedule, rows: buildRows(r.schedule, c.lessons) };
  };

  it("cada série e matéria usa o próprio horário", () => {
    const t = {
      name: "",
      assignments: [
        assignment("1ª série", "Geografia", { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 }),
        assignment("2ª série", "Geografia", { 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 }),
        assignment("1ª série", "Biologia", { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 }),
      ],
    };
    const doc = { rowOrder: [], removedRows: {}, deletedLessons: [] };
    const slots = (grade: string, subject: string) => {
      const r = buildSchedule({ ...curriculum(5), grade, subject }, t, term, doc);
      return r.ok && r.schedule.weeks.map((w) => w.lessonSlots);
    };
    expect(slots("1ª série", "Geografia")).toEqual([3, 3, 3, 3]);
    expect(slots("2ª série", "Geografia")).toEqual([2, 2, 2, 2]);
    expect(slots("1ª série", "Biologia")).toEqual([1, 1, 1, 1]);
  });
  it("matéria que o professor não cadastrou na série não tem horário", () => {
    const r = buildSchedule({ ...curriculum(5), subject: "História" }, teacher, term, { rowOrder: [], removedRows: {}, deletedLessons: [] });
    expect(r.ok).toBe(false);
  });
  it("cada semana tem tantas linhas quantas aulas o professor dá nela", () => {
    const { schedule } = rowsOf(5);
    expect(schedule.weeks.map((w) => w.lessonCount)).toEqual([3, 3, 3, 3]);
  });
  it("aulas entram em sequência e as linhas vazias ficam no fim", () => {
    const { rows } = rowsOf(5);
    expect(rows).toHaveLength(12);
    expect(rows.slice(0, 5).map((r) => r.lesson?.id)).toEqual(["l1", "l2", "l3", "l4", "l5"]);
    expect(rows.slice(5).every((r) => r.lesson === null)).toBe(true);
  });
  it("34 aulas em 30 linhas: uma linha extra em cada uma das 4 últimas semanas", () => {
    const eight = { number: 4, start: "2026-10-05", end: "2026-11-27" }; // 8 semanas
    const t = { name: "", assignments: [assignment("1ª série", "Geografia", { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 })] };
    const c = curriculum(20); // 8 semanas x 2 = 16 linhas, 20 aulas: 4 extras
    const r = buildSchedule(c, t, eight, { rowOrder: [], removedRows: {}, deletedLessons: [] });
    expect(r.ok && r.schedule.weeks.map((w) => w.lessonCount)).toEqual([2, 2, 2, 2, 3, 3, 3, 3]);
  });
  it("extras além do número de semanas voltam a dar uma por semana, da última para a primeira", () => {
    expect(spreadExtraRows(10, [1, 1, 1, 1])).toEqual([3, 3, 4, 4]);
  });
  it("remover linha vazia tira uma linha só daquela semana", () => {
    const first = rowsOf(5).schedule.weeks[3].id;
    const { schedule } = rowsOf(5, { rowOrder: [], removedRows: { [first]: 1 }, deletedLessons: [] });
    expect(schedule.weeks.map((w) => w.lessonCount)).toEqual([3, 3, 3, 2]);
  });
  it("nunca deixa uma semana sem linha", () => {
    const first = rowsOf(1).schedule.weeks[0].id;
    const { schedule } = rowsOf(1, { rowOrder: [], removedRows: { [first]: 9 }, deletedLessons: [] });
    expect(schedule.weeks[0].lessonCount).toBe(1);
  });
  it("linha em branco no meio empurra as aulas e mantém as contagens", () => {
    const { rows } = rowsOf(3, { rowOrder: ["l1", "blank-x", "l2", "l3"], removedRows: {}, deletedLessons: [] });
    expect(rows.slice(0, 4).map((r) => r.lesson?.id ?? null)).toEqual(["l1", null, "l2", "l3"]);
    expect(rows[1].itemId).toBe("blank-x");
  });
  it("rowSpan da semana fica na primeira linha dela", () => {
    const { rows } = rowsOf(3);
    expect(rows.map((r) => r.weekSpan).slice(0, 4)).toEqual([3, null, null, 3]);
  });
  it("aulas removidas não voltam à sequência", () => {
    expect(normalizeRowOrder(["l1", "l2", "l3"], [lesson(1), lesson(2), lesson(3)], ["l2"])).toEqual(["l1", "l3"]);
  });
  it("normalizeRowOrder descarta ids inexistentes e repetidos, acrescenta aulas que faltam e tira brancos do fim", () => {
    const lessons = [lesson(1), lesson(2), lesson(3)];
    expect(normalizeRowOrder(["l2", "zzz", "l2", "blank-a", "l1", "blank-b"], lessons)).toEqual(["l2", "blank-a", "l1", "blank-b", "l3"]);
    expect(normalizeRowOrder(["l1", "l2", "l3", "blank-z"], lessons)).toEqual(["l1", "l2", "l3"]);
  });
});
