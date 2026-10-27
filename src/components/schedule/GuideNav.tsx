"use client";

import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/dates";
import { filterOptions, guideStatus, targetKey, type FilterKey, type GuideFilter, type GuideStatus, type GuideTarget } from "@/lib/schedule/guides";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project";

/** O que o professor escolhe primeiro: "subject" (matéria), "grade" (série) ou "term" (bimestre, e vê as guias dele). */
export type ViewMode = "subject" | "grade" | "term";

/** Ordem dos dropdowns de cada visão (no bimestre, o dropdown de bimestre vem antes destes). */
export const FILTER_ORDER: Record<ViewMode, FilterKey[]> = {
  subject: ["subject", "grade", "klass"],
  grade: ["grade", "subject", "klass"],
  term: ["subject", "grade", "klass"],
};

const FILTER_LABEL: Record<FilterKey, string> = { subject: "Matéria", grade: "Série", klass: "Turma" };

const TERMS = [1, 2, 3, 4];

const statusText: Record<GuideStatus, string> = { none: "Falta o PDF", ready: "Guia pronta", edited: "Editada" };
const statusClass: Record<GuideStatus, string> = {
  none: "bg-amber-100 text-amber-900",
  ready: "bg-emerald-100 text-emerald-900",
  edited: "bg-teal-100 text-teal-900",
};

export function StatusPill({ status }: { status: GuideStatus }) {
  return <span className={cn("inline-block self-start rounded-full px-2.5 py-0.5 text-xs font-bold", statusClass[status])}>{statusText[status]}</span>;
}

/** Os três botões "Ver por". */
export function ModeToggle({ mode, onMode }: { mode: ViewMode; onMode: (m: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Ver por" className="flex items-center gap-2 text-sm print:hidden">
      <span className="font-bold">Ver por</span>
      {([["subject", "Matéria"], ["grade", "Série"], ["term", "Bimestre"]] as const).map(([m, label]) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onMode(m)}
          className={cn("lift min-h-10 rounded-lg border px-4 font-bold", mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Datas do bimestre ("14/04 a 04/07") ou o que falta. */
export function useTermDates() {
  const terms = useProject((s) => s.terms);
  return (n: number) => {
    const t = terms.find((x) => x.number === n);
    return t && t.start !== "" && t.end !== "" && t.end > t.start ? `${shortDate(t.start)} a ${shortDate(t.end)}` : "faltam datas";
  };
}

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

function FilterSelect({ id, label, value, disabled, children, onChange }: { id: string; label: string; value: string; disabled?: boolean; children: React.ReactNode; onChange: (v: string) => void }) {
  return (
    <div className="flex min-w-44 flex-1 flex-col gap-1 sm:max-w-60">
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground">{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={selectClass}>{children}</select>
    </div>
  );
}

/**
 * Dropdowns matéria, série e turma, na ordem da visão (na visão bimestre, o de bimestre vem antes). Começam vazios:
 * o primeiro precisa ser escolhido para liberar os outros, e cada um lista só o que existe dentro dos anteriores.
 */
export function GuideFilters({ mode, targets, filter, term, onFilter }: {
  mode: ViewMode;
  targets: GuideTarget[];
  filter: GuideFilter;
  term?: { value: number | null; onChange: (n: number | null) => void };
  onFilter: (key: FilterKey, value: string | undefined) => void;
}) {
  const order = FILTER_ORDER[mode];
  const dates = useTermDates();
  const ready = term ? term.value !== null : true;
  const first = ready && filter[order[0]] !== undefined;
  return (
    <div role="group" aria-label="Escolher guia" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 print:hidden">
      {term && (
        <FilterSelect id="filtro-bimestre" label="Bimestre" value={term.value === null ? "" : String(term.value)} onChange={(v) => term.onChange(v === "" ? null : Number(v))}>
          <option value="">Selecione…</option>
          {TERMS.map((n) => <option key={n} value={n}>{n}º bimestre · {dates(n)}</option>)}
        </FilterSelect>
      )}
      {order.map((key, i) => {
        const options = filterOptions(targets, order, key, filter).filter((o) => key !== "klass" || o !== "");
        const empty = key === "klass" && first && options.length === 0;
        // O primeiro dropdown da ordem (ou o de bimestre) abre a seleção; os demais esperam por ele.
        const isFirst = i === 0;
        return (
          <FilterSelect
            key={key}
            id={`filtro-${key}`}
            label={FILTER_LABEL[key]}
            value={filter[key] ?? ""}
            disabled={isFirst ? !ready : !first || empty}
            onChange={(v) => onFilter(key, v === "" ? undefined : v)}
          >
            <option value="">{isFirst ? "Selecione…" : empty ? "Sem turmas" : "Todas"}</option>
            {options.map((o) => <option key={o} value={o}>{key === "klass" ? `Turma ${o}` : o}</option>)}
          </FilterSelect>
        );
      })}
    </div>
  );
}

/** Uma guia por cartão, agrupadas (por série ou por matéria), cada uma com os quatro bimestres. */
export function TargetCards({ targets, groupBy, onOpen, onUpload }: { targets: GuideTarget[]; groupBy: "grade" | "subject"; onOpen: (t: GuideTarget, term: number) => void; onUpload: (t: GuideTarget) => void }) {
  const documents = useProject((s) => s.documents);
  const reports = useProject((s) => s.reports);
  const dates = useTermDates();
  const groups = [...new Set(targets.map((t) => t[groupBy]))];
  if (groups.length === 0) return <p role="status" className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-muted-foreground">Nenhuma guia com essa escolha.</p>;
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group} aria-label={group} className="space-y-2">
          <h2 className="text-xl font-bold">{group}</h2>
          <ul className="flex flex-wrap gap-3">
            {targets.filter((t) => t[groupBy] === group).map((t) => (
              <li key={targetKey(t)} className="flex w-full max-w-sm min-w-64 flex-1 flex-col gap-2 rounded-xl border border-border bg-card p-3">
                <p className="font-bold">{groupBy === "grade" ? `${t.subject} · ` : ""}{groupBy === "subject" ? `${t.grade} · ` : ""}{t.klass ? `Turma ${t.klass}` : "Sem turmas"}</p>
                {TERMS.map((n) => {
                  const status = guideStatus(documents, reports, t, n);
                  return (
                    <div key={n} className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-sm font-bold">{n}º bimestre <StatusPill status={status} /></span>
                        <span className="text-xs text-muted-foreground">{dates(n)}</span>
                      </div>
                      <Button variant="outline" className="h-9" onClick={() => (status === "none" ? onUpload(t) : onOpen(t, n))}>
                        {status === "none" ? "Enviar PDF" : "Abrir guia"}
                      </Button>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Os quatro bimestres de uma guia, cada um com o que falta; o aberto fica marcado. */
export function TermStrip({ target, activeTerm, onTerm, onUpload }: { target: GuideTarget; activeTerm: number | null; onTerm: (n: number) => void; onUpload: () => void }) {
  const documents = useProject((s) => s.documents);
  const reports = useProject((s) => s.reports);
  const dates = useTermDates();
  return (
    <section aria-label="Bimestres" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
      {TERMS.map((n) => {
        const status = guideStatus(documents, reports, target, n);
        const open = n === activeTerm;
        return (
          <div key={n} className={cn("lift flex flex-col gap-1.5 rounded-xl border bg-card p-3", open ? "border-2 border-primary bg-primary/10 p-[11px] shadow-md ring-2 ring-primary/30" : "border-border")}>
            <p className="font-bold">{n}º bimestre</p>
            <StatusPill status={status} />
            <p className="text-[13px] leading-[18px] text-muted-foreground">{dates(n)}</p>
            {status === "none" ? (
              <Button variant="outline" className="h-10" onClick={onUpload}>Enviar PDF</Button>
            ) : (
              <Button variant="outline" className="h-10" aria-pressed={open} onClick={() => onTerm(n)}>{open ? "Aberta abaixo" : "Abrir guia"}</Button>
            )}
          </div>
        );
      })}
    </section>
  );
}
