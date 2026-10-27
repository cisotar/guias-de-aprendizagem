import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PageData, Rect, TextItem } from "./types";

/** Códigos de operador do pdf.js (`OPS`), passados por quem chama: a build do navegador e a do Node são diferentes. */
export type PdfOps = Record<string, number>;

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** a ∘ b: aplica b e depois a (convenção do PDF: novo CTM = m × CTM). */
function multiply(m: Matrix, ctm: Matrix): Matrix {
  return [
    m[0] * ctm[0] + m[1] * ctm[2],
    m[0] * ctm[1] + m[1] * ctm[3],
    m[2] * ctm[0] + m[3] * ctm[2],
    m[2] * ctm[1] + m[3] * ctm[3],
    m[4] * ctm[0] + m[5] * ctm[2] + ctm[4],
    m[4] * ctm[1] + m[5] * ctm[3] + ctm[5],
  ];
}

function isMatrix(a: unknown): a is Matrix {
  return Array.isArray(a) && a.length === 6 && a.every((n) => typeof n === "number");
}

/** Pontos de um caminho no formato [tipo, x, y, tipo, x, y, ..., 4] do pdf.js. */
function pathPoints(data: ArrayLike<number>): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let i = 0;
  while (i < data.length) {
    const op = data[i];
    if (op === 0 || op === 1) {
      pts.push({ x: data[i + 1], y: data[i + 2] });
      i += 3;
    } else if (op === 2) {
      pts.push({ x: data[i + 5], y: data[i + 6] });
      i += 7;
    } else {
      i += 1;
    }
  }
  return pts;
}

async function extractRects(
  page: Awaited<ReturnType<PDFDocumentProxy["getPage"]>>,
  OPS: PdfOps,
): Promise<Rect[]> {
  const list = await page.getOperatorList();
  const rects: Rect[] = [];
  const stack: Matrix[] = [];
  let ctm = IDENTITY;
  let fill = "#000000";
  let pending: { x0: number; y0: number; x1: number; y1: number } | null = null;

  list.fnArray.forEach((fn, i) => {
    const args = list.argsArray[i] as unknown[] | null;
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === OPS.transform && args && isMatrix(args)) ctm = multiply(args, ctm);
    else if (fn === OPS.setFillRGBColor && args && typeof args[0] === "string") fill = args[0];
    else if (fn === OPS.constructPath && args) {
      const data = (args[1] as ArrayLike<number>[] | undefined)?.[0];
      if (!data) return;
      const pts = pathPoints(data).map((p) => ({
        x: p.x * ctm[0] + p.y * ctm[2] + ctm[4],
        y: p.x * ctm[1] + p.y * ctm[3] + ctm[5],
      }));
      if (pts.length < 4) return;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      pending = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      // O pdf.js põe o preenchimento no próprio constructPath nas versões novas; o retângulo vale por si.
      rects.push({ ...pending, fill });
    }
  });
  return rects;
}

export async function extractPages(doc: PDFDocumentProxy, ops: PdfOps): Promise<PageData[]> {
  const pages: PageData[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [x0, y0, x1, y1] = page.view;
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width });
    }
    pages.push({ width: x1 - x0, height: y1 - y0, items, rects: await extractRects(page, ops) });
  }
  return pages;
}
