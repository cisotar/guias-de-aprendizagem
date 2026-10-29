import { useEffect } from "react";
import { toast } from "sonner";
import { useProject } from "./project";

/** Campos de texto têm o próprio desfazer do navegador; o do projeto não deve apagar o que se digita. */
const isTextField = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement);

/** Ctrl/Cmd+Z desfaz; Ctrl/Cmd+Shift+Z ou Ctrl+Y refaz. */
export function useUndoShortcut() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextField(e.target)) return;
      const key = e.key.toLowerCase();
      const redo = (key === "z" && e.shiftKey) || key === "y";
      if (key !== "z" && key !== "y") return;
      e.preventDefault();
      const { undo, redo: redoFn, pastStates, futureStates } = useProject.temporal.getState();
      if (redo) {
        if (!futureStates.length) return;
        redoFn();
        toast("Refeito");
      } else {
        if (!pastStates.length) return;
        undo();
        toast("Desfeito");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
