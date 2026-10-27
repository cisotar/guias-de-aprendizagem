"use client";

import { useMemo, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "@/components/schedule/EditableCell";
import { classLabel } from "@/lib/schedule/guides";
import { derivedDefaults, reportValue } from "@/lib/report/defaults";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project";
import { reportKey, type ReportEvent, type ReportTextField } from "@/types";
import { ImageField } from "./ImageField";
import { BulletList, RichText } from "./RichText";

const box = "border border-black print:break-inside-avoid";
const head = "bg-report-head border-b border-black px-2 py-1.5 text-center font-bold";

/**
 * Relatório (guia de aprendizagem) de uma série, matéria e turma num bimestre, no modelo do guia da escola. `children` é o cronograma,
 * que entra no lugar da tabela de aulas do modelo. Todo texto é editável; na impressão a faixa do
 * topo se repete em cada página (é o `thead` de uma tabela).
 */
export function ReportView({ grade, subject, klass, term, children }: { grade: string; subject: string; klass: string; term: number; children: ReactNode }) {
  const report = useProject((s) => s.reports[reportKey(grade, subject, klass, term)]);
  const teacherName = useProject((s) => s.teacher.name);
  const termDates = useProject((s) => s.terms.find((t) => t.number === term));
  const curriculum = useProject((s) => s.documents.find((d) => d.curriculum.grade === grade && d.curriculum.subject === subject && d.klass === klass && d.curriculum.term === term)?.curriculum);
  const setReport = useProject((s) => s.setReport);
  const target = useMemo(() => ({ grade, subject, klass, term }), [grade, subject, klass, term]);

  const derived = useMemo(
    () => derivedDefaults({ teacherName, curriculum, klass, term: termDates, termNumber: term }),
    [teacherName, curriculum, klass, termDates, term],
  );
  const value = (f: ReportTextField) => reportValue(report, f, derived);
  const events = report?.events ?? [];

  /** Texto editável de um campo do relatório. */
  const field = (f: ReportTextField, label: string, render: (text: string) => ReactNode, singleLine = false) => (
    <EditableCell text={value(f)} label={label} singleLine={singleLine} onSave={(text) => setReport(target, { [f]: text })}>
      {render(value(f))}
    </EditableCell>
  );
  const list = (f: ReportTextField, label: string) => field(f, label, (t) => <BulletList text={t} />);
  const line = (f: ReportTextField, label: string) => field(f, label, (t) => <span>{t}</span>, true);

  const setEvent = (i: number, patch: Partial<ReportEvent>) =>
    setReport(target, { events: events.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <article aria-label={`Guia de aprendizagem · ${subject} · ${classLabel(grade, klass)} · ${term}º bimestre`} className="report mx-auto w-full max-w-[1120px] bg-white font-[Arial,Helvetica,sans-serif] text-[13px] leading-[1.45] text-black print:max-w-none">
      <p className="mb-3 rounded-lg border border-border bg-card p-3 text-[13px] leading-[18px] text-muted-foreground print:hidden">
        Clique em qualquer texto para editar. Nas listas, escreva um item por linha; dois espaços no começo da linha criam um subitem. Endereços
        da internet viram links.
      </p>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <td className="p-0 print:p-0">
              <ImageField kind="banner" label="faixa do cabeçalho" hint="Imagem larga, na proporção do modelo (cerca de 29,6 × 3,1 cm). Se repete em todas as páginas." className="min-h-24" imageClassName="w-full" />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="space-y-4 p-0 pt-4 align-top print:pt-3">
              <div className="flex items-center gap-4 px-2">
                <ImageField kind="schoolLogo" label="logo da escola" hint="Imagem quadrada" className="size-24 shrink-0" imageClassName="size-24 object-contain" />
                <h2 className="flex-1 text-center font-bold">GUIA DE APRENDIZAGEM – PEI</h2>
                <div aria-hidden className="size-24 shrink-0 print:size-[21mm]" />
              </div>

              <section aria-label="Identificação" className={box}>
                <div className="border-b border-black px-2 py-2 text-center font-bold">{field("school", "escola", (t) => <span>{t}</span>, true)}</div>
                <div className="grid grid-cols-1 border-b border-black sm:grid-cols-[1.4fr_1.2fr_1fr_1fr] print:grid-cols-[1.4fr_1.2fr_1fr_1fr]">
                  {([
                    ["teacher", "Professor(a)"],
                    ["subject", "Componente Curricular"],
                    ["grade", "ano/série"],
                  ] as const).map(([f, label]) => (
                    <div key={f} className="border-black px-2 py-2 sm:border-r">
                      <div className="flex gap-1"><b className="shrink-0">{label}:</b>{line(f, label)}</div>
                    </div>
                  ))}
                  <div className="px-2 py-2 font-bold">{line("termLabel", "bimestre e ano")}</div>
                </div>
                <div className="space-y-4 px-2 py-2">
                  <div><b>Justificativa:</b>{field("justification", "justificativa", (t) => <RichText text={t} />)}</div>
                  <div><b>Objetivos:</b>{field("objectives", "objetivos", (t) => <RichText text={t} />)}</div>
                </div>
              </section>

              <section aria-label="Datas e eventos" className={cn(events.length === 0 && "print:hidden")}>
                <div aria-hidden className="bg-report-bar h-5 border border-black" />
                <ul>
                  {events.map((e, i) => (
                    <li key={i} className="group/row grid grid-cols-[1fr_9rem] border border-t-0 border-black">
                      <div className="relative px-2 py-1">
                        <EditableCell text={e.text} label={`evento ${i + 1}`} singleLine onSave={(text) => setEvent(i, { text })}>{e.text}</EditableCell>
                      </div>
                      <div className="flex items-start justify-end border-l border-black px-2 py-1 text-right">
                        <EditableCell text={e.date} label={`data do evento ${i + 1}`} singleLine onSave={(date) => setEvent(i, { date })}>{e.date}</EditableCell>
                        <Button
                          type="button" variant="ghost" size="icon-xs" className="ml-1 shrink-0 print:hidden" aria-label={`Remover evento ${i + 1}`}
                          onClick={() => setReport(target, { events: events.filter((_, j) => j !== i) })}
                        >
                          <X aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button" variant="outline" size="sm" className="mt-2 print:hidden"
                  onClick={() => setReport(target, { events: [...events, { text: "", date: "" }] })}
                >
                  <Plus aria-hidden /> Adicionar data ou evento
                </Button>
              </section>

              <div className="space-y-6">{children}</div>

              <section aria-label="Competências e temas" className={cn("grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2", box)}>
                {([
                  ["socioemotional", "Competências socioemocionais"],
                  ["transversal", "Temas transversais"],
                ] as const).map(([f, title], i) => (
                  <div key={f} className={cn("border-black", i === 0 && "sm:border-r print:border-r")}>
                    <h3 className={head}>{title}</h3>
                    <div className="p-2">{list(f, title)}</div>
                  </div>
                ))}
              </section>

              <section aria-label="Estratégias didáticas" className={box}>
                <h3 className={head}>Estratégias Didáticas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr] print:grid-cols-[1fr_1fr_2fr]">
                  {([
                    ["autodidactic", "Atividades Autodidáticas:"],
                    ["cooperative", "Atividades Didático-Cooperativas:"],
                    ["complementary", "Atividades Complementares:"],
                  ] as const).map(([f, title], i) => (
                    <div key={f} className={cn("border-black", i < 2 && "sm:border-r print:border-r")}>
                      <h4 className="border-b border-black px-2 py-1.5 text-center font-bold">{title}</h4>
                      <div className="p-2">{list(f, title)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-label="Princípios e critérios" className={cn("grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2", box)}>
                {([
                  ["principles", "Princípios e Premissas:"],
                  ["criteria", "Critérios de Avaliação"],
                ] as const).map(([f, title], i) => (
                  <div key={f} className={cn("border-black", i === 0 && "sm:border-r print:border-r")}>
                    <h3 className={head}>{title}</h3>
                    <div className="p-2">{list(f, title)}</div>
                  </div>
                ))}
              </section>

              <section aria-label="Referências" className={box}>
                <h3 className={head}>Referências</h3>
                <div className="space-y-4 p-2">
                  <div><b>Para o(a) Professor(a):</b>{field("referencesTeacher", "referências para o professor", (t) => <RichText text={t} />)}</div>
                  <div><b>Para o(a) Estudante:</b>{field("referencesStudent", "referências para o estudante", (t) => <RichText text={t} />)}</div>
                </div>
              </section>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
