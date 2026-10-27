import { compareGrades } from "@/lib/schedule/grades";
import { reportKey, type PlanDocument, type Report, type Teacher } from "@/types";

/** Uma guia: matéria, série e turma (vazia quando a série não separa turmas). Cada bimestre dela é um conjunto de documentos. */
export type GuideTarget = { subject: string; grade: string; klass: string };

export const targetKey = (t: GuideTarget) => `${t.subject}|${t.grade}|${t.klass}`;
export const sameTarget = (a: GuideTarget, b: GuideTarget) => targetKey(a) === targetKey(b);

/** "1ª série A": a série e, se separa turmas, a turma. */
export const classLabel = (grade: string, klass: string) => (klass ? `${grade} ${klass}` : grade);

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR");

/**
 * Todas as guias que o professor tem ou pode ter: as turmas de "O que leciono" (com ou sem PDF) e as que só existem
 * nos documentos. Por matéria, série e turma.
 */
export function guideTargets(teacher: Teacher, documents: PlanDocument[]): GuideTarget[] {
  const found = new Map<string, GuideTarget>();
  const add = (t: GuideTarget) => found.set(targetKey(t), t);
  for (const a of teacher.assignments) for (const klass of a.classes.length > 0 ? a.classes : [""]) add({ subject: a.subject, grade: a.grade, klass });
  for (const d of documents) add({ subject: d.curriculum.subject, grade: d.curriculum.grade, klass: d.klass });
  return [...found.values()].sort((a, b) => byName(a.subject, b.subject) || compareGrades(a.grade, b.grade) || byName(a.klass, b.klass));
}

/** Documentos de uma guia, no bimestre pedido (sem `term`, em todos), na ordem em que entraram. */
export const docsOf = (documents: PlanDocument[], t: GuideTarget, term?: number) =>
  documents.filter(
    (d) =>
      d.curriculum.subject === t.subject && d.curriculum.grade === t.grade && d.klass === t.klass && (term === undefined || d.curriculum.term === term),
  );

/** "none": sem PDF no bimestre. "edited": o professor mexeu (relatório, linhas livres ou removidas). "ready": só o que veio do PDF. */
export type GuideStatus = "none" | "ready" | "edited";

export function guideStatus(documents: PlanDocument[], reports: Record<string, Report>, t: GuideTarget, term: number): GuideStatus {
  const docs = docsOf(documents, t, term);
  if (docs.length === 0) return "none";
  const touched =
    reportKey(t.grade, t.subject, t.klass, term) in reports ||
    docs.some((d) => d.curriculum.lessons.some((l) => l.custom) || d.deletedLessons.length > 0 || Object.values(d.removedRows).some((n) => n > 0));
  return touched ? "edited" : "ready";
}

/** Os três campos que identificam uma guia, na ordem em que viram dropdown. */
export type FilterKey = keyof GuideTarget;
/** Campo ausente = sem restrição ("Todas"). */
export type GuideFilter = Partial<GuideTarget>;

const matches = (t: GuideTarget, filter: GuideFilter) => (Object.keys(filter) as FilterKey[]).every((k) => filter[k] === undefined || t[k] === filter[k]);

export const filterTargets = (targets: GuideTarget[], filter: GuideFilter) => targets.filter((t) => matches(t, filter));

/** Opções de um dropdown: o que existe entre as guias que combinam com os dropdowns que vêm antes dele. */
export function filterOptions(targets: GuideTarget[], order: FilterKey[], key: FilterKey, filter: GuideFilter): string[] {
  const before: GuideFilter = {};
  for (const k of order.slice(0, order.indexOf(key))) before[k] = filter[k];
  const values = [...new Set(filterTargets(targets, before).map((t) => t[key]))];
  return key === "grade" ? values.sort(compareGrades) : values.sort(byName);
}
