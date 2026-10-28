"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUp, Download, FileText, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fromExportFile, toExportFile, toMarkdown } from "@/lib/export/project";
import { pickProject, useProject } from "@/store/project";
import { COLUMN_IDS, COLUMN_LABELS, type ColumnId } from "@/types";
import { Block } from "./Block";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function OutputBlock({ activeGrade, activeSubject, activeKlass, activeTerm }: { activeGrade: string | null; activeSubject: string | null; activeKlass: string | null; activeTerm: number | null }) {
  const state = useProject();
  const file = useRef<HTMLInputElement>(null);
  const hidden = COLUMN_IDS.filter((c) => !state.columns.includes(c));
  const list: ColumnId[] = [...state.columns, ...hidden];

  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      const project = fromExportFile(JSON.parse(await f.text()));
      const what = state.documents.length ? "Isto substitui o projeto atual (PDFs, professor, bimestres, feriados e ordem)." : "Importar este arquivo?";
      if (!window.confirm(`${what} Continuar?`)) return;
      state.importProject(project);
      toast.success("Dados importados");
    } catch {
      toast.error("Este arquivo não é uma exportação válida deste app.");
    }
  }

  return (
    <Block title="Colunas e saída">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Colunas (a ordem vale na tela e na impressão)</legend>
        <ul className="space-y-1">
          {list.map((id) => {
            const visible = state.columns.includes(id);
            const index = state.columns.indexOf(id);
            return (
              <li key={id} className="flex items-center gap-1">
                <Label className="min-h-10 flex-1 cursor-pointer text-sm">
                  <Checkbox checked={visible} onCheckedChange={() => state.toggleColumn(id)} />
                  {COLUMN_LABELS[id]}
                </Label>
                <Button
                  variant="ghost" size="icon" className="size-10" disabled={!visible || index === 0}
                  aria-label={`Mover ${COLUMN_LABELS[id]} para antes`} onClick={() => state.moveColumn(id, -1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost" size="icon" className="size-10" disabled={!visible || index === state.columns.length - 1}
                  aria-label={`Mover ${COLUMN_LABELS[id]} para depois`} onClick={() => state.moveColumn(id, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-[15px] leading-[22px] font-bold">Descrição das habilidades e das AEs</legend>
        <ul className="space-y-1">
          {([
            ["skillsInline", "Habilidades: texto em cada célula"],
            ["skillsLegend", "Habilidades: legenda abaixo da tabela"],
            ["essentialInline", "AEs: texto em cada célula"],
            ["essentialLegend", "AEs: legenda abaixo da tabela"],
          ] as const).map(([key, label]) => (
            <li key={key} className="flex items-center gap-1">
              <Label className="min-h-10 flex-1 cursor-pointer text-sm">
                <Checkbox checked={state.display[key]} onCheckedChange={(v) => state.setDisplay({ [key]: v === true })} />
                {label}
              </Label>
            </li>
          ))}
        </ul>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          Sem nenhuma marcada, a coluna mostra só a sigla. As legendas só aparecem se a coluna estiver visível.
        </p>
      </fieldset>
      <div className="space-y-2">
        <Button className="h-10 w-full" onClick={() => window.print()} disabled={state.documents.length === 0}>
          <Printer aria-hidden /> Imprimir o que está na tela
        </Button>
        <Button
          variant="outline" className="h-10 w-full" disabled={state.documents.length === 0}
          onClick={() => {
            download("cronograma.json", JSON.stringify(toExportFile(pickProject(state)), null, 2), "application/json");
            toast.success("Dados exportados");
          }}
        >
          <Download aria-hidden /> Exportar dados
        </Button>
        <Button
          variant="outline" className="h-10 w-full" disabled={state.documents.length === 0}
          onClick={() => download("cronograma.md", toMarkdown(pickProject(state), { grade: activeGrade ?? undefined, subject: activeSubject ?? undefined, klass: activeKlass ?? undefined, term: activeTerm ?? undefined }), "text/markdown")}
        >
          <FileText aria-hidden /> Markdown do que está na tela
        </Button>
        <input
          ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Escolher arquivo de dados"
          onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <Button variant="outline" className="h-10 w-full" onClick={() => file.current?.click()}>
          <Upload aria-hidden /> Importar dados
        </Button>
      </div>
    </Block>
  );
}
