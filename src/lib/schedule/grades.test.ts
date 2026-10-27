import { describe, expect, it } from "vitest";
import { gradesOf, groupsOf, normalizeGrade, sortDocuments, subjectsOf } from "./grades";
import type { PlanDocument } from "@/types";

const doc = (id: string, grade: string, term: number, subject = "Geografia"): PlanDocument => ({
  id, fileName: "", klass: "", curriculum: { grade, term, subject, lessons: [] }, rowOrder: [], removedRows: {}, deletedLessons: [],
});

describe("séries", () => {
  it("escreve a série sempre do mesmo jeito", () => {
    expect(normalizeGrade("1ª série")).toBe("1ª série");
    expect(normalizeGrade("2 ª  Série")).toBe("2ª série");
    expect(normalizeGrade("3a serie")).toBe("3ª série");
    expect(normalizeGrade("")).toBe("");
  });
  it("ordena por série (pelo número, não pelo texto) e depois por bimestre", () => {
    const docs = [doc("a", "2ª série", 1), doc("b", "1ª série", 3), doc("c", "10ª série", 1), doc("d", "1ª série", 1)];
    expect(sortDocuments(docs).map((d) => d.id)).toEqual(["d", "b", "a", "c"]);
    expect(gradesOf(docs)).toEqual(["1ª série", "2ª série", "10ª série"]);
  });
  it("ordena por série, matéria e bimestre, e agrupa por série e matéria", () => {
    const docs = [doc("a", "1ª série", 2, "História"), doc("b", "1ª série", 1, "Biologia"), doc("c", "1ª série", 1, "História"), doc("d", "2ª série", 1, "Biologia")];
    expect(sortDocuments(docs).map((d) => d.id)).toEqual(["b", "c", "a", "d"]);
    expect(groupsOf(docs)).toEqual([
      { grade: "1ª série", subject: "Biologia" }, { grade: "1ª série", subject: "História" }, { grade: "2ª série", subject: "Biologia" },
    ]);
    expect(subjectsOf(docs)).toEqual(["Biologia", "História"]);
  });
});
