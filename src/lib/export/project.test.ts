import { describe, expect, it } from "vitest";
import { fromExportFile, toExportFile, toMarkdown } from "./project";
import type { Project } from "@/types";

const lesson = (n: number) => ({
  id: `lesson-${n}`, number: n, title: `Título ${n}`, content: [`C${n}`], objectives: [`O${n}`],
  skills: ["EM13CHS306"], essentialLearning: [{ code: "AE6", text: "texto" }],
});

const project: Project = {
  documents: [
    {
      id: "doc-1",
      fileName: "guia.pdf",
      klass: "A",
      curriculum: { grade: "1ª série", term: 4, subject: "Geografia", lessons: [1, 2, 3].map(lesson) },
      rowOrder: ["lesson-3", "lesson-1", "lesson-2"],
      removedRows: {},
      deletedLessons: [],
    },
  ],
  teacher: {
    name: "Ana",
    school: "E. E. Exemplo",
    assignments: [
      { grade: "1ª série", subject: "Geografia", classes: ["A", "B"], classLessons: { B: { 1: 0, 2: 2, 3: 0, 4: 1, 5: 0 } }, lessonsPerDay: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 } },
      { grade: "1ª série", subject: "Biologia", classes: [], classLessons: {}, lessonsPerDay: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 } },
    ],
  },
  terms: [{ number: 4, start: "2026-10-05", end: "2026-10-23" }],
  holidays: [{ date: "2026-10-12", name: "Padroeira", scope: "national", source: "manual" }],
  columns: ["schedule", "number", "content"],
  location: { uf: "SP", city: "" },
  display: { skillsInline: true, skillsLegend: true, essentialInline: false, essentialLegend: true },
  reports: { "1ª série|Geografia|A|4": { school: "E. E. Exemplo", socioemotional: "", events: [{ text: "Prova", date: "10/06 a 25/06" }] } },
  reportImages: { banner: "data:image/jpeg;base64,AAAA", schoolLogo: null },
};

describe("export", () => {
  it("exportar e importar devolve o mesmo estado", () => {
    const json = JSON.parse(JSON.stringify(toExportFile(project)));
    expect(fromExportFile(json)).toEqual(project);
  });
  it("o relatório de cada turma volta igual", () => {
    const withTurmas = { ...project, reports: { ...project.reports, "1ª série|Geografia|B|4": { school: "Turma B", events: [] } } };
    expect(fromExportFile(JSON.parse(JSON.stringify(toExportFile(withTurmas)))).reports).toEqual(withTurmas.reports);
  });
  it("arquivo sem relatório (exportado antes dele existir) entra com o relatório vazio", () => {
    const { reports, reportImages, ...old } = JSON.parse(JSON.stringify(toExportFile(project)));
    void reports; void reportImages;
    const imported = fromExportFile(old);
    expect(imported.reports).toEqual({});
    expect(imported.reportImages).toEqual({ banner: null, schoolLogo: null });
  });
  it("imagem removida pelo professor ('none') exporta e importa; padrão (null) não leva imagem", () => {
    const p = { ...project, reportImages: { banner: "none" as const, schoolLogo: null } };
    expect(fromExportFile(JSON.parse(JSON.stringify(toExportFile(p)))).reportImages).toEqual({ banner: "none", schoolLogo: null });
  });
  it("rejeita imagem que não é data URL de imagem", () => {
    const file = JSON.parse(JSON.stringify(toExportFile(project)));
    file.reportImages.banner = "https://exemplo.com/a.png";
    expect(() => fromExportFile(file)).toThrow();
  });
  it("rejeita arquivo inválido", () => {
    expect(() => fromExportFile({ schemaVersion: 2 })).toThrow();
  });
  it("markdown respeita colunas e ordem", () => {
    const md = toMarkdown(project);
    expect(md).toContain("| Cronograma | Aula | Conteúdo |");
    expect(md.indexOf("Título 3")).toBeLessThan(md.indexOf("Título 1"));
    expect(md).not.toContain("Habilidades");
  });
});

describe("migração do professor", () => {
  const doc = (grade: string, subject: string, term = 4) => ({ ...project.documents[0], curriculum: { ...project.documents[0].curriculum, grade, subject, term } });

  it("dados antigos (teachingDays) viram uma atribuição por série e matéria com PDF, com 1 aula por dia marcado", async () => {
    const { projectSchema } = await import("@/types");
    const p = projectSchema.parse({ ...project, documents: [project.documents[0]], teacher: { name: "A", teachingDays: [1, 3] } });
    expect(p.teacher).toEqual({
      name: "A",
      assignments: [{ grade: "1ª série", subject: "Geografia", classes: [], classLessons: {}, lessonsPerDay: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 0 } }],
    });
  });
  it("horário por série (versão anterior) vai para a atribuição da série; série sem horário usa o geral", async () => {
    const { projectSchema } = await import("@/types");
    const p = projectSchema.parse({
      ...project,
      documents: [doc("1ª série", "Geografia"), doc("2ª série", "Geografia", 1), doc("2ª série", "Geografia", 2)],
      teacher: { name: "A", lessonsPerDay: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 }, lessonsPerDayByGrade: { "2ª série": { 1: 0, 2: 2, 3: 0, 4: 0, 5: 0 } } },
    });
    expect(p.teacher.assignments.map((a) => [a.grade, a.lessonsPerDay[1], a.lessonsPerDay[2]])).toEqual([["1ª série", 1, 0], ["2ª série", 0, 2]]);
  });
  it("sem PDF não há o que atribuir: a lista começa vazia", async () => {
    const { projectSchema } = await import("@/types");
    expect(projectSchema.parse({ ...project, documents: [], teacher: { name: "A", lessonsPerDay: project.teacher.assignments[0].lessonsPerDay } }).teacher.assignments).toEqual([]);
  });
});

describe("migração de projeto e exportação antigos", () => {
  const v1 = {
    curriculum: project.documents[0].curriculum,
    teacher: { name: "A", teachingDays: [1] },
    terms: [],
    holidays: [],
    lessonOrder: ["lesson-2", "lesson-1", "lesson-3"],
    columns: ["number"],
    location: { uf: "SP", city: "" },
  };
  it("localStorage da versão 1 vira um documento", async () => {
    const { projectSchema } = await import("@/types");
    const p = projectSchema.parse(v1) as Project;
    expect(p.documents).toHaveLength(1);
    expect(p.documents[0].rowOrder).toEqual(["lesson-2", "lesson-1", "lesson-3"]);
    expect(p.display.essentialInline).toBe(true);
  });
  it("exportação schemaVersion 1 ainda importa", () => {
    const p = fromExportFile({ ...v1, schemaVersion: 1, exportedAt: "x", schedule: { termNumber: 4, weeks: [], order: v1.lessonOrder }, lessonOrder: undefined });
    expect(p.documents[0].rowOrder).toEqual(v1.lessonOrder);
  });
  it("markdown filtra por série, matéria e bimestre", () => {
    expect(toMarkdown(project, { subject: "Biologia" })).toBe("");
    expect(toMarkdown(project, { subject: "Geografia", term: 4 })).toContain("Título 1");
    expect(toMarkdown(project, { term: 1 })).toBe("");
    expect(toMarkdown(project, { term: 4 })).toContain("Título 1");
    expect(toMarkdown(project, { grade: "2ª série" })).toBe("");
    expect(toMarkdown(project, { grade: "1ª série", term: 4 })).toContain("Título 1");
  });
  it("relatórios antigos (pelo bimestre, ou pela série e bimestre) passam para a série e matéria, sem turma", () => {
    const old = JSON.parse(JSON.stringify(toExportFile(project)));
    old.schemaVersion = 2;
    old.documents.push({ ...old.documents[0], id: "doc-2", curriculum: { ...old.documents[0].curriculum, grade: "2ª série" } });
    old.reports = {
      "4": { school: "Só bimestre", events: [] },
      "2": { school: "Sem PDF", events: [] },
      "2ª série|4": { school: "Da série", events: [] },
      "1ª série|Geografia|B|4": { school: "Já nova", events: [] },
    };
    expect(fromExportFile(old).reports).toEqual({
      "2": { school: "Sem PDF", events: [] },
      "1ª série|Geografia||4": { school: "Só bimestre", events: [] },
      "2ª série|Geografia||4": { school: "Da série", events: [] },
      "1ª série|Geografia|B|4": { school: "Já nova", events: [] },
    });
  });
  it("exportação da versão 2 (horário por série) ainda importa", () => {
    const v2 = JSON.parse(JSON.stringify(toExportFile(project)));
    v2.schemaVersion = 2;
    v2.teacher = { name: "Ana", lessonsPerDay: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 }, lessonsPerDayByGrade: {} };
    expect(fromExportFile(v2).teacher.assignments).toEqual([
      { grade: "1ª série", subject: "Geografia", classes: [], classLessons: {}, lessonsPerDay: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 } },
    ]);
  });
});

describe("guias por turma (dados antigos)", () => {
  it("documento sem turma vira uma cópia por turma da série e matéria", () => {
    const old = JSON.parse(JSON.stringify(toExportFile(project))) as { documents: Record<string, unknown>[] };
    delete old.documents[0].klass;
    const p = fromExportFile(old);
    expect(p.documents.map((d) => [d.id, d.klass])).toEqual([["doc-1", "A"], ["doc-1-B", "B"]]);
    expect(p.documents[1].curriculum).toEqual(p.documents[0].curriculum);
  });
  it("série sem turmas fica com klass vazio", () => {
    const old = JSON.parse(JSON.stringify(toExportFile({ ...project, teacher: { ...project.teacher, assignments: [] } }))) as { documents: Record<string, unknown>[] };
    delete old.documents[0].klass;
    expect(fromExportFile(old).documents.map((d) => d.klass)).toEqual([""]);
  });
});
