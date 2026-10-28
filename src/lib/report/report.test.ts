import { describe, expect, it } from "vitest";
import { derivedDefaults, reportValue, REPORT_DEFAULTS } from "./defaults";
import { fitSize } from "./image";
import { parseList, splitLinks } from "./list";

describe("parseList", () => {
  it("uma linha por item, ignorando linhas vazias e marcadores digitados", () => {
    expect(parseList("- Um\n\n● Dois  \n")).toEqual([{ text: "Um", level: 0 }, { text: "Dois", level: 0 }]);
  });
  it("recuo de dois espaços ou Tab desce um nível, no máximo até o terceiro", () => {
    expect(parseList("A\n  B\n\t\tC\n      D").map((i) => i.level)).toEqual([0, 1, 2, 2]);
  });
});

describe("splitLinks", () => {
  it("separa o link e deixa a pontuação final fora dele", () => {
    expect(splitLinks("veja https://youtu.be/x?v=1.")).toEqual([
      { text: "veja " },
      { text: "https://youtu.be/x?v=1", href: "https://youtu.be/x?v=1" },
      { text: "." },
    ]);
  });
  it("texto sem link volta inteiro", () => {
    expect(splitLinks("sem link")).toEqual([{ text: "sem link" }]);
  });
});

describe("fitSize", () => {
  it("reduz mantendo a proporção e não aumenta", () => {
    expect(fitSize(4000, 800, 2000, 400)).toEqual({ width: 2000, height: 400 });
    expect(fitSize(100, 50, 400, 400)).toEqual({ width: 100, height: 50 });
    expect(fitSize(1000, 2000, 400, 400)).toEqual({ width: 200, height: 400 });
  });
});

describe("reportValue", () => {
  const derived = derivedDefaults({ teacherName: "Ana", curriculum: undefined, term: { number: 2, start: "2024-04-22", end: "2024-07-05" }, termNumber: 2 });
  it("usa o derivado até o professor escrever", () => {
    expect(reportValue(undefined, "teacher", derived)).toBe("Ana");
    expect(reportValue(undefined, "termLabel", derived)).toBe("2º Bimestre/2024");
    expect(reportValue({ teacher: "Beto", events: [] }, "teacher", derived)).toBe("Beto");
  });
  it("nome da escola vem da barra lateral; campo derivado apagado na guia volta ao derivado", () => {
    const withSchool = derivedDefaults({ teacherName: "Ana", schoolName: "E. E. Exemplo", curriculum: undefined, term: undefined, termNumber: 1 });
    expect(reportValue(undefined, "school", withSchool)).toBe("E. E. Exemplo");
    expect(reportValue({ school: "Outra", events: [] }, "school", withSchool)).toBe("Outra");
    expect(reportValue({ school: "", teacher: " ", events: [] }, "school", withSchool)).toBe("E. E. Exemplo");
    expect(reportValue({ school: "", teacher: " ", events: [] }, "teacher", withSchool)).toBe("Ana");
  });
  it("texto apagado pelo professor continua vazio, não volta ao padrão", () => {
    expect(reportValue({ socioemotional: "", events: [] }, "socioemotional", derived)).toBe("");
    expect(reportValue(undefined, "socioemotional", derived)).toBe(REPORT_DEFAULTS.socioemotional);
  });
});
