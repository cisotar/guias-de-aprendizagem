"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { HolidaysBlock } from "./HolidaysBlock";
import { OutputBlock } from "./OutputBlock";
import { TeacherBlock } from "./TeacherBlock";
import { TermsBlock } from "./TermsBlock";

const OPEN_KEY = "cronograma-geografia:sidebar-aberta";

/** Recolhida ou não é preferência deste navegador: fica fora do projeto e do JSON exportado. */
function readOpen(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * Só o que vale para tudo: professor, calendário da escola, feriados, colunas e saída. Matérias e PDF ficam na área principal.
 * Em telas largas uma faixa na borda, do topo ao pé da tela, recolhe e reexibe a barra com animação.
 */
export function Sidebar({ activeGrade, activeSubject, activeKlass, activeTerm }: {
  /** Série, matéria, turma e bimestre na tela; `null` quando a tela mostra todas. */
  activeGrade: string | null;
  activeSubject: string | null;
  activeKlass: string | null;
  activeTerm: number | null;
}) {
  const [open, setOpenState] = useState(readOpen);
  const setOpen = (value: boolean) => {
    setOpenState(value);
    try {
      window.localStorage.setItem(OPEN_KEY, value ? "1" : "0");
    } catch {
      // sem acesso ao storage: a escolha vale só nesta visita
    }
  };

  return (
    <div className="flex shrink-0 flex-col lg:sticky lg:top-0 lg:h-screen lg:flex-row print:hidden">
      <div className={cn("overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none", open ? "lg:w-80" : "lg:w-0")}>
        <aside
          id="barra-lateral"
          aria-label="Configurações"
          // `inert` tira a barra recolhida da ordem do Tab e dos leitores de tela.
          inert={!open}
          // `relative` prende as caixas de seleção invisíveis (position: absolute) aqui dentro; sem isso elas vazam e a página inteira rola.
          className="relative w-full shrink-0 space-y-6 border-r border-border bg-sidebar p-5 lg:h-screen lg:w-80 lg:overflow-y-auto"
        >
          <Link href="/tutorial/" className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold text-primary hover:bg-muted">
            <CircleHelp aria-hidden className="size-4" /> Como usar o app
          </Link>
          <TeacherBlock />
          <TermsBlock />
          <HolidaysBlock />
          <OutputBlock activeGrade={activeGrade} activeSubject={activeSubject} activeKlass={activeKlass} activeTerm={activeTerm} />
        </aside>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="barra-lateral"
        aria-label={open ? "Ocultar a barra lateral" : "Mostrar a barra lateral"}
        title={open ? "Ocultar a barra lateral" : "Mostrar a barra lateral"}
        onClick={() => setOpen(!open)}
        className="hidden w-5 shrink-0 items-center justify-center border-r border-border bg-muted text-muted-foreground transition-[width,background-color] duration-200 hover:w-7 hover:bg-accent hover:text-foreground focus-visible:w-7 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none lg:flex"
      >
        {open ? <ChevronsLeft aria-hidden className="size-4" /> : <ChevronsRight aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
