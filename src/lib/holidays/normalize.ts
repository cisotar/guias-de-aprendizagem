import { z } from "zod";
import { holidaySchema, type Holiday } from "@/types";

export const brasilApiSchema = z.array(
  z.object({ date: z.string(), name: z.string(), type: z.string().optional() }),
);

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function fromBrasilApi(raw: unknown): Holiday[] {
  return brasilApiSchema
    .parse(raw)
    .map((h) => ({ date: h.date, name: h.name, scope: "national" as const, source: "brasilapi" }));
}

/** Remove repetidos por data e nome (sem diferenciar maiúsculas), mantendo o primeiro, e ordena por data. */
export function dedupeHolidays(list: Holiday[]): Holiday[] {
  const seen = new Set<string>();
  const out: Holiday[] = [];
  for (const h of list) {
    const key = `${h.date}|${h.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(holidaySchema.parse(h));
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** Une a lista salva com a nova: busca nova substitui o que não é manual, e o manual fica. */
export function mergeFetched(current: Holiday[], fetched: Holiday[]): Holiday[] {
  return dedupeHolidays([...current.filter((h) => h.scope === "manual"), ...fetched]);
}
