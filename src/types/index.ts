import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const essentialLearningSchema = z.object({
  code: z.string(),
  text: z.string(),
});

export const lessonSchema = z.object({
  id: z.string().min(1),
  /** Número da aula no guia. 0 nas linhas livres que o professor escreveu. */
  number: z.number().int().nonnegative(),
  title: z.string(),
  content: z.array(z.string()),
  objectives: z.array(z.string()),
  skills: z.array(z.string()),
  essentialLearning: z.array(essentialLearningSchema),
  highlight: z.literal("project").optional(),
  /** Linha escrita pelo professor; não vem do PDF e não entra na contagem de aulas do guia. */
  custom: z.literal(true).optional(),
});
export type Lesson = z.infer<typeof lessonSchema>;

export const curriculumSchema = z.object({
  grade: z.string(),
  term: z.number().int().min(1).max(4),
  subject: z.string(),
  lessons: z.array(lessonSchema),
});
export type Curriculum = z.infer<typeof curriculumSchema>;

/** Leitura do PDF: o bimestre é `null` quando o PDF não diz qual é e o professor ainda não escolheu. */
export const parsedCurriculumSchema = curriculumSchema.extend({ term: curriculumSchema.shape.term.nullable() });
export type ParsedCurriculum = z.infer<typeof parsedCurriculumSchema>;

export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type Weekday = z.infer<typeof weekdaySchema>;

const perDayCount = z.number().int().min(0).max(9);
export const lessonsPerDaySchema = z.object({
  1: perDayCount,
  2: perDayCount,
  3: perDayCount,
  4: perDayCount,
  5: perDayCount,
});
export type LessonsPerDay = z.infer<typeof lessonsPerDaySchema>;
export const NO_LESSONS: LessonsPerDay = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Aulas por dia a partir dos dias marcados da versão mais antiga (`teachingDays`): cada dia vira 1 aula. */
const fromTeachingDays = (days: unknown): LessonsPerDay =>
  Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, Array.isArray(days) && days.includes(d) ? 1 : 0])) as LessonsPerDay;

const noPipe = (label: string) => z.string().trim().min(1).regex(/^[^|]*$/, `${label} não pode ter "|"`);

/**
 * O que o professor leciona: uma matéria numa série, com as turmas dela e as aulas que dá em cada dia da semana
 * (1 = segunda ... 5 = sexta; 0 = não leciona). O guia (PDF) e o horário valem para todas as turmas da série.
 */
export const assignmentSchema = z.object({
  grade: noPipe("A série"),
  subject: noPipe("A matéria"),
  /** Turmas da série em que leciona a matéria ("A", "B"). Vazio = não separa turma. */
  classes: z.array(noPipe("A turma")).default([]),
  /**
   * Aulas por dia de cada turma, pelo nome dela. Turma sem entrada usa `lessonsPerDay`. Entradas de turmas que
   * saíram de `classes` são ignoradas.
   */
  classLessons: z.record(z.string(), lessonsPerDaySchema).default({}),
  /** Horário da série quando não há turmas; nas turmas sem horário próprio, é o ponto de partida. */
  lessonsPerDay: lessonsPerDaySchema,
});
export type Assignment = z.output<typeof assignmentSchema>;

export const teacherSchema = z.object({
  name: z.string(),
  /** Nome da escola; aparece na identificação de todas as guias, até o professor escrever outro por cima numa guia. */
  school: z.string().optional(),
  assignments: z.array(assignmentSchema).default([]),
});
export type Teacher = z.output<typeof teacherSchema>;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** O que o professor leciona numa série e matéria. */
export const assignmentFor = (teacher: Teacher, grade: string, subject: string) =>
  teacher.assignments.find((a) => sameText(a.grade, grade) && sameText(a.subject, subject));

/** Aulas por dia de uma turma (ou da série, se `klass` é vazio); turma sem horário próprio usa o da série. */
export const classLessonsPerDay = (a: Assignment, klass: string): LessonsPerDay =>
  (klass !== "" ? a.classLessons[klass] : undefined) ?? a.lessonsPerDay;

/**
 * Aulas por dia da matéria na série; 0 em todos os dias se o professor ainda não informou. Sem `klass` e com turmas,
 * vale a primeira turma (o cronograma ainda é um só por série; passa a ser por turma na etapa seguinte).
 */
export const lessonsPerDayFor = (teacher: Teacher, grade: string, subject: string, klass?: string): LessonsPerDay => {
  const a = assignmentFor(teacher, grade, subject);
  return a ? classLessonsPerDay(a, klass ?? a.classes[0] ?? "") : NO_LESSONS;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Versões anteriores guardavam um horário só (`lessonsPerDay`), depois um por série (`lessonsPerDayByGrade`), e a
 * matéria era sempre a do PDF. Cada par série e matéria que já tem PDF vira uma atribuição, com o horário que a série tinha.
 */
export function upgradeLegacyAssignments(raw: unknown): unknown {
  if (!isRecord(raw) || !isRecord(raw.teacher) || "assignments" in raw.teacher) return raw;
  const { teacher } = raw;
  const parsedGeneral = lessonsPerDaySchema.safeParse(teacher.lessonsPerDay);
  const general = parsedGeneral.success ? parsedGeneral.data : fromTeachingDays(teacher.teachingDays);
  const byGrade = isRecord(teacher.lessonsPerDayByGrade) ? teacher.lessonsPerDayByGrade : {};
  const seen = new Set<string>();
  const assignments: unknown[] = [];
  for (const doc of Array.isArray(raw.documents) ? raw.documents : []) {
    const c = isRecord(doc) && isRecord(doc.curriculum) ? doc.curriculum : undefined;
    if (typeof c?.grade !== "string" || typeof c.subject !== "string" || c.grade === "" || c.subject === "") continue;
    const key = `${c.grade}|${c.subject}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const own = lessonsPerDaySchema.safeParse(byGrade[c.grade]);
    assignments.push({ grade: c.grade, subject: c.subject, classes: [], lessonsPerDay: own.success ? own.data : general });
  }
  return { ...raw, teacher: { name: typeof teacher.name === "string" ? teacher.name : "", assignments } };
}

export const termSchema = z.object({
  number: z.number().int().min(1).max(4),
  start: isoDate,
  end: isoDate,
});
export type Term = z.infer<typeof termSchema>;

export const holidaySchema = z.object({
  date: isoDate,
  name: z.string(),
  scope: z.enum(["national", "state", "municipal", "manual"]),
  source: z.string(),
});
export type Holiday = z.infer<typeof holidaySchema>;

export const weekSchema = z.object({
  id: z.string(),
  start: isoDate,
  end: isoDate,
  teachingDays: z.number().int().nonnegative(),
  /** Soma das aulas que o professor dá nos dias da semana: é o peso na distribuição. */
  lessonSlots: z.number().int().nonnegative().default(0),
  lessonCount: z.number().int().nonnegative(),
});
export type Week = z.infer<typeof weekSchema>;

export const scheduleSchema = z.object({
  termNumber: z.number().int().min(1).max(4),
  weeks: z.array(weekSchema),
  order: z.array(z.string()),
});
export type Schedule = z.infer<typeof scheduleSchema>;

export const COLUMN_IDS = [
  "schedule",
  "number",
  "content",
  "objectives",
  "skills",
  "essentialLearning",
] as const;
export const columnIdSchema = z.enum(COLUMN_IDS);
export type ColumnId = z.infer<typeof columnIdSchema>;

export const COLUMN_LABELS: Record<ColumnId, string> = {
  schedule: "Cronograma",
  number: "Aula",
  content: "Conteúdo",
  objectives: "Objetivos de aprendizagem",
  skills: "Habilidades",
  essentialLearning: "Aprendizagem Essencial",
};

export const locationSchema = z.object({
  uf: z.string(),
  city: z.string(),
});
export type Location = z.infer<typeof locationSchema>;

/** O que mostrar além da sigla: texto em cada célula e/ou legenda abaixo da tabela. */
export const displaySchema = z.object({
  skillsInline: z.boolean(),
  skillsLegend: z.boolean(),
  essentialInline: z.boolean(),
  essentialLegend: z.boolean(),
});
export type Display = z.infer<typeof displaySchema>;
export const DEFAULT_DISPLAY: Display = {
  skillsInline: false,
  skillsLegend: false,
  essentialInline: true,
  essentialLegend: false,
};

/** Um PDF enviado: as aulas lidas e a ordem atual delas (o que o arrastar altera). */
export const documentObjectSchema = z.object({
  id: z.string().min(1),
  fileName: z.string(),
  /** Turma a que esta guia pertence ("" quando a série não separa turmas). Cada turma tem a sua cópia das aulas. */
  klass: z.string().default(""),
  curriculum: curriculumSchema,
  /**
   * Sequência das linhas da tabela, de cima para baixo: ids de aulas (do PDF ou livres) e ids de
   * linhas em branco (`blank-…`). A semana de cada linha sai das semanas do bimestre, não daqui.
   */
  rowOrder: z.array(z.string()),
  /** Linhas vazias que o professor removeu, por semana. */
  removedRows: z.record(z.string(), z.number().int().nonnegative()),
  /** Aulas do PDF que o professor removeu da tabela; ficam fora da sequência até "Restaurar". */
  deletedLessons: z.array(z.string()),
});

/** Versões anteriores chamavam a sequência de `lessonOrder` e não tinham `removedRows`. */
export function upgradeLegacyDocument(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const { lessonOrder, ...rest } = raw as { lessonOrder?: unknown; rowOrder?: unknown; removedRows?: unknown; deletedLessons?: unknown };
  return { ...rest, rowOrder: rest.rowOrder ?? lessonOrder ?? [], removedRows: rest.removedRows ?? {}, deletedLessons: rest.deletedLessons ?? [] };
}
export const documentSchema = z.preprocess(upgradeLegacyDocument, documentObjectSchema);
export type PlanDocument = z.infer<typeof documentObjectSchema>;

/**
 * Antes as turmas dividiam a mesma guia. Cada documento sem `klass` vira uma cópia por turma da série e matéria dele
 * (a primeira turma fica com o id original); sem turmas, fica com `klass` vazio.
 */
export function upgradeClassDocuments(raw: unknown): unknown {
  if (!isRecord(raw) || !Array.isArray(raw.documents)) return raw;
  const assignments = isRecord(raw.teacher) && Array.isArray(raw.teacher.assignments) ? raw.teacher.assignments : [];
  const classesOf = (grade: unknown, subject: unknown): string[] => {
    const a = assignments.find((x) => isRecord(x) && x.grade === grade && x.subject === subject);
    return isRecord(a) && Array.isArray(a.classes) ? a.classes.filter((k): k is string => typeof k === "string" && k !== "") : [];
  };
  const documents = raw.documents.flatMap((d): unknown[] => {
    if (!isRecord(d) || "klass" in d) return [d];
    const c = isRecord(d.curriculum) ? d.curriculum : {};
    const classes = classesOf(c.grade, c.subject);
    if (classes.length === 0) return [{ ...d, klass: "" }];
    return classes.map((klass, i) => ({ ...structuredClone(d), id: i === 0 ? d.id : `${String(d.id)}-${klass}`, klass }));
  });
  return { ...raw, documents };
}

/** Versão anterior guardava um só `curriculum` + `lessonOrder`: vira um documento. */
function upgradeLegacyProject(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || "documents" in raw || !("curriculum" in raw)) return raw;
  const { curriculum, lessonOrder, ...rest } = raw as { curriculum: unknown; lessonOrder?: unknown };
  const lessons = (curriculum as { lessons?: { id: string }[] } | null)?.lessons;
  if (!curriculum || !lessons) return { ...rest, documents: [] };
  const order = Array.isArray(lessonOrder) ? lessonOrder : lessons.map((l) => l.id);
  return { ...rest, documents: [{ id: "doc-1", fileName: "", curriculum, rowOrder: order, removedRows: {}, deletedLessons: [] }] };
}

const imageDataUrl = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, "Imagem inválida");
/** `null` = sem imagem própria (vale a padrão de public/img, se houver); `"none"` = o professor removeu e deixou vazio. */
const reportImage = z.union([imageDataUrl, z.literal("none")]).nullable();

/** Imagens do relatório, guardadas como data URL (ficam no navegador, como o resto dos dados). */
export const reportImagesSchema = z.object({
  /** Faixa que se repete no topo de cada página. */
  banner: reportImage,
  schoolLogo: reportImage,
});
export type ReportImages = z.infer<typeof reportImagesSchema>;
export const NO_REPORT_IMAGES: ReportImages = { banner: null, schoolLogo: null };

export const reportEventSchema = z.object({
  text: z.string(),
  /** Texto livre: "26/04" ou "10/06 a 25/06". */
  date: z.string(),
});
export type ReportEvent = z.infer<typeof reportEventSchema>;

/** Campos de texto do relatório. Os que o professor ainda não editou ficam fora e caem no valor padrão. */
export const REPORT_TEXT_FIELDS = [
  "school",
  "teacher",
  "subject",
  "grade",
  "termLabel",
  "justification",
  "objectives",
  "socioemotional",
  "transversal",
  "autodidactic",
  "cooperative",
  "complementary",
  "principles",
  "criteria",
  "referencesTeacher",
  "referencesStudent",
] as const;
export type ReportTextField = (typeof REPORT_TEXT_FIELDS)[number];

export const reportSchema = z.object({
  ...Object.fromEntries(REPORT_TEXT_FIELDS.map((f) => [f, z.string().optional()])),
  events: z.array(reportEventSchema).default([]),
} as { [F in ReportTextField]: z.ZodOptional<z.ZodString> } & { events: z.ZodDefault<z.ZodArray<typeof reportEventSchema>> });
export type Report = z.output<typeof reportSchema>;

/** Chave de `reports`: série, matéria, turma ("" quando a série não separa turmas) e bimestre ("1ª série|História|A|2"). */
export const reportKey = (grade: string, subject: string, klass: string, term: number) => `${grade}|${subject}|${klass}|${term}`;

/**
 * Versões anteriores guardavam o relatório só pelo bimestre ("2") e depois por série e bimestre ("1ª série|2"). Cada um
 * passa para as séries e matérias que têm PDF naquele bimestre, sem turma. Sem PDF no bimestre, fica como está (não
 * aparece, mas também não se perde).
 */
export function upgradeLegacyReports(raw: unknown): unknown {
  if (!isRecord(raw) || !isRecord(raw.reports) || !Array.isArray(raw.documents)) return raw;
  const pairs = raw.documents.flatMap((d) => {
    const c = isRecord(d) && isRecord(d.curriculum) ? d.curriculum : undefined;
    return typeof c?.grade === "string" && typeof c.subject === "string" && typeof c.term === "number"
      ? [{ grade: c.grade, subject: c.subject, term: c.term }]
      : [];
  });
  const next: Record<string, unknown> = {};
  // A chave mais específica vence: as atuais, depois "série|bimestre", por último só o bimestre.
  const bySpecificity = Object.entries(raw.reports).sort(([a], [b]) => b.split("|").length - a.split("|").length);
  for (const [key, value] of bySpecificity) {
    const parts = key.split("|");
    const term = Number(parts[parts.length - 1]);
    const legacy = (parts.length === 1 || parts.length === 2) && /^\d$/.test(parts[parts.length - 1]);
    if (!legacy) {
      next[key] = value;
      continue;
    }
    const targets = pairs.filter((p) => p.term === term && (parts.length === 1 || p.grade === parts[0]));
    if (targets.length === 0) next[key] = value;
    for (const t of targets) next[reportKey(t.grade, t.subject, "", term)] ??= structuredClone(value);
  }
  return { ...raw, reports: next };
}

/** Estado do projeto: é o que vai para o localStorage e para o JSON exportado. */
export const projectObjectSchema = z.object({
  documents: z.array(documentSchema),
  teacher: teacherSchema,
  terms: z.array(termSchema),
  holidays: z.array(holidaySchema),
  columns: z.array(columnIdSchema),
  location: locationSchema,
  // Dados salvos antes desta opção existir não têm o campo: entram com o padrão.
  display: displaySchema.default(DEFAULT_DISPLAY),
  /** Relatório (guia de aprendizagem) de cada série, matéria, turma e bimestre, pela chave de `reportKey`. */
  reports: z.record(z.string(), reportSchema).default({}),
  reportImages: reportImagesSchema.default(NO_REPORT_IMAGES),
});
export const projectSchema = z.preprocess((raw) => upgradeLegacyReports(upgradeClassDocuments(upgradeLegacyAssignments(upgradeLegacyProject(raw)))), projectObjectSchema);
export type Project = z.infer<typeof projectObjectSchema>;
