import { describe, expect, it } from "vitest";
import { essentialLegend, skillLegend } from "./legend";
import { BNCC_SKILLS } from "@/lib/skills/bncc";
import type { Lesson } from "@/types";

const lesson = (n: number, skills: string[], ae: string[]): Lesson => ({
  id: `l${n}`, number: n, title: "", content: [], objectives: [], skills,
  essentialLearning: ae.map((code) => ({ code, text: `texto ${code}` })),
});

describe("legendas", () => {
  const lessons = [lesson(1, ["EM13CHS306"], ["AE6"]), lesson(2, ["EM13CHS404", "EM13CHS306"], ["AE4", "AE6"]), lesson(3, ["EM13CHS999"], [])];
  it("habilidades sem repetir, na ordem de aparição, e sinaliza as sem texto", () => {
    const r = skillLegend(lessons, BNCC_SKILLS);
    expect(r.map((e) => e.code)).toEqual(["EM13CHS306", "EM13CHS404", "EM13CHS999"]);
    expect(r[0].text).toMatch(/^Contextualizar, comparar e avaliar/);
    expect(r[2].text).toBeNull();
  });
  it("aprendizagens essenciais sem repetir", () => {
    expect(essentialLegend(lessons).map((e) => e.code)).toEqual(["AE6", "AE4"]);
  });
  it("a BNCC tem as habilidades do guia", () => {
    for (const c of ["EM13CHS302", "EM13CHS304", "EM13CHS306", "EM13CHS403", "EM13CHS404"]) expect(BNCC_SKILLS[c]).toBeTruthy();
  });
});
