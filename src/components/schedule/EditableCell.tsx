"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Célula editável: mostra o conteúdo formatado; clique ou Enter abre uma caixa de texto.
 * Salva ao sair do campo ou com Ctrl+Enter; Esc cancela. Na impressão só aparece o conteúdo.
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
