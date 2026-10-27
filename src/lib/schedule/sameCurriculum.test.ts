import { describe, expect, it } from "vitest";
import { curriculumDifferences } from "./sameCurriculum";
import type { Curriculum } from "@/types";

const lesson = (n: number, content = `Conteúdo ${n}`) => ({
  id: `lesson-${n}`, number: n, title: `Título ${n}`, content: [content], objectives: ["Obj"], skills: ["EM13CHS306"],
  essentialLearning: [{ code: "AE6", text: "texto" }],
});
const guide = (over: Partial<Curriculum> = {}): Curriculum => ({
  grade: "1ª série", term: 4, subject: "Geografia", lessons: [lesson(1), lesson(2)], ...over,
});

describe("curriculumDifferences", () => {
  it("guias idênticos, mesmo com ids, maiúsculas e espaços diferentes", () => {
    const b = guide({ grade: "1ª  Série", lessons: [{ ...lesson(1, "conteúdo 1 "), id: "x" }, lesson(2)] });
    expect(curriculumDifferences(guide(), b)).toEqual([]);
  });
  it("aponta série, disciplina e aulas", () => {
    expect(curriculumDifferences(guide(), guide({ grade: "2ª série" }))).toEqual(["série"]);
    expect(curriculumDifferences(guide(), guide({ subject: "Sociologia" }))).toEqual(["disciplina"]);
    expect(curriculumDifferences(guide(), guide({ lessons: [lesson(1), lesson(2, "outro")] }))).toEqual(["aulas"]);
    expect(curriculumDifferences(guide(), guide({ lessons: [lesson(1)] }))).toEqual(["aulas"]);
  });
  it("linhas escritas pelo professor não contam", () => {
    const custom = { ...lesson(0, "livre"), id: "custom-1", custom: true as const };
    expect(curriculumDifferences(guide(), guide({ lessons: [lesson(1), lesson(2), custom] }))).toEqual([]);
  });
});
