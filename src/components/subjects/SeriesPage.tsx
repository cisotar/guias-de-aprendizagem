"use client";

import { useRef, useState } from "react";
import { FileUp, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyGuideForm } from "@/components/schedule/CopyGuideDialog";
import { StatusPill, useTermDates } from "@/components/schedule/GuideNav";
import { PdfParseError } from "@/lib/pdf/parse";
import { readCurriculumPdf } from "@/lib/pdf/read";
import { sortDocuments } from "@/lib/schedule/grades";
import { classLabel, guideStatus, guideTargets, type GuideStatus } from "@/lib/schedule/guides";
import { useProject } from "@/store/project";
import { assignmentFor, type ParsedCurriculum } from "@/types";
import { ClassesEditor } from "./ClassesEditor";

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="text-[13px] leading-[18px] text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </section>
);

/** Página de uma matéria numa série: turmas e aulas por semana, PDF, os bimestres da guia e a cópia entre turmas. */
export function SeriesPage({
  subject, grade, onBack, onViewGuide, onRead, onReview,
}: {
  subject: string;
  grade: string;
  onBack: () => void;
  /** Abre a guia da série, num bimestre. */
  onViewGuide: (term: number) => void;
  onRead: (c: ParsedCurriculum[], fileName: string) => void;
  onReview: (documentId: string) => void;
}) {
  const assignment = useProject((s) => assignmentFor(s.teacher, grade, subject));
  const teacher = useProject((s) => s.teacher);
  const documents = useProject((s) => s.documents);
  const reports = useProject((s) => s.reports);
  const removeDocument = useProject((s) => s.removeDocument);
  const dates = useTermDates();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ reading: boolean; error: string | null }>({ reading: false, error: null });

  if (!assignment) {
    return (
      <div className="space-y-3">
        <p>Você não leciona {subject} na {grade}.</p>
        <Button variant="outline" className="h-10" onClick={onBack}>Voltar às matérias</Button>
      </div>
    );
  }

  async function handle(file: File | undefined) {
    if (!file) return;
    setState({ reading: true, error: null });
    try {
      onRead(await readCurriculumPdf(file, subject), file.name);
      setState({ reading: false, error: null });
    } catch (e) {
      setState({ reading: false, error: e instanceof PdfParseError ? e.message : "Não consegui ler este PDF. Confira se é o Escopo - Sequência do guia." });
    }
  }

  const mine = guideTargets(teacher, documents).filter((t) => t.subject === subject && t.grade === grade);
  /** Pior caso entre as turmas: sem PDF em alguma = "none"; senão editada se alguma foi editada. */
  const statusOf = (term: number): GuideStatus => {
    const all = mine.map((t) => guideStatus(documents, reports, t, term));
    return all.includes("none") ? "none" : all.includes("edited") ? "edited" : "ready";
  };
  const anyDoc = (term: number) => mine.some((t) => guideStatus(documents, reports, t, term) !== "none");
  const series = sortDocuments(documents.filter((d) => d.curriculum.subject === subject && d.curriculum.grade === grade));

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-2 text-[13px] text-muted-foreground">
          <button type="button" className="font-bold text-primary underline" onClick={onBack}>Minhas matérias</button> › {subject} › {grade}
        </p>
        <h1 className="text-2xl leading-8 font-bold">{subject} · {grade}</h1>
      </header>

      <Section
        title="1. Turmas e aulas por semana"
        hint="Cada turma tem o seu horário. Se a série não separa turmas, preencha o horário direto."
      >
        <ClassesEditor a={assignment} />
      </Section>

      <Section
        title="2. PDF do Escopo-Sequência"
        hint="O PDF traz a tabela de aulas (conteúdo, objetivos, habilidades). Ele vale para todas as turmas: depois de enviar, cada turma recebe a sua cópia da tabela, e o app monta a guia de aprendizagem completa em volta dela."
      >
        <input
          ref={input} type="file" accept="application/pdf" className="sr-only" aria-label="Escolher arquivo PDF"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handle(e.dataTransfer.files[0]);
          }}
          className="flex flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input p-5 text-sm text-muted-foreground"
        >
          Arraste o PDF aqui ou
          <Button id="pdf-upload" className="h-10" onClick={() => input.current?.click()} disabled={state.reading}>
            <FileUp aria-hidden /> {state.reading ? "Lendo o PDF…" : "Enviar PDF"}
          </Button>
        </div>
        {state.error && <p role="alert" className="text-[13px] leading-[18px] text-destructive">{state.error}</p>}
        {series.length > 0 && (
          <ul className="space-y-2" aria-label="PDFs enviados">
            {series.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-[13px] leading-[18px]">
                <p>
                  <b className="break-words">{d.fileName || "PDF sem nome"}</b>
                  <span className="text-muted-foreground"> · {classLabel(d.curriculum.grade, d.klass)} · {d.curriculum.term}º bimestre · {d.curriculum.lessons.filter((l) => !l.custom).length} aulas</span>
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-10" onClick={() => onReview(d.id)}>
                    <ListChecks aria-hidden /> Conferir
                  </Button>
                  <Button
                    variant="outline" size="icon" className="size-10" aria-label={`Remover ${d.fileName || "PDF"} (${classLabel(d.curriculum.grade, d.klass)})`}
                    onClick={() => window.confirm(`Remover ${d.fileName || "este PDF"} (${classLabel(d.curriculum.grade, d.klass)}) e a ordem das aulas dele?`) && removeDocument(d.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="3. Guia de aprendizagem"
        hint="Documento completo: identificação, justificativa, objetivos, datas, cronograma, estratégias, critérios e referências. As datas de cada bimestre são as do calendário da escola (barra lateral)."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
              <h3 className="font-bold">{n}º bimestre</h3>
              <StatusPill status={statusOf(n)} />
              <p className="text-[13px] leading-[18px] text-muted-foreground">{dates(n)} · calendário da escola</p>
              <Button className="h-10" variant={anyDoc(n) ? "default" : "outline"} disabled={!anyDoc(n)} onClick={() => onViewGuide(n)}>Ver guia</Button>
            </div>
          ))}
        </div>
      </Section>

      {assignment.classes.length > 1 && (
        <Section title="4. Copiar a guia entre as turmas">
          <CopyGuideForm key={assignment.classes.join("|")} grade={grade} subject={subject} from={assignment.classes[0]} onDone={() => undefined} />
        </Section>
      )}
    </div>
  );
}
