/**
 * Gera as imagens de public/tutorial/ usadas pela rota /tutorial.
 * Uso manual (o Playwright não é dependência do projeto):
 *   npm i --no-save playwright && npm run dev   (outro terminal)
 *   node scripts/tutorial-screenshots.cjs [url] [caminho-do-chrome]
 * Só usa dados fictícios e o PDF de exemplo de tests/fixtures.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public", "tutorial");
const url = process.argv[2] ?? "http://localhost:3000";
const executablePath = process.argv[3];
const fixture = path.join(root, "tests", "fixtures", "guia-geografia-1serie-4bim.pdf");
const shot = (name) => path.join(out, name);

(async () => {
  // 01: página real do Escopo - Sequência (fixture) como imagem.
  execFileSync("pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "1", "-singlefile", fixture, shot("01-escopo-sequencia")]);

  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: "pt-BR" });
  await ctx.addInitScript(() => sessionStorage.setItem("welcome-modal-seen", "1"));
  const page = await ctx.newPage();

  // 02: ilustração da janela de impressão do navegador (não dá para capturar a janela nativa).
  const dlg = await ctx.newPage();
  await dlg.setViewportSize({ width: 1060, height: 640 });
  await dlg.goto("file://" + path.join(__dirname, "print-dialog.html"));
  await dlg.locator(".win").screenshot({ path: shot("02-janela-imprimir.png") });
  await dlg.close();

  await page.goto(url);
  // Esconde o selo do Next em desenvolvimento e os avisos temporários.
  await page.addStyleTag({ content: "nextjs-portal, [data-sonner-toaster] { display: none !important; }" });
  const aside = page.locator("#barra-lateral");
  await page.locator("#teacher-name").fill("Maria Souza");
  await page.locator("#teacher-school").fill("E.E. Professor Exemplo");
  const dates = [["2026-02-02", "2026-04-17"], ["2026-04-27", "2026-07-03"], ["2026-07-27", "2026-09-30"], ["2026-10-05", "2026-12-18"]];
  for (let n = 1; n <= 4; n++) {
    await page.locator(`#t${n}-start`).fill(dates[n - 1][0]);
    await page.locator(`#t${n}-end`).fill(dates[n - 1][1]);
  }
  await page.screenshot({ path: shot("07-barra-lateral.png"), clip: { x: 0, y: 0, width: 320, height: 860 } });

  // 03: Minhas matérias
  await page.getByLabel("Nova matéria").fill("Geografia");
  await page.getByRole("button", { name: "Adicionar matéria" }).click();
  await page.locator("main").screenshot({ path: shot("03-materias.png") });

  // 04: turmas e aulas por semana
  await page.getByRole("button", { name: /1ª série ›/ }).click();
  for (const k of ["A", "B"]) {
    await page.getByLabel(/Separar em turmas|Nova turma/).fill(k);
    await page.getByRole("button", { name: "Turma", exact: true }).click();
  }
  await page.getByLabel(/Separar em turmas|Nova turma/).fill("");
  await page.getByLabel("Aulas de Geografia, 1ª série A na segunda-feira").fill("2");
  await page.getByLabel("Aulas de Geografia, 1ª série A na quarta-feira").fill("1");
  await page.getByLabel("Aulas de Geografia, 1ª série B na terça-feira").fill("2");
  await page.getByLabel("Aulas de Geografia, 1ª série B na quinta-feira").fill("1");
  await page.getByRole("heading", { name: "1. Turmas e aulas por semana" }).locator("xpath=ancestor::section[1]").screenshot({ path: shot("04-turmas.png") });

  // 05 e 06: envio do PDF e conferência
  const pdfSection = page.getByRole("heading", { name: /2. PDF do Escopo/ }).locator("xpath=ancestor::section[1]");
  await pdfSection.screenshot({ path: shot("05-enviar-pdf.png") });
  await page.getByLabel("Escolher arquivo PDF").setInputFiles(fixture);
  const review = page.getByRole("dialog");
  await review.waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot("06-conferir-leitura.png") });
  await review.getByRole("button", { name: "Usar estas aulas" }).click();
  await review.waitFor({ state: "hidden" });

  // 08: cronograma
  await page.getByRole("button", { name: "Cronograma", exact: true }).click();
  await page.locator("table").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy(0, -20));
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot("08-cronograma.png") });

  // 09 e 10: colunas e saída
  const output = aside.locator("section").filter({ has: page.getByRole("heading", { name: "Colunas e saída" }) });
  await output.scrollIntoViewIfNeeded();
  await output.screenshot({ path: shot("09-colunas.png") });
  await page.getByRole("button", { name: "Exportar dados" }).evaluate((el) => { el.style.outline = "4px solid #b3203f"; el.style.outlineOffset = "3px"; });
  await page.getByRole("button", { name: "Exportar dados" }).locator("xpath=..").screenshot({ path: shot("10-exportar-dados.png") });

  await browser.close();
})();
