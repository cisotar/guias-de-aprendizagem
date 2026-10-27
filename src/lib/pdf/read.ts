import { extractPages } from "./extract";
import { parsePages, PdfParseError } from "./parse";
import type { ParsedCurriculum } from "@/types";

/** Lê o PDF no navegador (uma leitura por série e bimestre) e dá a elas a matéria que o professor escolheu: o PDF não diz. O pdf.js só é carregado aqui, na hora do envio. */
export async function readCurriculumPdf(file: File, subject: string): Promise<ParsedCurriculum[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new PdfParseError("Não consegui abrir este arquivo como PDF.");
  }
  return parsePages(await extractPages(doc, pdfjs.OPS)).map((c) => ({ ...c, subject }));
}
