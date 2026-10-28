"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compareGrades, STAGES, stageOf, type Stage } from "@/lib/schedule/grades";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project";
import { classLessonsPerDay, type Assignment } from "@/types";
import { lessonsLabel, weekly } from "./ClassesEditor";

/** Aulas por semana somadas de todas as turmas da série (ou da série inteira, sem turmas). */
export const weeklyTotal = (a: Assignment) =>
  a.classes.length === 0 ? weekly(a.lessonsPerDay) : a.classes.reduce((sum, k) => sum + weekly(classLessonsPerDay(a, k)), 0);

/** Link para a página de uma série da matéria. */
function SeriesLink({ a, onOpen }: { a: Assignment; onOpen: () => void }) {
  const terms = useProject((s) => new Set(s.documents.filter((d) => d.curriculum.subject === a.subject && d.curriculum.grade === a.grade).map((d) => d.curriculum.term)).size);
  const classes = a.classes.length === 0 ? "Sem turmas" : `Turma${a.classes.length > 1 ? "s" : ""} ${a.classes.join(", ")}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-56 flex-1 basis-60 flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left hover:border-primary max-w-sm"
    >
      <span className="text-base font-bold text-primary underline">{a.grade} ›</span>
      <span className="text-[13px] leading-[18px] text-muted-foreground">{classes} · {lessonsLabel(weeklyTotal(a))}</span>
      <span className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-bold", terms === 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900")}>
        {terms === 0 ? "Falta o PDF" : terms === 1 ? "1 bimestre com PDF" : `${terms} bimestres com PDF`}
      </span>
    </button>
  );
}

/** Selo da etapa (EF ou EM) ao lado do nome da matéria. */
function StageBadge({ stage }: { stage: Stage }) {
  return (
    <abbr title={STAGES[stage].label} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground no-underline">
      {stage}
    </abbr>
  );
}

/** Uma matéria numa etapa: a mesma matéria nas duas etapas vira dois cartões, cada um com o seu selo. */
function SubjectCard({ subject, stage, onOpen }: { subject: string; stage: Stage; onOpen: (grade: string) => void }) {
  const all = useProject((s) => s.teacher.assignments);
  const add = useProject((s) => s.addAssignment);
  const remove = useProject((s) => s.removeAssignment);
  const hasPdf = useProject((s) => s.documents.some((d) => d.curriculum.subject === subject && stageOf(d.curriculum.grade) === stage));
  const mine = all.filter((a) => a.subject === subject && stageOf(a.grade) === stage);
  const grades = [...new Set([...STAGES[stage].grades, ...mine.map((a) => a.grade)])].sort(compareGrades);

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold break-words">{subject} <StageBadge stage={stage} /></h2>
        <Button
          variant="outline" className="h-10"
          onClick={() => {
            const extra = hasPdf ? " As guias já geradas continuam salvas, mas sem aulas por dia." : "";
            if (window.confirm(`Deixar de lecionar ${subject} (${STAGES[stage].label})?${extra}`)) mine.forEach((a) => remove(a.grade, a.subject));
          }}
        >
          Remover matéria
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {grades.map((g) => {
          const a = mine.find((x) => x.grade === g);
          return a ? (
            <SeriesLink key={g} a={a} onOpen={() => onOpen(g)} />
          ) : (
            <div key={g} className="flex min-w-56 flex-1 basis-60 max-w-sm flex-col items-start gap-1.5 rounded-xl border border-dashed border-border p-3.5">
              <span className="text-base font-bold text-muted-foreground">{g}</span>
              <span className="text-[13px] text-muted-foreground">Não leciono</span>
              <Button variant="outline" className="h-10" onClick={() => add(g, subject)}>Passar a lecionar</Button>
            </div>
          );
        })}
      </div>
    </li>
  );
}

/** Convite ao tutorial, mostrado enquanto o professor ainda não tem nenhuma guia. */
export function TutorialCallout() {
  return (
    <Link href="/tutorial/" className="flex items-center gap-3 rounded-xl border border-primary bg-card p-4 hover:bg-muted">
      <CircleHelp aria-hidden className="size-6 shrink-0 text-primary" />
      <span>
        <b className="text-primary underline">Primeira vez aqui? Veja o tutorial.</b>
        <span className="block text-[13px] leading-[18px] text-muted-foreground">Passo a passo com imagens, e como guardar seus dados no Google Drive.</span>
      </span>
    </Link>
  );
}

/** Página inicial: as matérias que o professor leciona, com um link para a página de cada série. */
export function SubjectsPage({ onOpen }: { onOpen: (subject: string, grade: string) => void }) {
  const assignments = useProject((s) => s.teacher.assignments);
  const add = useProject((s) => s.addAssignment);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>("EM");
  const [picked, setPicked] = useState<string[]>([STAGES.EM.grades[0]]);
  const [error, setError] = useState<string | null>(null);
  const hasGuide = useProject((s) => s.documents.length > 0);
  const cards = [...new Map(assignments.map((a) => [`${a.subject}|${stageOf(a.grade)}`, { subject: a.subject, stage: stageOf(a.grade) }])).values()];
  const { gradeWord } = STAGES[stage];

  function pickStage(next: Stage) {
    setStage(next);
    setPicked([STAGES[next].grades[0]]);
  }

  function submit() {
    const subject = name.trim().replace(/\|/g, "");
    if (!subject) return setError("Informe o nome da matéria.");
    if (cards.some((c) => c.stage === stage && c.subject.toLowerCase() === subject.toLowerCase())) return setError(`${subject} (${stage}) já está na lista.`);
    if (picked.length === 0) return setError(`Marque ao menos um${gradeWord === "ano" ? " ano" : "a série"}.`);
    picked.forEach((g) => add(g, subject));
    setName("");
    setError(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl leading-8 font-bold">Minhas matérias</h1>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          Cadastre a matéria, escolha a etapa (Ensino Fundamental ou Médio) e marque as séries ou anos em que você leciona. Cada um tem a sua página, para turmas, aulas por semana e PDF.
        </p>
      </header>
      {!hasGuide && <TutorialCallout />}
      {cards.length > 0 && (
        <ul className="space-y-4" aria-label="Matérias que você leciona">
          {cards.map((c) => <SubjectCard key={`${c.subject}|${c.stage}`} subject={c.subject} stage={c.stage} onOpen={(g) => onOpen(c.subject, g)} />)}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="min-w-60 flex-1 space-y-1.5">
          <Label htmlFor="new-subject" className="font-bold">Nova matéria</Label>
          <Input id="new-subject" className="h-10" value={name} placeholder="Ex.: Geografia" onChange={(e) => setName(e.target.value)} />
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-4">
          <legend className="mb-1 text-[13px] text-muted-foreground">Etapa</legend>
          {(Object.keys(STAGES) as Stage[]).map((k) => (
            <Label key={k} className="min-h-10 cursor-pointer text-sm">
              <input type="radio" name="new-subject-stage" className="size-4 accent-primary" checked={stage === k} onChange={() => pickStage(k)} />
              {STAGES[k].label}
            </Label>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-x-4">
          <legend className="mb-1 text-[13px] text-muted-foreground">{gradeWord === "ano" ? "Anos" : "Séries"} em que leciono</legend>
          {STAGES[stage].grades.map((g) => (
            <Label key={g} className="min-h-10 cursor-pointer text-sm">
              <Checkbox checked={picked.includes(g)} onCheckedChange={(on) => setPicked(on ? [...picked, g] : picked.filter((x) => x !== g))} />
              {g}
            </Label>
          ))}
        </fieldset>
        <Button type="submit" className="h-10">Adicionar matéria</Button>
        {error && <p role="alert" className="basis-full text-[13px] text-destructive">{error}</p>}
      </form>
    </div>
  );
}
