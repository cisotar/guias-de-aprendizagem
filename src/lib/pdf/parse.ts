import { parsedCurriculumSchema, type Lesson, type ParsedCurriculum } from "@/types";
import { normalizeGrade } from "@/lib/schedule/grades";
import type { PageData, TextItem } from "./types";

export class PdfParseError extends Error {}

const HEADERS = ["Aula", "Conteúdo", "Objetivos de aprendizagem", "Habilidades", "Aprendizagem Essencial"] as const;
const near = (a: number, b: number, tol = 1.5) => Math.abs(a - b) <= tol;
const BULLET = /^[•·●▪-]$/;

type Line = { y: number; x: number; text: string; bullet: boolean };

/** Junta os trechos que estão na mesma linha (mesmo y) e marca se começa com marcador. */
function toLines(items: TextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; parts: TextItem[] }[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && near(last.y, it.y, 2)) last.parts.push(it);
    else lines.push({ y: it.y, parts: [it] });
  }
  return lines.map(({ y, parts }) => {
    parts.sort((a, b) => a.x - b.x);
    const bullet = BULLET.test(parts[0].str.trim());
    const rest = bullet ? parts.slice(1) : parts;
    return {
      y,
      x: parts[0].x,
      bullet,
      text: rest.map((p) => p.str.trim()).join(" ").replace(/\s+/g, " ").trim(),
    };
  }).filter((l) => l.text || l.bullet);
}

/**
 * Tópicos de uma célula. Novo tópico: linha com marcador, ou linha em maiúscula logo depois
 * de uma linha que termina em ")" (caso da aula 4). O resto é continuação da linha anterior.
 * Isso é uma heurística: a tela de conferência existe para corrigir o que ela errar.
 */
function toTopics(lines: Line[]): string[] {
  const topics: string[] = [];
  for (const line of lines) {
    const prev = topics[topics.length - 1];
    const startsNew =
      line.bullet || prev === undefined || (/^\p{Lu}/u.test(line.text) && prev.endsWith(")"));
    if (startsNew) topics.push(line.text);
    else topics[topics.length - 1] = `${prev} ${line.text}`;
  }
  return topics.filter(Boolean);
}

function toEssentialLearning(lines: Line[]): Lesson["essentialLearning"] {
  const out: { code: string; text: string }[] = [];
  for (const { text } of lines) {
    const m = /^(AE\d+)\s*[-–]\s*(.*)$/.exec(text);
    if (m) out.push({ code: m[1], text: m[2] });
    else if (out.length) out[out.length - 1].text += ` ${text}`;
  }
  return out;
}

type Table = {
  columns: [number, number][]; // faixas x das 5 colunas
  rows: { y0: number; y1: number; project: boolean }[]; // de cima para baixo
};

const isWhite = (c: string) => c.toLowerCase() === "#ffffff";

/** Acha a grade da tabela pelos retângulos preenchidos: cabeçalho define colunas, primeira coluna define linhas. */
function findTable(page: PageData, headerCells: TextItem[]): Table | null {
  const aula = headerCells[0];
  const cells = page.rects.filter(
    (r) => r.x1 - r.x0 > 15 && r.y1 - r.y0 > 10 && r.x1 - r.x0 < page.width * 0.9 && r.y1 - r.y0 < page.height * 0.9,
  );
  const header = cells.find((r) => aula.x >= r.x0 && aula.x <= r.x1 && aula.y >= r.y0 && aula.y <= r.y1);
  if (!header) return null;
  const headerRow = cells.filter((r) => near(r.y0, header.y0) && near(r.y1, header.y1));
  const columns = headerRow
    .map((r): [number, number] => [r.x0, r.x1])
    .sort((a, b) => a[0] - b[0]);
  if (columns.length !== 5) return null;

  // Cada linha da tabela começa por uma célula encostada na borda esquerda (o número da aula).
  const left = columns[0][0];
  const bands = cells
    .filter((r) => near(r.x0, left, 2) && r.y1 <= header.y0 + 1.5)
    .sort((a, b) => b.y1 - a.y1)
    .map((r) => ({
      y0: r.y0,
      y1: r.y1,
      // Aulas de projeto têm as demais células em lilás; as outras ficam em branco.
      project: cells.some(
        (c) => c.x0 > left + 2 && near(c.y0, r.y0, 2) && near(c.y1, r.y1, 2) && !isWhite(c.fill),
      ),
    }));
  return { columns, rows: bands };
}

type RawRow = { cells: TextItem[][]; project: boolean };

function readRows(page: PageData, pageNumber: number): RawRow[] {
  const find = (label: string) => page.items.find((i) => i.str.trim() === label);
  const headerCells = HEADERS.map(find);
  const missing = HEADERS.filter((_, i) => !headerCells[i]);
  if (missing.length) {
    throw new PdfParseError(`Não encontrei a coluna ${missing[0]} na página ${pageNumber}.`);
  }
  const table = findTable(page, headerCells as TextItem[]);
  if (!table) throw new PdfParseError(`Não consegui montar a grade da tabela na página ${pageNumber}.`);

  return table.rows.map((row) => {
    const inRow = page.items.filter((i) => i.y >= row.y0 - 1 && i.y <= row.y1 + 1);
    const cells = table.columns.map(([x0, x1]) => inRow.filter((i) => i.x >= x0 - 1 && i.x < x1));
    return { cells, project: row.project };
  });
}

/** Lê "1ª série" e "4º Bimestre" do cabeçalho da página; `null` no que a página não diz. */
function readLabels(page: PageData) {
  const text = page.items.map((i) => i.str).join(" ");
  const grade = /(\d+\s*ª\s*série)/i.exec(text)?.[1];
  const found = Number(/(\d)º\s*Bimestre/i.exec(text)?.[1] ?? 0);
  return { grade: grade ? normalizeGrade(grade) : null, term: found >= 1 && found <= 4 ? found : null };
}

/**
 * Lê as aulas do PDF, uma leitura por série e bimestre (o PDF pode trazer vários). Cada página diz a série e o
 * bimestre no cabeçalho; página que não diz continua a anterior. Se o PDF não diz o bimestre, `term` vem `null`
 * e o professor escolhe na conferência (o mesmo vale para a série, que vem vazia).
 */
export function parsePages(pages: PageData[]): ParsedCurriculum[] {
  if (pages.length === 0) throw new PdfParseError("O PDF não tem páginas.");

  const groups = new Map<string, { grade: string; term: number | null; lessons: Lesson[] }>();
  let label: { grade: string | null; term: number | null } = { grade: null, term: null };
  pages.forEach((page, p) => {
    // O que a página não diz continua valendo da página anterior.
    const read = readLabels(page);
    label = { grade: read.grade ?? label.grade, term: read.term ?? label.term };
    const key = `${label.grade ?? ""}|${label.term ?? ""}`;
    const group = groups.get(key) ?? { grade: label.grade ?? "", term: label.term, lessons: [] };
    groups.set(key, group);
    const { lessons } = group;

    for (const row of readRows(page, p + 1)) {
      const [numberCell, titleOnlyCell, content, objectives, skills, essential] = splitRow(row.cells);
      const numberText = numberCell.map((i) => i.str).join("").trim();
      const number = /^\d+$/.test(numberText) ? Number(numberText) : null;
      const cont = {
        title: toLines(titleOnlyCell).map((l) => l.text).join(" "),
        content: toTopics(toLines(content)),
        objectives: toTopics(toLines(objectives)),
        skills: toLines(skills).flatMap((l) => l.text.split(/[\s,;]+/)).filter((s) => /^EM\d+/.test(s)),
        essentialLearning: toEssentialLearning(toLines(essential)),
      };
      if (number === null) {
        // Linha que continua da página anterior: acrescenta à última aula da mesma série e bimestre.
        const last = lessons[lessons.length - 1];
        if (!last) continue;
        last.content.push(...cont.content);
        last.objectives.push(...cont.objectives);
        last.skills.push(...cont.skills);
        last.essentialLearning.push(...cont.essentialLearning);
        continue;
      }
      lessons.push({
        id: `lesson-${number}`,
        number,
        ...cont,
        ...(row.project ? { highlight: "project" as const } : {}),
      });
    }
  });

  const found = [...groups.values()].filter((g) => g.lessons.length > 0);
  if (found.length === 0) throw new PdfParseError("Não encontrei nenhuma aula na tabela.");
  // O PDF não diz a matéria: quem envia escolhe (`readCurriculumPdf`).
  return found.map((g) => parsedCurriculumSchema.parse({ ...g, subject: "" }));
}

/**
 * A primeira coluna do cabeçalho (“Aula”) cobre duas células no corpo: o número, à esquerda,
 * e o título. Separa pelo menor x do título: o número é o texto só de dígitos.
 */
function splitRow(cells: TextItem[][]): TextItem[][] {
  const [aula, ...rest] = cells;
  const number = aula.filter((i) => /^\d+$/.test(i.str.trim()) && i.x < Math.min(...aula.map((a) => a.x)) + 15);
  const title = aula.filter((i) => !number.includes(i));
  return [number, title, ...rest];
}
