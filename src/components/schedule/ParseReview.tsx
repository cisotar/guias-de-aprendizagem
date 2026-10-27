"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lines, parseEssential } from "@/lib/schedule/lessonText";
import { fieldClass } from "@/components/sidebar/Block";
import { compareGrades } from "@/lib/schedule/grades";
import { useProject } from "@/store/project";
import { assignmentFor } from "@/types";
import type { Curriculum, Lesson, ParsedCurriculum } from "@/types";

type Draft = { title: string; content: string; objectives: string; skills: string; essentialLearning: string };

const toDraft = (l: Lesson): Draft => ({
  title: l.title,
  content: l.content.join("\n"),
  objectives: l.objectives.join("\n"),
  skills: l.skills.join(", "),
  essentialLearning: l.essentialLearning.map((a) => `${a.code} - ${a.text}`).join("\n"),
});

function fromDraft(l: Lesson, d: Draft): Lesson {
  return {
    ...l,
    title: d.title.trim(),
    content: lines(d.content),
    objectives: lines(d.objectives),
    skills: d.skills.split(/[\s,;]+/).filter(Boolean),
    essentialLearning: parseEssential(d.essentialLearning),
  };
}

/**
 * Tela de conferência: o professor corrige qualquer campo lido antes de seguir. Um PDF pode trazer várias séries e
 * bimestres; cada leitura aparece como um grupo, e "Usar estas aulas" salva todas de uma vez.
 */
export function ParseReview({
  curricula, open, isNew, onConfirm, onCancel,
}: {
  curricula: ParsedCurriculum[] | null;
  open: boolean;
  isNew: boolean;
  onConfirm: (c: Curriculum[]) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {curricula && (
          <ReviewBody
            key={curricula.map((c) => `${c.grade}|${c.term}|${c.lessons.map((l) => l.id).join()}`).join(";")}
            curricula={curricula} isNew={isNew} onConfirm={onConfirm} onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Group = { grade: string; term: number | null; drafts: Draft[] };

function ReviewBody({ curricula, isNew, onConfirm, onCancel }: { curricula: ParsedCurriculum[]; isNew: boolean; onConfirm: (c: Curriculum[]) => void; onCancel: () => void }) {
  // A série e o bimestre lidos do PDF valem; se o PDF não diz, o professor escolhe. Em qualquer caso ele pode trocar.
  const [groups, setGroups] = useState<Group[]>(() => curricula.map((c) => ({ grade: c.grade, term: c.term, drafts: c.lessons.map(toDraft) })));
  const setGroup = (g: number, patch: Partial<Group>) => setGroups((all) => all.map((x, j) => (j === g ? { ...x, ...patch } : x)));
  const setDraft = (g: number, i: number, patch: Partial<Draft>) =>
    setGroup(g, { drafts: groups[g].drafts.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const several = curricula.length > 1;
  const teacher = useProject((s) => s.teacher);
  const subject = curricula[0].subject;
  // Séries oferecidas: as que o professor cadastrou para a matéria, mais a que o PDF trouxe.
  const declared = teacher.assignments.filter((a) => a.subject.toLowerCase() === subject.toLowerCase()).map((a) => a.grade);
  const ready = groups.every((g) => g.term !== null && g.grade !== "");
  const gradeOptions = (current: string) => [...new Set([...declared, ...(current ? [current] : [])])].sort(compareGrades);
  const lessonCount = curricula.reduce((a, c) => a + c.lessons.length, 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Conferir a leitura do PDF</DialogTitle>
        <DialogDescription>
          {several
            ? `${subject} · ${curricula.length} bimestres e ${lessonCount} aulas encontradas. Abra cada aula para corrigir o que estiver errado; use uma linha por item.`
            : `${subject} · ${curricula[0].grade || "série não informada"} · ${lessonCount} aulas encontradas. Corrija o que estiver errado; use uma linha por item.`}
        </DialogDescription>
      </DialogHeader>
      {curricula.map((c, g) => {
        const { grade, term, drafts } = groups[g];
        const missing = c.lessons.filter((_, i) => !drafts[i].skills.trim() || !drafts[i].content.trim());
        const id = `review-${g}`;
        return (
          <section key={id} aria-labelledby={`${id}-h`} className={several ? "space-y-3 rounded-lg border border-border p-3" : "space-y-3"}>
            {several && (
              <h3 id={`${id}-h`} className="text-[15px] leading-[22px] font-bold">
                {grade || "Série?"} · {term ? `${term}º bimestre` : "bimestre?"} · {c.lessons.length} aulas
              </h3>
            )}
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-grade`}>Série</Label>
                <select id={`${id}-grade`} className={`${fieldClass} sm:w-48`} value={grade} onChange={(e) => setGroup(g, { grade: e.target.value })}>
                  {grade === "" && <option value="">Escolha a série</option>}
                  {gradeOptions(grade).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-term`}>Bimestre</Label>
                <select
                  id={`${id}-term`} className={`${fieldClass} sm:w-48`} value={term ?? ""}
                  onChange={(e) => setGroup(g, { term: e.target.value ? Number(e.target.value) : null })}
                >
                  {term === null && <option value="">Escolha o bimestre</option>}
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}º bimestre</option>)}
                </select>
              </div>
            </div>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              {c.term === null || c.grade === "" ? "O PDF não informa a série ou o bimestre: escolha acima." : "Lidos do PDF. Troque se precisar."}
              {grade !== "" && !assignmentFor(teacher, grade, subject) && ` ${subject} na ${grade} não está em "Minhas matérias": será adicionada, sem aulas por dia. Preencha depois.`}
              {missing.length > 0 && ` Atenção: ${missing.length} aula(s) sem conteúdo ou sem habilidade.`}
            </p>
            {c.lessons.map((l, i) => (
              <details key={l.id} className="rounded-lg border border-border p-3" open={!several && i === 0}>
                <summary className="cursor-pointer text-sm font-bold">
                  Aula {l.number} · {drafts[i].title}
                  {l.highlight === "project" && " · Projeto"}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`${id}-${l.id}-title`}>Título da aula</Label>
                    <Input id={`${id}-${l.id}-title`} value={drafts[i].title} onChange={(e) => setDraft(g, i, { title: e.target.value })} />
                  </div>
                  {([
                    ["content", "Conteúdo"],
                    ["objectives", "Objetivos de aprendizagem"],
                    ["skills", "Habilidades (separe por vírgula)"],
                    ["essentialLearning", "Aprendizagem Essencial (ex.: AE6 - texto)"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`${id}-${l.id}-${key}`}>{label}</Label>
                      <Textarea id={`${id}-${l.id}-${key}`} rows={4} value={drafts[i][key]} onChange={(e) => setDraft(g, i, { [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        );
      })}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!ready}
          onClick={() =>
            ready &&
            onConfirm(curricula.map((c, g) => ({ ...c, grade: groups[g].grade, term: groups[g].term ?? 1, lessons: c.lessons.map((l, i) => fromDraft(l, groups[g].drafts[i])) })))
          }
        >
          {isNew ? "Usar estas aulas" : "Salvar correções"}
        </Button>
      </DialogFooter>
    </>
  );
}
