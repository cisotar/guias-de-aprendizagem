"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Difference } from "@/lib/schedule/sameCurriculum";

export type TermConflict = {
  grade: string;
  subject: string;
  term: number;
  /** PDFs que já estão na série, matéria e bimestre e diferem do que chegou. */
  differing: { id: string; fileName: string; differences: Difference[] }[];
};

const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}` : items[0]);

/** Aviso de que o PDF que entra na série e bimestre tem dados diferentes de um PDF que já está nele. */
export function TermConflictDialog({
  conflict, onKeepBoth, onReplace, onCancel,
}: {
  conflict: TermConflict | null;
  onKeepBoth: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={conflict !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        {conflict && (
          <>
            <DialogHeader>
              <DialogTitle>{conflict.subject} · {conflict.grade} · {conflict.term}º bimestre já tem PDF com dados diferentes</DialogTitle>
              <DialogDescription>O que fazer com o PDF que está entrando?</DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {conflict.differing.map((d) => (
                <li key={d.id}>
                  <b>{d.fileName || "PDF sem nome"}</b> difere em {list(d.differences)}.
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button variant="outline" onClick={onReplace}>{conflict.differing.length > 1 ? "Substituir os antigos" : "Substituir o antigo"}</Button>
              <Button onClick={onKeepBoth}>Manter os dois</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
