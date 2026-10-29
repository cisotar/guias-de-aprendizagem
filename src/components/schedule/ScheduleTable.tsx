"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  closestCenter, DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Copy, GripVertical, X } from "lucide-react";
import { fullDate, shortDate } from "@/lib/dates";
import { moveBlock } from "@/lib/schedule/move";
import { fieldToText, type TextField } from "@/lib/schedule/lessonText";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "./EditableCell";
import type { ScheduleRow } from "@/lib/schedule/rows";
import { cn } from "@/lib/utils";
import { BNCC_SKILLS } from "@/lib/skills/bncc";
import { COLUMN_HINTS, COLUMN_IDS, COLUMN_LABELS, type ColumnId, type Display, type Lesson } from "@/types";

/**
 * Largura mínima de cada coluna, em px: serve de peso para repartir a tabela (table-layout: fixed) e, somada, de largura
 * mínima na tela (abaixo disso a tabela rola). Habilidades e Aprendizagem Essencial só ganham largura quando mostram o texto
 * da descrição em cada célula; só com os códigos (EM13CHS304, AE1) ficam estreitas. Na impressão a tabela encolhe para caber
 * entre as margens, nunca passa delas.
 */
const widthOf = (c: ColumnId, display: Display): number => {
  switch (c) {
    case "schedule": return 100;
    case "number": return 125;
    case "content": return 150;
    case "objectives": return 190;
    case "skills": return display.skillsInline ? 220 : 105;
    case "essentialLearning": return display.essentialInline ? 240 : 120;
    case "taught": return 60;
    case "taughtDate": return 100;
  }
};

const Items = ({ items }: { items: ReactNode[] }) =>
  items.length > 1 ? (
    <ul className="list-disc space-y-1 pl-4">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
  ) : (
    <>{items[0]}</>
  );

const List = ({ items }: { items: string[] }) =>
  items.length > 1 ? (
    <ul className="list-disc space-y-1 pl-4">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
  ) : (
    <>{items[0]}</>
  );

const Coded = ({ code, text }: { code: string; text: string }) => (
  <>
    <strong>{code}</strong> – {text}
  </>
);

function lessonCell(id: Exclude<ColumnId, "schedule" | "taught" | "taughtDate">, l: Lesson, display: Display) {
  switch (id) {
    case "number":
      return (
        <>
          {l.number > 0 && <><span className="font-bold tabular-nums">{l.number}</span> · </>}{l.title}
          {l.highlight === "project" && <span className="ml-1 rounded bg-card px-1 text-xs font-bold">Projeto</span>}
        </>
      );
    case "content": return <List items={l.content} />;
    case "objectives": return <List items={l.objectives} />;
    case "skills":
      if (!display.skillsInline) return l.skills.join(", ");
      return <Items items={l.skills.map((c) => <Coded key={c} code={c} text={BNCC_SKILLS[c] ?? "descrição não encontrada"} />)} />;
    case "essentialLearning":
      if (!display.essentialInline) return l.essentialLearning.map((a) => a.code || a.text).join(", ");
      return <Items items={l.essentialLearning.map((a) => <Coded key={a.code} code={a.code} text={a.text} />)} />;
  }
}

const cellClass = "border border-line px-2 py-1.5 align-top break-words print:px-1.5 print:py-1";

const FIELD: Record<Exclude<ColumnId, "schedule" | "taught" | "taughtDate">, TextField> = {
  number: "title",
  content: "content",
  objectives: "objectives",
  skills: "skills",
  essentialLearning: "essentialLearning",
};

type RowActions = {
  onSave: (row: ScheduleRow, field: TextField, text: string) => void;
  onRemove: (row: ScheduleRow) => void;
  onClone: (row: ScheduleRow) => void;
  /** Marcar ou desmarcar a aula da linha como dada. */
  onTaught: (row: ScheduleRow, taught: boolean) => void;
};

/**
 * `slot` é a linha fixa da tabela (semana e posição) e dá o id do arrastar; `row` é o que ela mostra agora. Fora do arrasto
 * são iguais. Durante o arrasto `row` traz a prévia: a aula que ficaria nesse lugar se o bloco fosse solto ali.
 */
function Row({ slot, row, columns, ghost, display, selected, taught, onPick, onSave, onRemove, onClone, onTaught }: { slot: ScheduleRow; row: ScheduleRow; columns: ColumnId[]; ghost: boolean; display: Display; selected: boolean; taught: string | undefined; onPick: (row: ScheduleRow) => void } & RowActions) {
  const lesson = row.lesson;
  // Linhas vazias não se arrastam, mas aceitam que uma aula seja solta nelas. Usa a linha original para o arrastar não mudar no meio do gesto.
  const sortable = useSortable({
    id: slot.key,
    disabled: slot.lesson ? false : { draggable: true },
    // A prévia muda a altura das linhas; se o dnd-kit remedisse, o alvo mudaria sob o ponteiro e o movimento ficaria indo e voltando na divisa.
    resizeObserverConfig: { disabled: true },
  });
  const { setNodeRef, attributes, listeners, setActivatorNodeRef } = sortable;
  const firstOfWeek = row.weekSpan !== null;
  // Linha vazia só sai se a semana tem outra; linha com conteúdo sempre sai (a interface confirma antes).
  const canRemove = !!lesson || row.weekRows > 1;

  return (
    <tr
      ref={setNodeRef}
      data-item={row.itemId ?? ""}
      className={cn(
        selected ? "bg-week-soft" : "bg-card",
        // Seleção e prévia do arrasto pintam só as células da aula: a da semana (rowSpan) pertence à semana e não muda.
        selected && "[&>td:not([data-week])]:shadow-[inset_0_2px_0_var(--week),inset_0_-2px_0_var(--week)]",
        firstOfWeek && "border-t-2 border-t-week",
        ghost && "[&>td:not([data-week])]:bg-week-soft [&>td:not([data-week])]:opacity-50 [&>td:not([data-week])]:shadow-[inset_0_2px_0_var(--week),inset_0_-2px_0_var(--week)]",
        "h-14 print:h-[9mm] print:break-inside-avoid",
      )}
    >
      <td className={cn(cellClass, "bg-inherit align-middle print:hidden")}>
        {(lesson || slot.lesson) && (
          <div className="flex items-center">
          {slot.lesson && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            data-handle=""
            aria-pressed={selected}
            aria-label={`${slot.lesson.custom ? `Linha ${row.position + 1}` : `Aula ${slot.lesson.number}`}: clique para selecionar, Espaço para mover`}
            onClick={() => onPick(row)}
            // Sem isto o Espaço, que solta a linha no teclado, também "clicaria" ao subir a tecla.
            onKeyUp={(e) => e.key === " " && e.preventDefault()}
            className={cn("grid size-10 touch-none place-items-center rounded text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring", selected && "bg-week-soft text-foreground")}
          >
            <GripVertical aria-hidden />
          </button>
          )}
          </div>
        )}
      </td>
      {columns.map((id) => {
        if (id === "schedule") {
          if (!firstOfWeek) return null;
          return (
            <td key={id} data-week rowSpan={row.weekSpan ?? 1} className={cn(cellClass, "bg-card align-middle font-bold text-week tabular-nums")}>
              {shortDate(row.week.start)} a {shortDate(row.week.end)}
            </td>
          );
        }
        if (id === "taught" || id === "taughtDate") {
          return (
            <td key={id} className={cn(cellClass, "bg-inherit text-center align-middle tabular-nums")}>
              {lesson && id === "taught" && (
                <Checkbox
                  checked={taught !== undefined}
                  onCheckedChange={(v) => onTaught(row, v === true)}
                  title={COLUMN_HINTS.taught}
                  aria-label={`Aula dada: ${lesson.custom ? `linha ${row.position + 1}` : `aula ${lesson.number}`}`}
                  className="mx-auto"
                />
              )}
              {lesson && id === "taughtDate" && taught && <span className="inline-block">{fullDate(taught)}</span>}
            </td>
          );
        }
        const field = FIELD[id];
        return (
          <td key={id} className={cn(cellClass, "relative bg-inherit")}>
            <EditableCell
              fill
              text={lesson ? fieldToText(lesson, field) : ""}
              label={`${COLUMN_LABELS[id]} da linha ${row.position + 1}`}
              singleLine={field === "title"}
              onSave={(text) => onSave(row, field, text)}
            >
              {lesson && lessonCell(id, lesson, display)}
            </EditableCell>
          </td>
        );
      })}
      <td className={cn(cellClass, "bg-inherit align-middle print:hidden")}>
        <div className="flex items-center">
        {lesson && (
          <button
            type="button"
            aria-label={`Clonar linha ${row.position + 1} logo abaixo`}
            onClick={() => onClone(row)}
            className="grid size-10 place-items-center rounded text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            <Copy aria-hidden />
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            aria-label={lesson ? `Remover linha ${row.position + 1} (tem conteúdo)` : `Remover linha vazia ${row.position + 1}`}
            onClick={() => onRemove(row)}
            className="grid size-10 place-items-center rounded text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            <X aria-hidden />
          </button>
        )}
        </div>
      </td>
    </tr>
  );
}

export function ScheduleTable({ rows, columns, display, taught, onMove, onSave, onRemove, onClone, onTaught }: { rows: ScheduleRow[]; columns: ColumnId[]; display: Display; taught: Record<string, string>; onMove: (activeId: string, overPosition: number, ids: string[]) => void } & RowActions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  // Só vale a seleção de linhas que ainda têm aula.
  const selected = useMemo(() => new Set(rows.filter((r) => r.lesson && picked.has(r.key)).map((r) => r.key)), [rows, picked]);
  /**
   * Clique na alça. Linha já selecionada: sai da seleção (no meio do grupo, a seleção toda é limpa para não deixar buraco).
   * Linha ao lado do grupo: entra nele. Qualquer outra: vira a única selecionada.
   */
  const pick = (row: ScheduleRow) => {
    const at = (key: string) => rows.findIndex((r) => r.key === key);
    const index = at(row.key);
    const chosen = [...selected].map(at).sort((x, y) => x - y);
    const [first, last] = [chosen[0], chosen[chosen.length - 1]];
    if (chosen.includes(index)) setPicked(index === first || index === last ? new Set(rows.filter((r, i) => chosen.includes(i) && i !== index).map((r) => r.key)) : new Set());
    else if (chosen.length && (index === first - 1 || index === last + 1)) setPicked(new Set([...selected, row.key]));
    else setPicked(new Set([row.key]));
  };
  // Clique fora de uma alça ou Esc desfaz a seleção.
  useEffect(() => {
    if (!selected.size) return;
    const clear = () => setPicked(new Set());
    const onPointerDown = (e: PointerEvent) => !(e.target as Element).closest?.("[data-handle]") && clear();
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && clear();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected.size]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] }, coordinateGetter: sortableKeyboardCoordinates }));

  const defs = useMemo<ColumnDef<ScheduleRow>[]>(
    () => COLUMN_IDS.map((id) => ({ id, header: COLUMN_LABELS[id], cell: () => null })),
    [],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- a tabela só calcula colunas visíveis; nada memoizado depende dela
  const table = useReactTable({
    data: rows,
    columns: defs,
    getCoreRowModel: getCoreRowModel(),
    state: { columnOrder: columns, columnVisibility: Object.fromEntries(COLUMN_IDS.map((c) => [c, columns.includes(c)])) },
  });
  const visible = table.getVisibleLeafColumns().map((c) => c.id as ColumnId);
  const total = visible.reduce((n, c) => n + widthOf(c, display), 0);

  const sortableIds = rows.map((r) => r.key);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const label = (id: string | number) => {
    const l = byKey.get(String(id))?.lesson;
    const r = byKey.get(String(id));
    return l ? (l.custom ? `linha ${l.title || (r?.position ?? 0) + 1}` : `aula ${l.number}, ${l.title}`) : `linha vazia ${(r?.position ?? 0) + 1}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => (groupOf(String(active.id)).length > 1 ? `Pegou ${groupOf(String(active.id)).length} linhas.` : `Pegou a ${label(active.id)}.`),
    onDragOver: ({ active, over }) => (over ? `A ${label(active.id)} está sobre a ${label(over.id)}.` : ""),
    onDragEnd: ({ active, over }) => (over ? `Soltou a ${label(active.id)} na posição da ${label(over.id)}.` : `Soltou a ${label(active.id)} sem mover.`),
    onDragCancel: ({ active }) => `Movimento da ${label(active.id)} cancelado.`,
  };

  // Pegar uma linha selecionada leva todas as selecionadas; pegar uma solta leva só ela.
  const groupOf = (id: string) => (selected.has(id) ? [...selected] : [id]);
  const dragCount = activeId ? groupOf(activeId).length : 0;

  function end(e: DragEndEvent) {
    stop();
    const over = e.over ? byKey.get(String(e.over.id)) : undefined;
    if (over && e.active.id !== e.over?.id) onMove(String(e.active.id), over.position, groupOf(String(e.active.id)));
  }
  const activeLesson = activeId ? byKey.get(activeId)?.lesson : null;

  // Prévia: a ordem que sairia se o bloco fosse solto sobre a linha atual. As linhas da tabela não mudam de lugar
  // (a semana de cada uma é fixa); o que muda é a aula que cada uma mostra, e as do bloco ficam apagadas no destino.
  const preview = useMemo(() => {
    if (!activeId || !overId) return null;
    const seq = rows.flatMap((r) => (r.itemId ? [r.itemId] : []));
    const over = byKey.get(overId);
    if (!over) return null;
    let blanks = 0;
    const next = moveBlock(seq, activeId, over.position, [...groupOf(activeId)], () => `preview-blank-${blanks++}`);
    if (!next) return null;
    const lessonById = new Map(rows.flatMap((r) => (r.itemId ? [[r.itemId, r.lesson] as const] : [])));
    const moving = new Set(groupOf(activeId));
    return rows.map((r) => {
      const id = next[r.position] ?? null;
      return { row: { ...r, key: id ?? r.key, itemId: id, lesson: id ? (lessonById.get(id) ?? null) : null }, ghost: id !== null && moving.has(id) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- byKey e groupOf derivam de rows e selected
  }, [activeId, overId, rows, selected]);

  const stop = () => { setActiveId(null); setOverId(null); };

  // Animação do movimento (FLIP): depois de cada mudança da prévia, a aula que trocou de linha desliza da altura em que
  // estava até a nova. Só o conteúdo das células anima; a célula em si, a semana e os botões pertencem à linha e não à aula.
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const tops = useRef(new Map<string, number>());
  const wasDragging = useRef(false);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const base = body.getBoundingClientRect().top;
    const now = new Map<string, number>();
    const dragging = activeId !== null;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.querySelectorAll<HTMLTableRowElement>("tr[data-item]").forEach((tr) => {
      const id = tr.dataset.item;
      if (!id) return;
      const top = tr.getBoundingClientRect().top - base;
      now.set(id, top);
      const before = tops.current.get(id);
      if (calm || !(dragging || wasDragging.current) || before === undefined || Math.abs(before - top) < 1) return;
      // Só o conteúdo desliza: a célula (borda, fundo, semana) e os botões de mover/clonar/remover ficam na linha.
      tr.querySelectorAll<HTMLElement>("td:not([data-week]):not(:first-child):not(:last-child) > *").forEach((el) => {
        el.style.position = "relative";
        el.style.zIndex = "1";
        const run = el.animate([{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
        run.onfinish = run.oncancel = () => { el.style.position = ""; el.style.zIndex = ""; };
      });
    });
    tops.current = now;
    wasDragging.current = dragging;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragOver={(e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null)}
      onDragEnd={end}
      onDragCancel={stop}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Para mover a aula, aperte Espaço, use as setas para escolher a posição e aperte Espaço de novo para soltar. Esc cancela." },
      }}
    >
      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-3 text-sm print:hidden" role="status">
          <span>{selected.size === 1 ? "1 linha selecionada" : `${selected.size} linhas selecionadas`}. Arraste uma delas para mover todas; clique fora ou aperte Esc para desmarcar.</span>
          <button type="button" className="underline" onClick={() => setPicked(new Set())}>Limpar seleção</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-line bg-card print:overflow-visible print:rounded-none print:border-0">
        <table style={{ "--table-min": `${total + 152}px` } as CSSProperties} className="w-full min-w-(--table-min) table-fixed border-collapse text-sm leading-5 print:min-w-0 print:text-[9.5pt] print:leading-[12.5pt]">
          <colgroup>
            <col className="w-14 print:hidden" />
            {visible.map((c) => <col key={c} style={{ width: `${(widthOf(c, display) / total) * 100}%` }} />)}
            <col className="w-24 print:hidden" />
          </colgroup>
          <thead className="table-header-group">
            <tr className="bg-table-head text-left text-primary-foreground print:bg-table-head">
              <th className="border border-line p-2 print:hidden"><span className="sr-only">Selecionar e mover</span></th>
              {visible.map((c) => (
                <th key={c} scope="col" title={COLUMN_HINTS[c]} className="border border-line p-2 font-bold break-words print:px-1.5 print:py-1">{COLUMN_LABELS[c]}</th>
              ))}
              <th className="border border-line p-2 print:hidden"><span className="sr-only">Clonar ou remover linha</span></th>
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {rows.map((r, i) => <Row key={r.key} slot={r} row={preview?.[i].row ?? r} ghost={preview?.[i].ghost ?? false} columns={visible} display={display} selected={selected.has(preview?.[i].row.key ?? r.key)} taught={taught[preview?.[i].row.itemId ?? r.itemId ?? ""]} onPick={pick} onSave={onSave} onRemove={onRemove} onClone={onClone} onTaught={onTaught} />)}
            </SortableContext>
          </tbody>
        </table>
      </div>
      <DragOverlay>
        {activeLesson && (
          <div className="rounded-lg border border-week bg-card p-3 text-sm font-bold shadow-lg">
            {dragCount > 1 ? `${dragCount} linhas` : activeLesson.number > 0 ? `${activeLesson.number} · ${activeLesson.title}` : activeLesson.title || "Linha"}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
