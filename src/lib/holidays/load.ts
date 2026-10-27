import Holidays from "date-holidays";
import type { Holiday } from "@/types";
import { dedupeHolidays, fromBrasilApi } from "./normalize";

function offline(year: number, uf: string): Holiday[] {
  const national = new Holidays("BR").getHolidays(year).filter((h) => h.type === "public");
  const nationalKeys = new Set(national.map((h) => h.date.slice(0, 10)));
  const state = new Holidays("BR", uf)
    .getHolidays(year)
    .filter((h) => h.type === "public" && !nationalKeys.has(h.date.slice(0, 10)));
  const map = (list: typeof national, scope: Holiday["scope"]): Holiday[] =>
    list.map((h) => ({ date: h.date.slice(0, 10), name: h.name, scope, source: "date-holidays" }));
  return [...map(national, "national"), ...map(state, "state")];
}

// Nacionais: BrasilAPI. Se falhar, cai para o cálculo offline. Estaduais: sempre offline.
export async function loadHolidays(year: number, uf: string): Promise<Holiday[]> {
  let national: Holiday[] = [];
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(String(res.status));
    national = fromBrasilApi(await res.json());
  } catch {
    national = [];
  }
  const fallback = offline(year, uf || "SP");
  const state = uf ? fallback.filter((h) => h.scope === "state") : [];
  const base = national.length ? national : fallback.filter((h) => h.scope === "national");
  return dedupeHolidays([...base, ...state]);
}
