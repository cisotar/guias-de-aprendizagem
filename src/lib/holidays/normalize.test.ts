import { describe, expect, it } from "vitest";
import { dedupeHolidays, fromBrasilApi, mergeFetched } from "./normalize";
import type { Holiday } from "@/types";

const h = (date: string, name: string, scope: Holiday["scope"] = "national"): Holiday => ({ date, name, scope, source: "t" });

describe("holidays", () => {
  it("normaliza a resposta da BrasilAPI", () => {
    expect(fromBrasilApi([{ date: "2026-09-07", name: "Independência do Brasil", type: "national" }])).toEqual([
      { date: "2026-09-07", name: "Independência do Brasil", scope: "national", source: "brasilapi" },
    ]);
  });
  it("rejeita formato inesperado", () => {
    expect(() => fromBrasilApi({ message: "erro" })).toThrow();
  });
  it("deduplica por data e nome e ordena", () => {
    const r = dedupeHolidays([h("2026-11-15", "Proclamação"), h("2026-09-07", "Independência"), h("2026-11-15", "proclamação")]);
    expect(r.map((x) => x.date)).toEqual(["2026-09-07", "2026-11-15"]);
  });
  it("busca nova mantém os feriados manuais", () => {
    const r = mergeFetched([h("2026-10-20", "Aniversário da cidade", "manual"), h("2026-09-07", "Velho")], [h("2026-09-07", "Novo")]);
    expect(r.map((x) => x.name)).toEqual(["Novo", "Aniversário da cidade"]);
  });
});
