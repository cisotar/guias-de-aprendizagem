import { describe, expect, it } from "vitest";
import { docsOf, filterOptions, filterTargets, guideStatus, guideTargets, type FilterKey } from "./guides";
import type { PlanDocument, Teacher } from "@/types";

const days = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as const;
const teacher: Teacher = {
  name: "",
  assignments: [
    { grade: "2ª série", subject: "Geografia", classes: [], classLessons: {}, lessonsPerDay: days },
    { grade: "1ª série", subject: "Geografia", classes: ["A", "B"], classLessons: {}, lessonsPerDay: days },
    { grade: "1ª série", subject: "Biologia", classes: [], classLessons: {}, lessonsPerDay: days },
  ],
};
const doc = (id: string, klass: string, term: number, extra: Partial<PlanDocument> = {}): PlanDocument => ({
  id, fileName: "", klass, curriculum: { grade: "1ª série", term, subject: "Geografia", lessons: [] }, rowOrder: [], removedRows: {}, deletedLessons: [], ...extra,
});

describe("guias", () => {
  it("lista matéria, série e turma em ordem, mesmo sem PDF", () => {
    expect(guideTargets(teacher, []).map((t) => `${t.subject} ${t.grade} ${t.klass}`.trim())).toEqual([
      "Biologia 1ª série", "Geografia 1ª série A", "Geografia 1ª série B", "Geografia 2ª série",
    ]);
  });
  it("inclui a turma que só existe num documento", () => {
    expect(guideTargets(teacher, [doc("x", "Z", 1)]).map((t) => t.klass)).toContain("Z");
  });
  it("separa os documentos por turma e bimestre", () => {
    const docs = [doc("a1", "A", 1), doc("b1", "B", 1), doc("a2", "A", 2)];
    const a = { subject: "Geografia", grade: "1ª série", klass: "A" };
    expect(docsOf(docs, a).map((d) => d.id)).toEqual(["a1", "a2"]);
    expect(docsOf(docs, a, 2).map((d) => d.id)).toEqual(["a2"]);
  });
  it("status: sem PDF, pronta ou editada", () => {
    const t = { subject: "Geografia", grade: "1ª série", klass: "A" };
    expect(guideStatus([], {}, t, 1)).toBe("none");
    expect(guideStatus([doc("a1", "A", 1)], {}, t, 1)).toBe("ready");
    expect(guideStatus([doc("a1", "A", 1, { deletedLessons: ["l1"] })], {}, t, 1)).toBe("edited");
    expect(guideStatus([doc("a1", "A", 1)], { "1ª série|Geografia|A|1": { events: [] } }, t, 1)).toBe("edited");
  });

  describe("filtros em cascata", () => {
    const targets = guideTargets(teacher, []);
    const bySubject: FilterKey[] = ["subject", "grade", "klass"];
    const byGrade: FilterKey[] = ["grade", "subject", "klass"];
    it("lista as opções de cada dropdown pelo que vem antes dele", () => {
      expect(filterOptions(targets, bySubject, "subject", {})).toEqual(["Biologia", "Geografia"]);
      expect(filterOptions(targets, bySubject, "grade", { subject: "Geografia" })).toEqual(["1ª série", "2ª série"]);
      expect(filterOptions(targets, bySubject, "klass", { subject: "Geografia", grade: "1ª série" })).toEqual(["A", "B"]);
      expect(filterOptions(targets, bySubject, "klass", { subject: "Geografia", grade: "2ª série" })).toEqual([""]);
    });
    it("por série, a matéria só lista quem tem aquela série", () => {
      expect(filterOptions(targets, byGrade, "subject", { grade: "2ª série" })).toEqual(["Geografia"]);
      expect(filterOptions(targets, byGrade, "grade", {})).toEqual(["1ª série", "2ª série"]);
    });
    it("sem restrição, 'Todas' não filtra", () => {
      expect(filterTargets(targets, {})).toHaveLength(4);
      expect(filterTargets(targets, { grade: "1ª série" })).toHaveLength(3);
    });
  });
});
