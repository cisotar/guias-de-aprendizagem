"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classPills, nextClassLetter, toggleClass } from "@/lib/schedule/classPills";
import { useProject } from "@/store/project";
import { classLessonsPerDay, type Assignment, type LessonsPerDay, type Weekday } from "@/types";

const DAYS: { value: Weekday; short: string; label: string }[] = [
  { value: 1, short: "Seg", label: "segunda-feira" },
  { value: 2, short: "Ter", label: "terça-feira" },
  { value: 3, short: "Qua", label: "quarta-feira" },
  { value: 4, short: "Qui", label: "quinta-feira" },
  { value: 5, short: "Sex", label: "sexta-feira" },
];

export const weekly = (days: LessonsPerDay) => Object.values(days).reduce((sum, n) => sum + n, 0);
export const lessonsLabel = (n: number) => `${n} ${n === 1 ? "aula" : "aulas"} por semana`;

/** Cinco campos, um por dia útil. `name` identifica a turma (ou a série) para o leitor de tela. */
function DaysRow({ id, name, days, onChange }: { id: string; name: string; days: LessonsPerDay; onChange: (day: Weekday, count: number) => void }) {
  return (
    <div className="grid max-w-sm grid-cols-5 gap-1">
      {DAYS.map((d) => (
        <div key={d.value} className="space-y-0.5 text-center">
          <Label htmlFor={`${id}-${d.value}`} className="justify-center text-xs font-normal text-muted-foreground">{d.short}</Label>
          <Input
            id={`${id}-${d.value}`} type="number" inputMode="numeric" min={0} max={9} className="h-10 px-1 text-center"
            aria-label={`Aulas de ${name} na ${d.label}`}
            value={days[d.value]}
            onChange={(e) => onChange(d.value, e.target.valueAsNumber)}
          />
        </div>
      ))}
    </div>
  );
}

/** Uma série da matéria: as turmas, cada uma com as suas aulas por dia; sem turmas, o horário é o da série. */
export function ClassesEditor({ a }: { a: Assignment }) {
  const setLessons = useProject((s) => s.setLessonsPerDay);
  const setClassLessons = useProject((s) => s.setClassLessonsPerDay);
  const setClasses = useProject((s) => s.setClasses);
  const base = `${a.subject}-${a.grade}`.replace(/\W+/g, "-");
  const pills = classPills(a.classes);
  const next = nextClassLetter(a.classes);

  function toggle(k: string) {
    if (a.classes.includes(k) && !window.confirm(`Remover a turma ${k} (${a.subject}, ${a.grade})? A guia dela (aulas e ordem) será apagada; o relatório continua salvo.`)) return;
    setClasses(a.grade, a.subject, toggleClass(a.classes, k));
  }

  return (
    <div className="space-y-2 border-t border-dashed border-border pt-2">
      {a.classes.length === 0 ? (
        <>
          <p className="text-[13px] leading-[18px] text-muted-foreground">Sem turmas · {lessonsLabel(weekly(a.lessonsPerDay))}</p>
          <DaysRow id={base} name={`${a.subject}, ${a.grade}`} days={a.lessonsPerDay} onChange={(d, n) => setLessons(a.grade, a.subject, d, n)} />
        </>
      ) : (
        <ul className="space-y-3" aria-label={`Turmas de ${a.subject} na ${a.grade}`}>
          {a.classes.map((k) => {
            const days = classLessonsPerDay(a, k);
            return (
              <li key={k} className="space-y-1">
                <p className="text-sm">
                  <span className="font-bold">Turma {k}</span>
                  <span className="text-[13px] text-muted-foreground"> · {lessonsLabel(weekly(days))}</span>
                </p>
                <DaysRow id={`${base}-${k}`} name={`${a.subject}, ${a.grade} ${k}`} days={days} onChange={(d, n) => setClassLessons(a.grade, a.subject, k, d, n)} />
              </li>
            );
          })}
        </ul>
      )}
      <div className="space-y-1">
        <p id={`${base}-pills`} className="text-xs text-muted-foreground">{a.classes.length === 0 ? "Separar em turmas" : "Turmas"}</p>
        <div role="group" aria-labelledby={`${base}-pills`} className="flex flex-wrap gap-2">
          {pills.map((k) => {
            const on = a.classes.includes(k);
            return (
              <Button key={k} type="button" variant={on ? "default" : "outline"} className="h-10 min-w-10 rounded-full px-3" aria-pressed={on} aria-label={`Turma ${k}`} onClick={() => toggle(k)}>
                {k}
              </Button>
            );
          })}
          {next && (
            <Button type="button" variant="outline" size="icon" className="size-10 rounded-full" aria-label={`Adicionar turma ${next}`} onClick={() => setClasses(a.grade, a.subject, toggleClass(a.classes, next))}>
              <Plus aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

