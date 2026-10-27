"use client";

import { parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { useProject } from "@/store/project";
import { Block, fieldClass } from "./Block";

export function TermsBlock() {
  const terms = useProject((s) => s.terms);
  const documents = useProject((s) => s.documents);
  const setTerm = useProject((s) => s.setTerm);
  return (
    <Block title="Bimestres">
      <p className="text-[13px] leading-[18px] text-muted-foreground">Calendário da escola: as datas valem para todas as matérias, séries e turmas.</p>
      {[1, 2, 3, 4].map((n) => {
        const term = terms.find((t) => t.number === n);
        const invalid = !!term?.start && !!term.end && parseISO(term.end) <= parseISO(term.start);
        return (
          <fieldset key={n} className="space-y-1.5">
            <legend className="text-sm font-medium">
              {n}º bimestre{documents.some((d) => d.curriculum.term === n) ? " (com PDF)" : ""}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`t${n}-start`} className="text-[13px]">Início</Label>
                <input
                  id={`t${n}-start`}
                  type="date"
                  className={fieldClass}
                  value={term?.start ?? ""}
                  onChange={(e) => setTerm(n, { start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`t${n}-end`} className="text-[13px]">Fim</Label>
                <input
                  id={`t${n}-end`}
                  type="date"
                  className={fieldClass}
                  value={term?.end ?? ""}
                  aria-invalid={invalid}
                  onChange={(e) => setTerm(n, { end: e.target.value })}
                />
              </div>
            </div>
            {invalid && (
              <p role="alert" className="text-[13px] leading-[18px] text-destructive">
                O fim precisa ser depois do início.
              </p>
            )}
          </fieldset>
        );
      })}
    </Block>
  );
}
