import { z } from "zod";
import { buildSchedule } from "@/lib/schedule/build";
import { sortDocuments } from "@/lib/schedule/grades";
import { essentialLegend, skillLegend } from "@/lib/schedule/legend";
import { buildRows } from "@/lib/schedule/rows";
import { BNCC_SKILLS } from "@/lib/skills/bncc";
import {
  COLUMN_LABELS,
  documentObjectSchema,
  upgradeLegacyDocument,
  upgradeClassDocuments,
  upgradeLegacyAssignments,
  upgradeLegacyReports,
  projectObjectSchema,
  projectSchema,
  scheduleSchema,
  type PlanDocument,
  type Project,
} from "@/types";

const exportDocumentSchema = z.preprocess(
  upgradeLegacyDocument,
  documentObjectSchema.extend({ schedule: scheduleSchema.nullable().optional() }),
);

export const exportFileSchema = z.object({
  schemaVersion: z.literal(3),
  exportedAt: z.string(),
  teacher: projectObjectSchema.shape.teacher,
  terms: projectObjectSchema.shape.terms,
  documents: z.array(exportDocumentSchema),
  holidays: projectObjectSchema.shape.holidays,
  columns: projectObjectSchema.shape.columns,
  location: projectObjectSchema.shape.location,
  display: projectObjectSchema.shape.display,
  reports: projectObjectSchema.shape.reports,
  reportImages: projectObjectSchema.shape.reportImages,
});
export type ExportFile = z.infer<typeof exportFileSchema>;

function scheduleOf(project: Project, doc: PlanDocument) {
  const term = project.terms.find((t) => t.number === doc.curriculum.term);
  const result = buildSchedule(doc.curriculum, project.teacher, term, doc);
  return result.ok ? result.schedule : null;
}

export function toExportFile(project: Project, now = new Date()): ExportFile {
  return {
    schemaVersion: 3,
    exportedAt: now.toISOString(),
    teacher: project.teacher,
    terms: project.terms,
    documents: project.documents.map((d) => ({ ...d, schedule: scheduleOf(project, d) })),
    holidays: project.holidays,
    columns: project.columns,
    location: project.location,
    display: project.display,
    reports: project.reports,
    reportImages: project.reportImages,
  };
}

/**
 * Lê um JSON exportado e devolve o projeto, ou lança um erro do zod.
 * Arquivos da versão 1 (um só `curriculum`) também entram.
 */
export function fromExportFile(raw: unknown): Project {
  if (typeof raw === "object" && raw !== null && (raw as { schemaVersion?: unknown }).schemaVersion === 1) {
    const { schedule, ...v1 } = raw as { schedule?: { order?: unknown } | null };
    return projectSchema.parse({ ...v1, lessonOrder: schedule?.order }) as Project;
  }
  // A versão 2 tinha um horário por série e nenhuma matéria à parte: o mesmo upgrade do localStorage a converte.
  const upgraded = upgradeLegacyReports(upgradeClassDocuments(upgradeLegacyAssignments(raw)));
  const f = exportFileSchema.parse(
    typeof upgraded === "object" && upgraded !== null && (upgraded as { schemaVersion?: unknown }).schemaVersion === 2 ? { ...upgraded, schemaVersion: 3 } : upgraded,
  );
  return {
    documents: f.documents.map(({ schedule, ...d }) => {
      void schedule; // só leitura; o cronograma é recalculado
      return d;
    }),
    teacher: f.teacher,
    terms: f.terms,
    holidays: f.holidays,
    columns: f.columns,
    location: f.location,
    display: f.display,
    reports: f.reports,
    reportImages: f.reportImages,
  };
}

const br = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

const cellEscape = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Tabela em Markdown de um documento, com as colunas escolhidas, na ordem escolhida. */
function documentMarkdown(project: Project, doc: PlanDocument): string {
  const { curriculum } = doc;
  const term = project.terms.find((t) => t.number === curriculum.term);
  const result = buildSchedule(curriculum, project.teacher, term, doc);
  const cols = project.columns;
  const title = `# ${curriculum.subject} · ${doc.klass ? `${curriculum.grade} ${doc.klass}` : curriculum.grade} · ${curriculum.term}º bimestre${doc.fileName ? ` (${doc.fileName})` : ""}`;
  const header = `| ${cols.map((c) => COLUMN_LABELS[c]).join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |`;
  if (!result.ok) return `${title}\n\n${result.error}\n`;
  const rows = buildRows(result.schedule, curriculum.lessons).map((r) => {
    const l = r.lesson;
    const value = (c: (typeof cols)[number]) => {
      if (c === "schedule") return `${br(r.week.start)} a ${br(r.week.end)}`;
      if (!l) return c === "number" ? "sem aula prevista" : "";
      switch (c) {
        case "number": return l.number > 0 ? `${l.number} – ${l.title}` : l.title;
        case "content": return l.content.join("; ");
        case "objectives": return l.objectives.join("; ");
        case "skills":
          return project.display.skillsInline
            ? l.skills.map((c) => `${c} - ${BNCC_SKILLS[c] ?? "descrição não encontrada"}`).join("; ")
            : l.skills.join(", ");
        case "essentialLearning":
          return l.essentialLearning.map((a) => (project.display.essentialInline ? `${a.code} - ${a.text}` : a.code)).join(project.display.essentialInline ? "; " : ", ");
      }
    };
    return `| ${cols.map((c) => cellEscape(value(c))).join(" | ")} |`;
  });
  const by = project.teacher.name ? `Professor(a): ${project.teacher.name}\n\n` : "";
  const used = buildRows(result.schedule, curriculum.lessons).flatMap((r) => (r.lesson ? [r.lesson] : []));
  const legends: string[] = [];
  if (project.display.skillsLegend && cols.includes("skills")) {
    legends.push(`**Habilidades**\n\n${skillLegend(used, BNCC_SKILLS).map((e) => `- ${e.code}: ${e.text ?? "descrição não encontrada"}`).join("\n")}`);
  }
  if (project.display.essentialLegend && cols.includes("essentialLearning")) {
    legends.push(`**Aprendizagens Essenciais**\n\n${essentialLegend(used).map((e) => `- ${e.code}: ${e.text}`).join("\n")}`);
  }
  const tail = legends.length ? `\n${legends.join("\n\n")}\n` : "";
  return `${title}\n\n${by}${header}\n${rows.join("\n")}\n${tail}`;
}

/** Markdown dos documentos de uma série, matéria e/ou bimestre (sem filtro, todos), por série, matéria e bimestre. */
export function toMarkdown(project: Project, filter: { grade?: string; subject?: string; klass?: string; term?: number } = {}): string {
  return sortDocuments(project.documents)
    .filter(
      (d) =>
        (filter.grade === undefined || d.curriculum.grade === filter.grade) &&
        (filter.subject === undefined || d.curriculum.subject === filter.subject) &&
        (filter.klass === undefined || d.klass === filter.klass) &&
        (filter.term === undefined || d.curriculum.term === filter.term),
    )
    .map((d) => documentMarkdown(project, d))
    .join("\n");
}
