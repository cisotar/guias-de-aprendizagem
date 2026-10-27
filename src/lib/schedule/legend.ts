import type { Lesson } from "@/types";

export type LegendEntry = { code: string; text: string | null };

/** Códigos usados nas aulas, sem repetir, na ordem em que aparecem na tabela. */
export function skillLegend(lessons: Lesson[], texts: Record<string, string>): LegendEntry[] {
  const seen = new Set<string>();
  const out: LegendEntry[] = [];
  for (const l of lessons) {
    for (const code of l.skills) {
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({ code, text: texts[code] ?? null });
    }
  }
  return out;
}

export function essentialLegend(lessons: Lesson[]): LegendEntry[] {
  const seen = new Set<string>();
  const out: LegendEntry[] = [];
  for (const l of lessons) {
    for (const ae of l.essentialLearning) {
      if (seen.has(ae.code)) continue;
      seen.add(ae.code);
      out.push({ code: ae.code, text: ae.text });
    }
  }
  return out;
}
