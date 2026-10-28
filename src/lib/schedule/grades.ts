import type { PlanDocument } from "@/types";

/** Etapa de ensino: Fundamental (anos finais, "7º ano") ou Médio ("1ª série"). */
export type Stage = "EF" | "EM";

export const STAGES: Record<Stage, { label: string; gradeWord: string; grades: string[] }> = {
  EF: { label: "Ensino Fundamental", gradeWord: "ano", grades: ["6º ano", "7º ano", "8º ano", "9º ano"] },
  EM: { label: "Ensino Médio", gradeWord: "série", grades: ["1ª série", "2ª série", "3ª série"] },
};

/** "7º ano" é do Fundamental; todo o resto ("1ª série") é do Médio. */
export const stageOf = (grade: string): Stage => (/\bano\b/i.test(grade) ? "EF" : "EM");

/** "1ª série" → 1. Série sem número vai para o fim. */
const gradeNumber = (grade: string) => Number(/\d+/.exec(grade)?.[0] ?? Infinity);

/** Escreve a série ou o ano sempre do mesmo jeito ("1ª série", "7º ano"), para que PDFs diferentes caiam na mesma. */
export function normalizeGrade(text: string): string {
  const year = /(\d+)\s*[ºo°]?\s*ano\b/i.exec(text)?.[1];
  if (year) return `${Number(year)}º ano`;
  const n = /(\d+)\s*[ªa°º]?\s*s[ée]rie/i.exec(text)?.[1];
  return n ? `${Number(n)}ª série` : text.trim();
}

/** Anos do Fundamental antes das séries do Médio; dentro de cada etapa, pelo número. */
export const compareGrades = (a: string, b: string) =>
  Number(stageOf(b) === "EF") - Number(stageOf(a) === "EF") || gradeNumber(a) - gradeNumber(b) || a.localeCompare(b, "pt-BR");

/** Séries que têm PDF, em ordem. */
export const gradesOf = (documents: PlanDocument[]) => [...new Set(documents.map((d) => d.curriculum.grade))].sort(compareGrades);

/** Matérias que têm PDF, em ordem alfabética. */
export const subjectsOf = (documents: PlanDocument[]) =>
  [...new Set(documents.map((d) => d.curriculum.subject))].sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Séries e matérias que têm PDF (uma por par), por série e depois por matéria. */
export function groupsOf(documents: PlanDocument[]): { grade: string; subject: string }[] {
  const seen = new Map<string, { grade: string; subject: string }>();
  for (const { curriculum: c } of documents) seen.set(`${c.grade}|${c.subject}`, { grade: c.grade, subject: c.subject });
  return [...seen.values()].sort((a, b) => compareGrades(a.grade, b.grade) || a.subject.localeCompare(b.subject, "pt-BR"));
}

/** Documentos por série, matéria e bimestre; dentro do mesmo trio, na ordem em que entraram. */
export const sortDocuments = (documents: PlanDocument[]) =>
  documents
    .map((d, i) => ({ d, i }))
    .sort(
      (a, b) =>
        compareGrades(a.d.curriculum.grade, b.d.curriculum.grade) ||
        a.d.curriculum.subject.localeCompare(b.d.curriculum.subject, "pt-BR") ||
        a.d.curriculum.term - b.d.curriculum.term ||
        a.i - b.i,
    )
    .map(({ d }) => d);
