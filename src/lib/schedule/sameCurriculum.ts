import type { Curriculum, Lesson } from "@/types";

export type Difference = "série" | "disciplina" | "aulas";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const normAll = (a: string[]) => a.map(norm);

/** Só o que vem do PDF e o professor pode ter corrigido; ids e destaque de projeto ficam de fora. */
function lessonKey(l: Lesson) {
  return JSON.stringify([
    l.number, norm(l.title), normAll(l.content), normAll(l.objectives), l.skills.map(norm),
    l.essentialLearning.map((a) => [norm(a.code), norm(a.text)]),
  ]);
}

const pdfLessons = (c: Curriculum) => c.lessons.filter((l) => !l.custom).map(lessonKey);

/**
 * O que difere entre dois guias do mesmo bimestre: série, disciplina e/ou as aulas (número, título,
 * conteúdo, objetivos, habilidades e AEs, sem contar maiúsculas nem espaços). Vazio = guias idênticos.
 */
export function curriculumDifferences(a: Curriculum, b: Curriculum): Difference[] {
  const found: Difference[] = [];
  if (norm(a.grade) !== norm(b.grade)) found.push("série");
  if (norm(a.subject) !== norm(b.subject)) found.push("disciplina");
  const la = pdfLessons(a);
  const lb = pdfLessons(b);
  if (la.length !== lb.length || la.some((k, i) => k !== lb[i])) found.push("aulas");
  return found;
}
