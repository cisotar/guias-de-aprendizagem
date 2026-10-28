import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPages } from "./extract";
import { parsePages, PdfParseError } from "./parse";

const fixture = (name: string) => path.resolve(import.meta.dirname, "../../../tests/fixtures", name);

async function load(name = "guia-geografia-1serie-4bim.pdf") {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(fixture(name))) }).promise;
  return extractPages(doc, OPS);
}

/** PDF de um bimestre só: a única leitura. */
async function readOne() {
  const all = parsePages(await load());
  expect(all).toHaveLength(1);
  return all[0];
}

describe("parsePages (guia de Geografia, 1ª série, 4º bimestre)", () => {
  it("lê série, bimestre e 12 aulas", async () => {
    const c = await readOne();
    expect(c).toMatchObject({ grade: "1ª série", term: 4 });
    expect(c.lessons.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("lê os cinco campos da aula 1", async () => {
    const [l1] = (await readOne()).lessons;
    expect(l1.title).toBe("Sistema Econômico de Mercado");
    expect(l1.content).toEqual(["Sistema Econômico de Mercado (capitalismo)"]);
    expect(l1.objectives).toEqual([
      "Analisar o conceito de Sistema Econômico de Mercado e suas características fundamentais.",
      "Identificar o papel dos agentes econômicos, como consumidores, produtores e o mercado competitivo.",
    ]);
    expect(l1.skills).toEqual(["EM13CHS306"]);
    expect(l1.essentialLearning).toHaveLength(1);
    expect(l1.essentialLearning[0].code).toBe("AE6");
    expect(l1.essentialLearning[0].text).toMatch(/^Comparar os impactos .* sustentabilidade\.$/);
  });

  it("aula 4 tem dois conteúdos", async () => {
    const l4 = (await readOne()).lessons[3];
    expect(l4.content).toEqual([
      "Blocos econômicos (UE, Mercosul, USMCA)",
      "Empresas transnacionais e seu papel no capitalismo global",
    ]);
  });

  it("aula 10 tem duas AEs", async () => {
    const l10 = (await readOne()).lessons[9];
    expect(l10.essentialLearning.map((a) => a.code)).toEqual(["AE1", "AE6"]);
  });

  it("aulas 11 e 12 são de projeto", async () => {
    const { lessons } = await readOne();
    expect(lessons.filter((l) => l.highlight === "project").map((l) => l.number)).toEqual([11, 12]);
  });

  it("PDF sem bimestre no cabeçalho: lê as aulas e deixa o bimestre em branco", async () => {
    const pages = await load();
    for (const p of pages) p.items = p.items.filter((i) => !/Bimestre/i.test(i.str));
    const all = parsePages(pages);
    expect(all).toHaveLength(1);
    expect(all[0].term).toBeNull();
    expect(all[0].lessons).toHaveLength(12);
  });

  it("falha com mensagem clara quando falta uma coluna", async () => {
    const pages = await load();
    pages[0].items = pages[0].items.filter((i) => i.str !== "Habilidades");
    expect(() => parsePages(pages)).toThrow(/coluna Habilidades na página 1/);
    expect(() => parsePages(pages)).toThrow(PdfParseError);
  });
});

describe("parsePages (PDF com várias séries e bimestres)", () => {
  it("separa uma leitura por série e bimestre, na ordem do PDF", async () => {
    const all = parsePages(await load("guia-geografia-1e2serie-todos.pdf"));
    expect(all.map((c) => `${c.grade} ${c.term}`)).toEqual([
      "1ª série 1", "1ª série 2", "1ª série 3", "1ª série 4",
      "2ª série 1", "2ª série 2", "2ª série 3", "2ª série 4",
    ]);
  });

  it("cada bimestre recomeça na aula 1, sem aulas repetidas, e a tabela que passa de página continua no mesmo bimestre", async () => {
    const all = parsePages(await load("guia-geografia-1e2serie-todos.pdf"));
    for (const c of all) {
      const numbers = c.lessons.map((l) => l.number);
      expect(numbers[0]).toBe(1);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      expect(new Set(numbers).size).toBe(numbers.length);
    }
    expect(all[0].lessons.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("marcadores colados ao texto viram um tópico cada, sem '•' sobrando no texto", async () => {
    const all = parsePages(await load("guia-geografia-1e2serie-todos.pdf"));
    for (const c of all) {
      for (const l of c.lessons) expect([...l.content, ...l.objectives].some((t) => /[•●▪]/.test(t))).toBe(false);
    }
    const [l1] = all[0].lessons;
    expect(l1.content).toEqual(["Diferenças entre climatologia e meteorologia.", "Conceitos de tempo e clima."]);
    expect(l1.objectives).toHaveLength(2);
  });
});
