"use client";

import { HolidaysBlock } from "./HolidaysBlock";
import { OutputBlock } from "./OutputBlock";
import { TeacherBlock } from "./TeacherBlock";
import { TermsBlock } from "./TermsBlock";

/** Só o que vale para tudo: professor, calendário da escola, feriados, colunas e saída. Matérias e PDF ficam na área principal. */
export function Sidebar({ activeGrade, activeSubject, activeKlass, activeTerm }: {
  /** Série, matéria, turma e bimestre na tela; `null` quando a tela mostra todas. */
  activeGrade: string | null;
  activeSubject: string | null;
  activeKlass: string | null;
  activeTerm: number | null;
}) {
  return (
    <aside
      aria-label="Configurações"
      className="w-full shrink-0 space-y-6 border-r border-border bg-sidebar p-5 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto print:hidden"
    >
      <TeacherBlock />
      <TermsBlock />
      <HolidaysBlock />
      <OutputBlock activeGrade={activeGrade} activeSubject={activeSubject} activeKlass={activeKlass} activeTerm={activeTerm} />
    </aside>
  );
}
