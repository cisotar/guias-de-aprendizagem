import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { temporal } from "zundo";
import { arrayMove } from "@dnd-kit/sortable";
import {
  assignmentFor,
  classLessonsPerDay,
  COLUMN_IDS,
  DEFAULT_DISPLAY,
  NO_LESSONS,
  NO_REPORT_IMAGES,
  projectSchema,
  reportKey,
  type Assignment,
  type ColumnId,
  type Curriculum,
  type Display,
  type Holiday,
  type Lesson,
  type PlanDocument,
  type Project,
  type Report,
  type ReportImages,
  type Term,
  type Weekday,
} from "@/types";
import { format } from "date-fns";
import { mergeFetched } from "@/lib/holidays/normalize";
import { newBlankId, normalizeRowOrder } from "@/lib/schedule/build";
import { moveBlock } from "@/lib/schedule/move";
import { isEmptyLesson } from "@/lib/schedule/lessonText";

export const STORAGE_KEY = "cronograma-geografia";

export const emptyProject: Project = {
  documents: [],
  teacher: { name: "", assignments: [] },
  terms: [],
  holidays: [],
  columns: [...COLUMN_IDS],
  location: { uf: "SP", city: "" },
  display: DEFAULT_DISPLAY,
  reports: {},
  reportImages: NO_REPORT_IMAGES,
};

type Actions = {
  addDocument: (curriculum: Curriculum, fileName: string, klass?: string) => void;
  /** Guia nova do PDF: uma cópia por turma da série e matéria (ou uma só, se não separa turmas). */
  addGuide: (curriculum: Curriculum, fileName: string) => void;
  /**
   * Copia a guia de uma turma (aulas, ordem, linhas livres e relatório) para outras turmas da mesma série e matéria,
   * nos bimestres pedidos. O que o destino já tinha nesses bimestres é substituído (quem pede confirmação é a interface).
   */
  copyGuide: (target: { grade: string; subject: string }, from: string, to: string[], terms: number[]) => void;
  editDocument: (id: string, curriculum: Curriculum) => void;
  removeDocument: (id: string) => void;
  setTeacherName: (name: string) => void;
  setTeacherSchool: (school: string) => void;
  /** Passa a lecionar a matéria na série (sem aulas nem turmas ainda). Não repete uma que já existe. */
  addAssignment: (grade: string, subject: string) => void;
  removeAssignment: (grade: string, subject: string) => void;
  /** Turmas da série em que leciona a matéria; vazio = não separa turma. */
  setClasses: (grade: string, subject: string, classes: string[]) => void;
  /** Aulas num dia da semana, da matéria na série (usado quando a série não tem turmas). */
  setLessonsPerDay: (grade: string, subject: string, day: Weekday, count: number) => void;
  /** Aulas num dia da semana, de uma turma da série. */
  setClassLessonsPerDay: (grade: string, subject: string, klass: string, day: Weekday, count: number) => void;
  setTerm: (number: number, patch: Partial<Pick<Term, "start" | "end">>) => void;
  setDisplay: (patch: Partial<Display>) => void;
  setLocation: (patch: Partial<Project["location"]>) => void;
  mergeHolidays: (fetched: Holiday[]) => void;
  addHoliday: (h: Holiday) => void;
  removeHoliday: (h: Holiday) => void;
  /**
   * Move linhas para a posição `overPosition` (0 = primeira linha da tabela). `ids` são as linhas movidas
   * (mantêm a ordem relativa); `activeId` é a que o professor pegou e é a que cai em `overPosition`.
   */
  moveRows: (documentId: string, activeId: string, overPosition: number, ids: string[]) => void;
  /** Copia uma linha com aula para logo abaixo dela; as de baixo descem uma posição. */
  cloneRow: (documentId: string, itemId: string) => void;
  /**
   * Remove uma linha da semana (vazia ou com conteúdo; quem pede confirmação é a interface). `itemId` é o id
   * dela na sequência, se tiver. Numa semana de uma linha só, a linha fica e só o conteúdo some.
   */
  removeRow: (documentId: string, target: { weekId: string; weekRows: number; itemId: string | null }) => void;
  restoreRows: (documentId: string) => void;
  /** Marca ou desmarca a aula como dada. Ao marcar, guarda o dia de hoje (ou `today`, AAAA-MM-DD). */
  setTaught: (documentId: string, lessonId: string, taught: boolean, today?: string) => void;
  /** Devolve as linhas à ordem do PDF (linhas escritas ou clonadas vão para o fim). Não mexe em linhas removidas. */
  resetRowOrder: (documentId: string) => void;
  /** Grava texto digitado numa linha. Em linha vazia, cria uma linha livre (`custom`) naquela posição. */
  setRowFields: (documentId: string, target: { itemId: string | null; position: number }, patch: Partial<Lesson>) => void;
  toggleColumn: (id: ColumnId) => void;
  moveColumn: (id: ColumnId, direction: -1 | 1) => void;
  /** Grava campos do relatório de uma série, matéria, turma e bimestre (só o que mudou). */
  setReport: (target: ReportTarget, patch: Partial<Report>) => void;
  /**
   * Copia o relatório de uma turma (ou série) para outra, trocando só a identificação: série e turma voltam ao valor
   * da turma de destino. O que o destino já tinha é substituído (quem pede confirmação é a interface).
   */
  copyReport: (from: ReportTarget, to: ReportTarget) => void;
  setReportImage: (kind: keyof ReportImages, value: ReportImages[keyof ReportImages]) => void;
  importProject: (p: Project) => void;
};

/** Ordem de todas as colunas: a salva, ou (dados antigos) as visíveis seguidas das ocultas na ordem padrão. */
export function columnOrderOf(p: Pick<Project, "columns" | "columnOrder">): ColumnId[] {
  const base = [...(p.columnOrder ?? p.columns), ...COLUMN_IDS];
  return base.filter((c, i) => base.indexOf(c) === i);
}

type State = Project & Actions & { storageWarning: string | null };

export const pickProject = (s: Project): Project => ({
  documents: s.documents,
  teacher: s.teacher,
  terms: s.terms,
  holidays: s.holidays,
  columns: s.columns,
  columnOrder: s.columnOrder,
  location: s.location,
  display: s.display,
  reports: s.reports,
  reportImages: s.reportImages,
});

export type ReportTarget = { grade: string; subject: string; klass: string; term: number };
const reportKeyOf = ({ grade, subject, klass, term }: ReportTarget) => reportKey(grade, subject, klass, term);

function updateAssignment(s: Project, grade: string, subject: string, fn: (a: Assignment) => Assignment): Pick<Project, "teacher"> {
  const current = assignmentFor(s.teacher, grade, subject);
  return { teacher: { ...s.teacher, assignments: s.teacher.assignments.map((a) => (a === current ? fn(a) : a)) } };
}

let docCounter = 0;
// Um PDF pode virar vários documentos no mesmo milissegundo: o contador mantém os ids únicos.
const newDocumentId = () => `doc-${Date.now().toString(36)}${(docCounter++).toString(36)}`;

const newDocument = (curriculum: Curriculum, fileName: string, klass: string): PlanDocument => ({
  id: newDocumentId(),
  fileName,
  klass,
  curriculum,
  rowOrder: curriculum.lessons.map((l) => l.id),
  removedRows: {},
  deletedLessons: [],
});

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Passa as guias e os relatórios de uma turma da série para outra (o destino já ocupado fica como está). */
function moveClass(s: Project, a: Assignment, from: string, to: string): Pick<Project, "documents" | "reports"> {
  const reports = { ...s.reports };
  for (const [key, value] of Object.entries(s.reports)) {
    const [grade, subject, klass, term] = key.split("|");
    if (grade === a.grade && subject === a.subject && klass === from) {
      delete reports[key];
      reports[reportKey(grade, subject, to, Number(term))] ??= value;
    }
  }
  return {
    documents: s.documents.map((d) =>
      sameName(d.curriculum.grade, a.grade) && sameName(d.curriculum.subject, a.subject) && d.klass === from ? { ...d, klass: to } : d,
    ),
    reports,
  };
}

function updateDocument(s: Project, id: string, fn: (d: PlanDocument) => PlanDocument): Pick<Project, "documents"> {
  return { documents: s.documents.map((d) => (d.id === id ? fn(d) : d)) };
}

/** Quantos passos o Ctrl+Z guarda (só em memória; recarregar a página zera). */
export const UNDO_LIMIT = 50;

export const useProject = create<State>()(
  persist(
    temporal(
    (set) => ({
      ...emptyProject,
      storageWarning: null,
      addDocument: (curriculum, fileName, klass = "") =>
        set((s) => ({ documents: [...s.documents, newDocument(curriculum, fileName, klass)] })),
      addGuide: (curriculum, fileName) =>
        set((s) => {
          const a = assignmentFor(s.teacher, curriculum.grade, curriculum.subject);
          const classes = a && a.classes.length > 0 ? a.classes : [""];
          return { documents: [...s.documents, ...classes.map((k) => newDocument(structuredClone(curriculum), fileName, k))] };
        }),
      copyGuide: ({ grade, subject }, from, to, terms) =>
        set((s) => {
          const mine = (d: PlanDocument, klass: string, term: number) =>
            d.curriculum.grade === grade && d.curriculum.subject === subject && d.klass === klass && d.curriculum.term === term;
          let documents = s.documents;
          const reports = { ...s.reports };
          for (const term of terms) {
            const source = s.documents.filter((d) => mine(d, from, term));
            if (source.length === 0) continue;
            for (const klass of to.filter((k) => k !== from)) {
              documents = [...documents.filter((d) => !mine(d, klass, term)), ...source.map((d) => ({ ...structuredClone(d), id: newDocumentId(), klass }))];
              const report = s.reports[reportKey(grade, subject, from, term)];
              const key = reportKey(grade, subject, klass, term);
              if (report) {
                // A identificação ("ano/série") volta a ser a da turma de destino.
                const { grade: written, ...rest } = structuredClone(report);
                void written;
                reports[key] = rest;
              } else delete reports[key];
            }
          }
          return { documents, reports };
        }),
      // Na edição os ids das aulas não mudam, então a ordem atual continua valendo.
      // `curriculum` traz só as aulas do PDF; as linhas livres do professor ficam como estão.
      editDocument: (id, curriculum) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id
              ? { ...d, curriculum: { ...curriculum, lessons: [...curriculum.lessons, ...d.curriculum.lessons.filter((l) => l.custom)] } }
              : d,
          ),
        })),
      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      setTeacherName: (name) => set((s) => ({ teacher: { ...s.teacher, name } })),
      setTeacherSchool: (school) => set((s) => ({ teacher: { ...s.teacher, school } })),
      addAssignment: (grade, subject) =>
        set((s) =>
          assignmentFor(s.teacher, grade, subject)
            ? s
            : { teacher: { ...s.teacher, assignments: [...s.teacher.assignments, { grade, subject, classes: [], classLessons: {}, lessonsPerDay: NO_LESSONS }] } },
        ),
      removeAssignment: (grade, subject) =>
        set((s) => ({ teacher: { ...s.teacher, assignments: s.teacher.assignments.filter((a) => a !== assignmentFor(s.teacher, grade, subject)) } })),
      setClasses: (grade, subject, classes) =>
        set((s) => {
          const a = assignmentFor(s.teacher, grade, subject);
          if (!a) return s;
          const next = [...new Set(classes.map((c) => c.trim().replace(/\|/g, "")).filter(Boolean))];
          const inSeries = (d: PlanDocument) => sameName(d.curriculum.grade, a.grade) && sameName(d.curriculum.subject, a.subject);
          let { documents, reports } = s;
          // Passa a separar turmas: a guia da série vira a da primeira turma. Deixa de separar: a da primeira turma vira a da série.
          // Turma que saiu perde a guia (aulas); o relatório dela continua salvo.
          if (a.classes.length === 0 && next.length > 0) ({ documents, reports } = moveClass(s, a, "", next[0]));
          else if (a.classes.length > 0 && next.length === 0) {
            documents = documents.filter((d) => !inSeries(d) || d.klass === a.classes[0]);
            ({ documents, reports } = moveClass({ ...s, documents }, a, a.classes[0], ""));
          } else documents = documents.filter((d) => !inSeries(d) || !a.classes.includes(d.klass) || next.includes(d.klass));
          // Turma que saiu perde o horário; turma nova começa com o da série.
          const classLessons = Object.fromEntries(Object.entries(a.classLessons).filter(([k]) => next.includes(k)));
          return {
            documents,
            reports,
            teacher: { ...s.teacher, assignments: s.teacher.assignments.map((x) => (x === a ? { ...a, classes: next, classLessons } : x)) },
          };
        }),
      setLessonsPerDay: (grade, subject, day, count) =>
        set((s) =>
          updateAssignment(s, grade, subject, (a) => ({
            ...a,
            lessonsPerDay: { ...a.lessonsPerDay, [day]: Math.min(9, Math.max(0, Math.trunc(count) || 0)) },
          })),
        ),
      setClassLessonsPerDay: (grade, subject, klass, day, count) =>
        set((s) =>
          updateAssignment(s, grade, subject, (a) =>
            a.classes.includes(klass)
              ? { ...a, classLessons: { ...a.classLessons, [klass]: { ...classLessonsPerDay(a, klass), [day]: Math.min(9, Math.max(0, Math.trunc(count) || 0)) } } }
              : a,
          ),
        ),
      setTerm: (number, patch) =>
        set((s) => {
          const current = s.terms.find((t) => t.number === number) ?? { number, start: "", end: "" };
          const next = { ...current, ...patch };
          return { terms: [...s.terms.filter((t) => t.number !== number), next].sort((a, b) => a.number - b.number) };
        }),
      setDisplay: (patch) => set((s) => ({ display: { ...s.display, ...patch } })),
      setLocation: (patch) => set((s) => ({ location: { ...s.location, ...patch } })),
      mergeHolidays: (fetched) => set((s) => ({ holidays: mergeFetched(s.holidays, fetched) })),
      addHoliday: (h) => set((s) => ({ holidays: [...s.holidays, h].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeHoliday: (h) =>
        set((s) => ({ holidays: s.holidays.filter((x) => !(x.date === h.date && x.name === h.name)) })),
      moveRows: (documentId, activeId, overPosition, ids) =>
        set((s) => updateDocument(s, documentId, (d) => {
          const seq = normalizeRowOrder(d.rowOrder, d.curriculum.lessons, d.deletedLessons);
          const rest = moveBlock(seq, activeId, overPosition, ids, newBlankId);
          if (!rest) return d;
          return { ...d, rowOrder: rest };
        })),
      cloneRow: (documentId, itemId) =>
        set((s) => updateDocument(s, documentId, (d) => {
          const source = d.curriculum.lessons.find((l) => l.id === itemId);
          if (!source) return d;
          const copy: Lesson = {
            ...structuredClone(source),
            id: `custom-${newBlankId().slice(6)}`,
            custom: true, // a cópia não conta como aula do PDF
          };
          const seq = normalizeRowOrder(d.rowOrder, d.curriculum.lessons, d.deletedLessons);
          seq.splice(seq.indexOf(itemId) + 1, 0, copy.id);
          return { ...d, curriculum: { ...d.curriculum, lessons: [...d.curriculum.lessons, copy] }, rowOrder: seq };
        })),
      removeRow: (documentId, { weekId, weekRows, itemId }) =>
        set((s) => updateDocument(s, documentId, (d) => {
          const lesson = itemId ? d.curriculum.lessons.find((l) => l.id === itemId) : undefined;
          const keepRow = weekRows <= 1; // toda semana mantém ao menos uma linha
          return {
            ...d,
            curriculum: lesson?.custom ? { ...d.curriculum, lessons: d.curriculum.lessons.filter((l) => l.id !== itemId) } : d.curriculum,
            deletedLessons: lesson && !lesson.custom ? [...d.deletedLessons, lesson.id] : d.deletedLessons,
            rowOrder: itemId ? normalizeRowOrder(d.rowOrder, d.curriculum.lessons, d.deletedLessons).filter((x) => x !== itemId) : d.rowOrder,
            removedRows: keepRow ? d.removedRows : { ...d.removedRows, [weekId]: (d.removedRows[weekId] ?? 0) + 1 },
          };
        })),
      setTaught: (documentId, lessonId, taught, today = format(new Date(), "yyyy-MM-dd")) =>
        set((s) => updateDocument(s, documentId, (d) => {
          const { [lessonId]: _gone, ...rest } = d.taught ?? {};
          void _gone;
          return { ...d, taught: taught ? { ...rest, [lessonId]: today } : rest };
        })),
      restoreRows: (documentId) => set((s) => updateDocument(s, documentId, (d) => ({ ...d, removedRows: {}, deletedLessons: [] }))),
      resetRowOrder: (documentId) => set((s) => updateDocument(s, documentId, (d) => ({ ...d, rowOrder: [] }))),
      setRowFields: (documentId, { itemId, position }, patch) =>
        set((s) => updateDocument(s, documentId, (d) => {
          const lessons = d.curriculum.lessons;
          const current = itemId ? lessons.find((l) => l.id === itemId) : undefined;
          if (current) {
            const next = { ...current, ...patch };
            // Linha livre que o professor esvaziou volta a ser uma linha em branco, no mesmo lugar.
            if (current.custom && isEmptyLesson(next)) {
              const blank = newBlankId();
              return {
                ...d,
                curriculum: { ...d.curriculum, lessons: lessons.filter((l) => l.id !== current.id) },
                rowOrder: normalizeRowOrder(d.rowOrder, lessons, d.deletedLessons).map((x) => (x === current.id ? blank : x)),
              };
            }
            return { ...d, curriculum: { ...d.curriculum, lessons: lessons.map((l) => (l.id === current.id ? next : l)) } };
          }
          const fresh: Lesson = { id: `custom-${newBlankId().slice(6)}`, number: 0, title: "", content: [], objectives: [], skills: [], essentialLearning: [], custom: true, ...patch };
          if (isEmptyLesson(fresh)) return d;
          const seq = normalizeRowOrder(d.rowOrder, lessons, d.deletedLessons);
          while (seq.length <= position) seq.push(newBlankId());
          seq[position] = fresh.id;
          return { ...d, curriculum: { ...d.curriculum, lessons: [...lessons, fresh] }, rowOrder: seq };
        })),
      toggleColumn: (id) =>
        set((s) => {
          const order = columnOrderOf(s);
          const on = new Set(s.columns);
          if (on.has(id)) {
            if (on.size <= 1) return s;
            on.delete(id);
          } else on.add(id);
          return { columns: order.filter((c) => on.has(c)), columnOrder: order };
        }),
      moveColumn: (id, direction) =>
        set((s) => {
          const neighbour = s.columns[s.columns.indexOf(id) + direction];
          if (!s.columns.includes(id) || neighbour === undefined) return s;
          const order = columnOrderOf(s);
          const moved = arrayMove(order, order.indexOf(id), order.indexOf(neighbour));
          return { columns: moved.filter((c) => s.columns.includes(c)), columnOrder: moved };
        }),
      setReport: (target, patch) =>
        set((s) => {
          const key = reportKeyOf(target);
          return { reports: { ...s.reports, [key]: { ...(s.reports[key] ?? { events: [] }), ...patch } } };
        }),
      copyReport: (from, to) =>
        set((s) => {
          const source = s.reports[reportKeyOf(from)];
          if (!source) return s;
          // A identificação ("ano/série") é a da turma de destino, não a que foi escrita na de origem.
          const { grade, ...rest } = structuredClone(source);
          void grade;
          return { reports: { ...s.reports, [reportKeyOf(to)]: rest } };
        }),
      setReportImage: (kind, value) => set((s) => ({ reportImages: { ...s.reportImages, [kind]: value } })),
      importProject: (p) => {
        set({ ...p, columnOrder: p.columnOrder, storageWarning: null });
        // Importar troca o projeto inteiro: desfazer não pode voltar ao projeto anterior.
        useProject.temporal.getState().clear();
      },
    }),
    // O histórico guarda só os dados do projeto, sem avisos nem funções.
    { limit: UNDO_LIMIT, partialize: (s) => pickProject(s), equality: shallow },
    ),
    {
      name: STORAGE_KEY,
      version: 2,
      // A conversão da versão 1 é feita pelo zod em `merge`; aqui só deixa o dado passar.
      migrate: (persisted) => persisted as State,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // reidratado no cliente, depois da primeira renderização (evita descompasso com o servidor)
      partialize: (s) => pickProject(s) as State,
      // O que vem do localStorage passa pelo zod (que também converte o formato da versão 1). Se não passar,
      // usa o estado vazio e avisa; não apaga nada sozinho.
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return current;
        const parsed = projectSchema.safeParse(persisted);
        if (parsed.success) return { ...current, ...parsed.data };
        return { ...current, storageWarning: "Os dados salvos neste navegador estão num formato que não reconheço. Importe uma exportação para recuperá-los." };
      },
    },
  ),
);
