"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Célula editável: mostra o conteúdo formatado; clique ou Enter abre a edição.
 * Campo de uma linha: caixa na própria célula (Enter salva). Campo de várias linhas: modal onde Enter pula linha;
 * Ctrl+Enter ou "Salvar" confirma, Esc ou "Cancelar" descarta. Na impressão só aparece o conteúdo.
 */
export function EditableCell({
  text, label, onSave, children, singleLine = false,
}: {
  text: string;
  label: string;
  onSave: (text: string) => void;
  children: ReactNode;
  singleLine?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const cancelled = useRef(false);

  function open() {
    cancelled.current = false;
    setDraft(text);
    setEditing(true);
  }
  function close(save: boolean) {
    setEditing(false);
    if (save && draft !== text) onSave(draft);
  }

  if (editing && !singleLine) {
    const save = () => {
      setEditing(false);
      if (draft !== text) onSave(draft);
    };
    return (
      <>
        <Dialog open onOpenChange={(o) => !o && setEditing(false)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar {label}</DialogTitle>
              <DialogDescription>
                Cada linha é um tópico; com 2 ou mais linhas, aparecem com marcador (•), como no guia importado. Enter pula linha; Ctrl+Enter salva.
              </DialogDescription>
            </DialogHeader>
            <textarea
              autoFocus
              aria-label={label}
              rows={10}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  save();
                }
              }}
              className="block w-full resize-y rounded border border-input bg-card p-2 text-sm leading-5 outline-none focus-visible:ring-3 focus-visible:ring-ring"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="min-h-8">{children}</div>
      </>
    );
  }
  if (editing) {
    return (
      <textarea
        autoFocus
        aria-label={label}
        rows={singleLine ? 1 : 4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => close(!cancelled.current)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey || singleLine)) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="block min-h-16 w-full resize-y rounded border border-ring bg-card p-1 text-sm leading-5 outline-none"
      />
    );
  }
  const empty = text.trim() === "";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Editar ${label}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          open();
        }
      }}
      className={cn("-m-1 min-h-8 cursor-text rounded p-1 hover:bg-muted/60 print:m-0 print:p-0 print:hover:bg-transparent", empty && "print:min-h-0")}
    >
      {empty ? <span className="text-xs text-muted-foreground print:hidden">Clique para escrever</span> : children}
    </div>
  );
}
