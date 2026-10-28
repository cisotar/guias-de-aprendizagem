import { beforeEach, describe, expect, it } from "vitest";
import { emptyProject, useProject } from "./project";
import { normalizeRowOrder } from "@/lib/schedule/build";
import { lessonsPerDayFor, type Curriculum, type Lesson } from "@/types";

const lesson = (n: number): Lesson => ({
  id: `lesson-${n}`, number: n, title: `T${n}`, content: [`c${n}`], objectives: [], skills: [], essentialLearning: [],
});

function setup() {
  useProject.setState({ ...emptyProject });
  useProject.getState().addDocument({ grade: "1ª série", term: 4, subject: "Geografia", lessons: [1, 2, 3].map(lesson) }, "x.pdf");
  return useProject.getState().documents[0].id;
}
const doc = () => useProject.getState().documents[0];

describe("linhas do cronograma", () => {
  let id = "";
  beforeEach(() => {
    id = setup();
  });

  it("arrastar para uma linha vazia deixa linhas em branco no caminho", () => {
    useProject.getState().moveRows(id, "lesson-1", 4, ["lesson-1"]);
    expect(doc().rowOrder.map((x) => (x.startsWith("blank-") ? "_" : x))).toEqual(["lesson-2", "lesson-3", "_", "_", "lesson-1"]);
  });
  it("arrastar entre aulas só troca a posição", () => {
    useProject.getState().moveRows(id, "lesson-1", 2, ["lesson-1"]);
    expect(doc().rowOrder).toEqual(["lesson-2", "lesson-3", "lesson-1"]);
  });
  it("marcar aula dada guarda a data; desmarcar apaga; a marca acompanha a aula ao arrastar", () => {
    useProject.getState().setTaught(id, "lesson-1", true, "2026-10-05");
    expect(doc().taught).toEqual({ "lesson-1": "2026-10-05" });
    useProject.getState().moveRows(id, "lesson-1", 2, ["lesson-1"]);
    expect(doc().taught).toEqual({ "lesson-1": "2026-10-05" });
    useProject.getState().setTaught(id, "lesson-1", false);
    expect(doc().taught).toEqual({});
  });
  it("restaurar a posição original devolve a ordem do PDF e mantém as linhas removidas", () => {
    useProject.getState().moveRows(id, "lesson-1", 2, ["lesson-1"]);
    useProject.getState().removeRow(id, { weekId: "w1", weekRows: 3, itemId: "lesson-2" });
    useProject.getState().resetRowOrder(id);
    expect(normalizeRowOrder(doc().rowOrder, doc().curriculum.lessons, doc().deletedLessons)).toEqual(["lesson-1", "lesson-3"]);
    expect(doc().deletedLessons).toEqual(["lesson-2"]);
  });
  it("digitar numa linha vazia cria uma linha livre na posição, sem mudar a contagem do PDF", () => {
    useProject.getState().setRowFields(id, { itemId: null, position: 5 }, { title: "Avaliação" });
    const d = doc();
    const custom = d.curriculum.lessons.find((l) => l.custom);
    expect(custom?.title).toBe("Avaliação");
    expect(d.rowOrder[5]).toBe(custom?.id);
    expect(d.curriculum.lessons.filter((l) => !l.custom)).toHaveLength(3);
  });
  it("esvaziar uma linha livre devolve uma linha em branco no mesmo lugar", () => {
    useProject.getState().setRowFields(id, { itemId: null, position: 3 }, { title: "X" });
    const customId = doc().rowOrder[3];
    useProject.getState().setRowFields(id, { itemId: customId, position: 3 }, { title: "" });
    expect(doc().curriculum.lessons.some((l) => l.custom)).toBe(false);
    expect(doc().rowOrder[3].startsWith("blank-")).toBe(true);
  });
  it("editar o texto de uma aula do PDF altera só essa aula", () => {
    useProject.getState().setRowFields(id, { itemId: "lesson-2", position: 1 }, { content: ["novo"] });
    expect(doc().curriculum.lessons.map((l) => l.content[0])).toEqual(["c1", "novo", "c3"]);
  });
  it("remover linha vazia soma na semana e tira a linha em branco da sequência", () => {
    useProject.getState().moveRows(id, "lesson-1", 3, ["lesson-1"]);
    const blank = doc().rowOrder.find((x) => x.startsWith("blank-")) ?? null;
    useProject.getState().removeRow(id, { weekId: "w1", weekRows: 3, itemId: blank });
    expect(doc().removedRows).toEqual({ w1: 1 });
    expect(doc().rowOrder.some((x) => x.startsWith("blank-"))).toBe(false);
    useProject.getState().restoreRows(id);
    expect(doc().removedRows).toEqual({});
  });

  it("mover várias linhas juntas mantém a ordem entre elas", () => {
    useProject.getState().moveRows(id, "lesson-1", 2, ["lesson-3", "lesson-1"]);
    // bloco [lesson-1, lesson-3] (ordem original); a pegada foi lesson-1 (índice 0): cai na posição 2
    expect(doc().rowOrder).toEqual(["lesson-2", "lesson-1", "lesson-3"]);
  });
  it("mover grupo para baixo de linhas vazias completa com brancos", () => {
    useProject.getState().moveRows(id, "lesson-2", 5, ["lesson-1", "lesson-2"]);
    const o = doc().rowOrder.map((x) => (x.startsWith("blank-") ? "_" : x));
    expect(o).toEqual(["lesson-3", "_", "_", "_", "lesson-1", "lesson-2"]);
  });
  it("clonar insere a cópia logo abaixo, empurra o resto e não conta como aula do PDF", () => {
    useProject.getState().cloneRow(id, "lesson-1");
    const d = doc();
    expect(d.rowOrder[0]).toBe("lesson-1");
    expect(d.rowOrder[2]).toBe("lesson-2");
    const copy = d.curriculum.lessons.find((l) => l.id === d.rowOrder[1]);
    expect(copy).toMatchObject({ custom: true, title: "T1", content: ["c1"], number: 1 });
    expect(d.curriculum.lessons.filter((l) => !l.custom)).toHaveLength(3);
    copy!.content.push("x");
    expect(d.curriculum.lessons[0].content).toEqual(["c1"]);
  });

  it("remover linha com aula do PDF tira a aula da sequência e 'Restaurar' a devolve no fim", () => {
    useProject.getState().removeRow(id, { weekId: "w1", weekRows: 3, itemId: "lesson-2" });
    expect(doc().rowOrder).toEqual(["lesson-1", "lesson-3"]);
    expect(doc().deletedLessons).toEqual(["lesson-2"]);
    expect(doc().removedRows).toEqual({ w1: 1 });
    useProject.getState().restoreRows(id);
    expect(normalizeRowOrder(doc().rowOrder, doc().curriculum.lessons, doc().deletedLessons)).toEqual(["lesson-1", "lesson-3", "lesson-2"]);
  });
  it("remover linha livre apaga a linha; semana de uma linha só mantém a linha", () => {
    useProject.getState().setRowFields(id, { itemId: null, position: 3 }, { title: "X" });
    const custom = doc().rowOrder[3];
    useProject.getState().removeRow(id, { weekId: "w9", weekRows: 1, itemId: custom });
    expect(doc().curriculum.lessons.some((l) => l.custom)).toBe(false);
    expect(doc().removedRows).toEqual({});
  });
});

describe("o que o professor leciona e relatório por turma", () => {
  beforeEach(() => {
    setup();
    useProject.setState({ teacher: { name: "", assignments: [] } });
  });
  const key = { grade: "1ª série", subject: "Geografia" };
  it("matéria nova entra sem aulas nem turmas, e a mesma série e matéria não se repete", () => {
    const { addAssignment } = useProject.getState();
    addAssignment("1ª série", "Geografia");
    addAssignment("1ª série", "geografia");
    addAssignment("1ª série", "Biologia");
    expect(useProject.getState().teacher.assignments.map((a) => [a.grade, a.subject, a.classes.length])).toEqual([["1ª série", "Geografia", 0], ["1ª série", "Biologia", 0]]);
  });
  it("as aulas por dia são de cada série e matéria", () => {
    const s = useProject.getState();
    s.addAssignment("1ª série", "Geografia");
    s.addAssignment("1ª série", "Biologia");
    s.addAssignment("2ª série", "Geografia");
    s.setLessonsPerDay("1ª série", "Biologia", 3, 2);
    s.setLessonsPerDay("1ª série", "Geografia", 1, 99);
    const days = (g: string, m: string) => useProject.getState().teacher.assignments.find((a) => a.grade === g && a.subject === m)?.lessonsPerDay;
    expect(days("1ª série", "Biologia")).toEqual({ 1: 0, 2: 0, 3: 2, 4: 0, 5: 0 });
    expect(days("1ª série", "Geografia")).toEqual({ 1: 9, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(days("2ª série", "Geografia")).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
  it("turmas: sem repetidas, sem vazias e sem barra vertical", () => {
    useProject.getState().addAssignment(key.grade, key.subject);
    useProject.getState().setClasses(key.grade, key.subject, ["A", " B ", "A", "", "C|"]);
    expect(useProject.getState().teacher.assignments[0].classes).toEqual(["A", "B", "C"]);
  });
  it("cada turma tem as suas aulas por dia; turma nova começa com o horário da série", () => {
    const s = useProject.getState();
    s.addAssignment(key.grade, key.subject);
    s.setLessonsPerDay(key.grade, key.subject, 1, 2);
    s.setClasses(key.grade, key.subject, ["A", "B"]);
    s.setClassLessonsPerDay(key.grade, key.subject, "B", 3, 1);
    const t = useProject.getState().teacher;
    expect(lessonsPerDayFor(t, key.grade, key.subject, "A")).toEqual({ 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(lessonsPerDayFor(t, key.grade, key.subject, "B")).toEqual({ 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 });
    expect(lessonsPerDayFor(t, key.grade, key.subject)).toEqual(lessonsPerDayFor(t, key.grade, key.subject, "A"));
  });
  it("turma removida perde o horário próprio", () => {
    const s = useProject.getState();
    s.addAssignment(key.grade, key.subject);
    s.setClasses(key.grade, key.subject, ["A", "B"]);
    s.setClassLessonsPerDay(key.grade, key.subject, "B", 3, 1);
    s.setClasses(key.grade, key.subject, ["A"]);
    expect(useProject.getState().teacher.assignments[0].classLessons).toEqual({});
  });
  it("remover só tira a atribuição", () => {
    useProject.getState().addAssignment(key.grade, key.subject);
    useProject.getState().removeAssignment(key.grade, key.subject);
    expect(useProject.getState().teacher.assignments).toEqual([]);
    expect(useProject.getState().documents).toHaveLength(1);
  });
  it("vários documentos adicionados de uma vez (um PDF com vários bimestres) têm ids diferentes", () => {
    for (const term of [1, 2, 3]) useProject.getState().addDocument({ grade: "1ª série", term, subject: "Geografia", lessons: [] }, "todos.pdf");
    const ids = useProject.getState().documents.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("o relatório é guardado por série, matéria, turma e bimestre", () => {
    const s = useProject.getState();
    s.setReport({ ...key, klass: "A", term: 4 }, { school: "A" });
    s.setReport({ ...key, klass: "B", term: 4 }, { school: "B" });
    s.setReport({ grade: "1ª série", subject: "Biologia", klass: "A", term: 4 }, { school: "Bio" });
    expect(useProject.getState().reports).toEqual({
      "1ª série|Geografia|A|4": { school: "A", events: [] },
      "1ª série|Geografia|B|4": { school: "B", events: [] },
      "1ª série|Biologia|A|4": { school: "Bio", events: [] },
    });
  });
  it("copiar o relatório leva o texto e os eventos, e a identificação (série/turma) volta a ser a do destino", () => {
    const from = { ...key, klass: "A", term: 4 };
    const to = { ...key, klass: "B", term: 4 };
    useProject.getState().setReport(from, { school: "E. E. Exemplo", justification: "Texto", grade: "1ª série A (escrito à mão)", events: [{ text: "Prova", date: "10/06" }] });
    useProject.getState().copyReport(from, to);
    const copy = useProject.getState().reports["1ª série|Geografia|B|4"];
    expect(copy).toEqual({ school: "E. E. Exemplo", justification: "Texto", events: [{ text: "Prova", date: "10/06" }] });
    // a cópia é independente: mexer no destino não mexe na origem
    useProject.getState().setReport(to, { events: [] });
    expect(useProject.getState().reports["1ª série|Geografia|A|4"].events).toHaveLength(1);
  });
  it("copiar de quem não tem relatório não faz nada", () => {
    useProject.getState().copyReport({ ...key, klass: "A", term: 4 }, { ...key, klass: "B", term: 4 });
    expect(useProject.getState().reports).toEqual({});
  });
});

describe("guias por turma", () => {
  const c = (term: number): Curriculum => ({ grade: "1ª série", term, subject: "Geografia", lessons: [{ id: "l1", number: 1, title: "A", content: [], objectives: [], skills: [], essentialLearning: [] }] });
  const key = { grade: "1ª série", subject: "Geografia" };
  const docs = () => useProject.getState().documents.map((d) => [d.klass, d.curriculum.term]);
  beforeEach(() => {
    useProject.setState({ ...emptyProject });
    useProject.getState().addAssignment(key.grade, key.subject);
  });
  it("PDF novo gera uma guia por turma", () => {
    useProject.getState().setClasses(key.grade, key.subject, ["A", "B"]);
    useProject.getState().addGuide(c(1), "g.pdf");
    expect(docs()).toEqual([["A", 1], ["B", 1]]);
  });
  it("série sem turmas ganha uma guia só", () => {
    useProject.getState().addGuide(c(1), "g.pdf");
    expect(docs()).toEqual([["", 1]]);
  });
  it("passar a separar turmas leva a guia e o relatório para a primeira turma", () => {
    const s = useProject.getState();
    s.addGuide(c(1), "g.pdf");
    s.setReport({ ...key, klass: "", term: 1 }, { school: "E" });
    s.setClasses(key.grade, key.subject, ["A"]);
    expect(docs()).toEqual([["A", 1]]);
    expect(Object.keys(useProject.getState().reports)).toEqual(["1ª série|Geografia|A|1"]);
  });
  it("deixar de separar turmas fica com a guia da primeira", () => {
    const s = useProject.getState();
    s.setClasses(key.grade, key.subject, ["A", "B"]);
    s.addGuide(c(1), "g.pdf");
    s.setClasses(key.grade, key.subject, []);
    expect(docs()).toEqual([["", 1]]);
  });
  it("remover uma turma apaga a guia dela", () => {
    const s = useProject.getState();
    s.setClasses(key.grade, key.subject, ["A", "B"]);
    s.addGuide(c(1), "g.pdf");
    s.setClasses(key.grade, key.subject, ["A"]);
    expect(docs()).toEqual([["A", 1]]);
  });
  it("copiar a guia leva aulas editadas e relatório, e substitui o destino", () => {
    const s = useProject.getState();
    s.setClasses(key.grade, key.subject, ["A", "B"]);
    s.addGuide(c(1), "g.pdf");
    const a = useProject.getState().documents.find((d) => d.klass === "A")!;
    s.setRowFields(a.id, { itemId: "l1", position: 0 }, { title: "Só da A" });
    s.setReport({ ...key, klass: "A", term: 1 }, { school: "Escola A", grade: "1ª série A" });
    s.copyGuide(key, "A", ["B"], [1]);
    const b = useProject.getState().documents.filter((d) => d.klass === "B");
    expect(b).toHaveLength(1);
    expect(b[0].curriculum.lessons[0].title).toBe("Só da A");
    expect(b[0].id).not.toBe(a.id);
    expect(useProject.getState().reports["1ª série|Geografia|B|1"]).toEqual({ school: "Escola A", events: [] });
  });
});
