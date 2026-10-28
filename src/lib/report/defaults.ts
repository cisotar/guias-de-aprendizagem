import type { Curriculum, Report, ReportTextField, Term } from "@/types";

/** Textos que vêm preenchidos como no modelo do guia; o professor edita à vontade. */
export const REPORT_DEFAULTS: Record<ReportTextField, string> = {
  school: "",
  teacher: "",
  subject: "",
  grade: "",
  termLabel: "",
  justification: "",
  objectives: "",
  socioemotional: [
    "Abertura ao novo", "Amabilidade", "Organização", "Foco", "Responsabilidade", "Determinação",
    "Iniciativa social", "Assertividade", "Imaginação criativa", "Curiosidade para aprender", "Tolerância à frustração",
  ].join("\n"),
  transversal: [
    "Pluralidade Cultural", "Trabalho e Consumo", "Meio Ambiente", "Multiculturalismo", "Cidadania e Civismo", "Economia",
  ].join("\n"),
  autodidactic: [
    "CMSP", "Trabalhos", "Pesquisas", "Exercícios do Caderno do Aluno", "Realização das tarefas de classe e casa",
  ].join("\n"),
  cooperative: [
    "Aula dialogada", "Atividades em grupo", "Análise de textos", "Pesquisas", "Vídeos", "Textos paradidáticos",
  ].join("\n"),
  complementary: [
    "Consolidação: uso do livro didático, projeção de filmes, textos diversos, atividades personalizadas.",
    "Reforço: atividades extras, conforme a necessidade dos alunos.",
    "Ampliação: realizar mapas mentais dos conteúdos seguintes:",
  ].join("\n"),
  principles: [
    "Corresponsabilidade", "Protagonismo", "Replicabilidade", "Formação continuada", "Excelência em gestão",
    "Educação Interdimensional", "A pedagogia da Presença", "Os quatro pilares da educação para o século XXI", "Protagonismo Juvenil",
  ].join("\n"),
  criteria: [
    "Avaliações institucionais", "Trabalhos e provas", "Avaliação em processo", "Avaliação dissertativa e objetiva",
    "Avaliações multidisciplinares realizadas durante o bimestre", "Participação e interesse no desenvolvimento de atividades propostas", "Tarefas SP",
  ].join("\n"),
  referencesTeacher: "Slides disponíveis no CMSP",
  referencesStudent: "Slides disponíveis no CMSP",
};

/** Valores que o app já sabe (PDF, professor, bimestre); aparecem até o professor escrever por cima. */
export function derivedDefaults(context: { teacherName: string; schoolName?: string; curriculum: Curriculum | undefined; klass?: string; term: Term | undefined; termNumber: number }) {
  const { teacherName, schoolName = "", curriculum, klass, term, termNumber } = context;
  const year = term?.start.slice(0, 4);
  return {
    school: schoolName,
    teacher: teacherName,
    subject: curriculum?.subject ?? "",
    grade: curriculum ? `${curriculum.grade}${klass ? ` ${klass}` : ""}` : "",
    termLabel: `${termNumber}º Bimestre${year ? `/${year}` : ""}`,
  } satisfies Partial<Record<ReportTextField, string>>;
}

/**
 * Valor de um campo: o que o professor escreveu, senão o derivado, senão o texto do modelo. Campo derivado
 * apagado na guia (texto vazio) volta a mostrar o derivado (nome do professor e da escola da barra lateral).
 */
export function reportValue(report: Report | undefined, field: ReportTextField, derived: Partial<Record<ReportTextField, string>>): string {
  const own = report?.[field];
  if (own !== undefined && !(own.trim() === "" && derived[field])) return own;
  return derived[field] ?? REPORT_DEFAULTS[field];
}
