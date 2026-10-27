"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { classLabel, docsOf } from "@/lib/schedule/guides";
import { useProject } from "@/store/project";
import { assignmentFor } from "@/types";

const TERMS = [1, 2, 3, 4];

/**
 * Copia a guia de uma turma (documento inteiro: aulas, ordem, linhas livres e relatório) para outras turmas da série.
 * O estado inicial vem das props: monte com `key` diferente para recomeçar.
 */
export function CopyGuideForm({
  grade, subject, from: initialFrom, to: initialTo, onDone, onCancel,
}: {
  grade: string;
  subject: string;
  from: string;
  /** Turma de destino já marcada. */
  to?: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const classes = useProject((s) => assignmentFor(s.teacher, grade, subject)?.classes ?? []);
  const documents = useProject((s) => s.documents);
  const copyGuide = useProject((s) => s.copyGuide);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState<string[]>(initialTo ? [initialTo] : []);
  const [picked, setPicked] = useState<number[] | null>(null);

  const withDocs = (klass: string, term: number) => docsOf(documents, { subject, grade, klass }, term).length > 0;
  const available = TERMS.filter((n) => withDocs(from, n));
  const terms = (picked ?? available).filter((n) => available.includes(n));
  const destinations = classes.filter((k) => k !== from);
  const chosen = to.filter((k) => destinations.includes(k));
  const replaced = chosen.filter((k) => terms.some((n) => withDocs(k, n)));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="space-y-4">
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          A cópia leva a guia inteira: aulas, ordem, linhas livres e todo o texto. A série e a turma passam a ser as do destino, e depois cada guia se edita à parte.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="copy-from">Copiar da guia</Label>
          <select
            id="copy-from"
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPicked(null);
            }}
          >
            {classes.map((k) => <option key={k} value={k}>{classLabel(grade, k)}</option>)}
          </select>
        </div>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-bold">Copiar para</legend>
          {destinations.length === 0 && <p className="text-sm text-muted-foreground">Cadastre outra turma na página da série.</p>}
          {destinations.map((k) => (
            <Label key={k} className="min-h-10 cursor-pointer text-sm">
              <Checkbox checked={to.includes(k)} onCheckedChange={() => setTo(toggle(to, k))} />
              {classLabel(grade, k)}
            </Label>
          ))}
        </fieldset>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-bold">Bimestres</legend>
          {available.length === 0 && <p className="text-sm text-muted-foreground">Esta guia ainda não tem PDF em nenhum bimestre.</p>}
          {available.map((n) => (
            <Label key={n} className="min-h-10 cursor-pointer text-sm">
              <Checkbox checked={terms.includes(n)} onCheckedChange={() => setPicked(toggle(terms, n))} />
              {n}º bimestre
            </Label>
          ))}
        </fieldset>
        {replaced.length > 0 && (
          <p role="alert" className="rounded-lg bg-amber-100 p-3 text-[13px] leading-[18px] text-amber-950">
            {replaced.map((k) => classLabel(grade, k)).join(", ")} já {replaced.length > 1 ? "têm" : "tem"} guia nos bimestres marcados. Copiar substitui o que está lá.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
          <Button
            disabled={chosen.length === 0 || terms.length === 0}
            onClick={() => {
              copyGuide({ grade, subject }, from, chosen, terms);
              onDone();
            }}
          >
            {replaced.length > 0 ? "Copiar e substituir" : "Copiar"}
          </Button>
        </div>
    </div>
  );
}

/** A mesma cópia numa janela, para quando ela abre a partir de um cartão. */
export function CopyGuideDialog({ onClose, ...props }: { grade: string; subject: string; from: string; to?: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copiar guia · {props.subject}</DialogTitle>
          <DialogDescription>Para outras turmas da {props.grade}.</DialogDescription>
        </DialogHeader>
        <CopyGuideForm {...props} onDone={onClose} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
