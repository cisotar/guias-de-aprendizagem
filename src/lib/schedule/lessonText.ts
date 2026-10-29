import type { Lesson } from "@/types";

/** Texto ⇄ campos de uma aula: usado na conferência e na edição direta da tabela. */

export type TextField = "title" | "content" | "objectives" | "skills" | "essentialLearning";

/** Uma linha por tópico; marcador digitado no começo ("•", "-", "*") é aceito e ignorado. */
export const lines = (s: string) => s.split("\n").map((l) => l.trim().replace(/^[•●○■*-]\s+/, "")).filter(Boolean);

export function parseEssential(text: string): Lesson["essentialLearning"] {
  return lines(text).map((t) => {
    const m = /^(AE\d+)\s*[-–]\s*(.*)$/.exec(t);
    return m ? { code: m[1], text: m[2] } : { code: "", text: t };
  });
}

export function fieldToText(l: Lesson, field: TextField): string {
  switch (field) {
    case "title": return l.title;
    case "content": return l.content.join("\n");
    case "objectives": return l.objectives.join("\n");
    case "skills": return l.skills.join(", ");
    case "essentialLearning": return l.essentialLearning.map((a) => `${a.code} - ${a.text}`).join("\n");
  }
}

export function textToField(field: TextField, text: string): Partial<Lesson> {
  switch (field) {
    case "title": return { title: text.trim() };
    case "content": return { content: lines(text) };
    case "objectives": return { objectives: lines(text) };
    case "skills": return { skills: text.split(/[\s,;]+/).filter(Boolean) };
    case "essentialLearning": return { essentialLearning: parseEssential(text) };
  }
}

export const isEmptyLesson = (l: Lesson) =>
  !l.title && !l.content.length && !l.objectives.length && !l.skills.length && !l.essentialLearning.length;
