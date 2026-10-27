"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Copy, GripVertical, X } from "lucide-react";
import { shortDate } from "@/lib/dates";
import { fieldToText, type TextField } from "@/lib/schedule/lessonText";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "./EditableCell";
import type { ScheduleRow } from "@/lib/schedule/rows";
import { cn } from "@/lib/utils";
import { BNCC_SKILLS } from "@/lib/skills/bncc";
import { COLUMN_IDS, COLUMN_LABELS, type ColumnId, type Display, type Lesson } from "@/types";

/** Larguras relativas; viram porcentagem entre as colunas visíveis (table-layout: fixed). */
const WEIGHT: Record<ColumnId, number> = { schedule: 10, number: 13, content: 15, objectives: 24, skills: 14, essentialLearning: 24 };

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

function lessonCell(id: Exclude<ColumnId, "schedule">, l: Lesson, display: Display) {
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
      if (!display.essentialInline) return l.essentialLearning.map((a) => a.code).join(", ");
      return <Items items={l.essentialLearning.map((a) => <Coded key={a.code} code={a.code} text={a.text} />)} />;
  }
}

const cellClass = "border border-line px-2 py-1.5 align-top break-words print:px-1.5 print:py-1";

const FIELD: Record<Exclude<ColumnId, "schedule">, TextField> = {
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
};

function Row({ row, columns, dragging, display, selected, onToggle, onSave, onRemove, onClone }: { row: ScheduleRow; columns: ColumnId[]; dragging: boolean; display: Display; selected: boolean; onToggle: (row: ScheduleRow) => void } & RowActions) {
  const lesson = row.lesson;
  // Linhas vazias não se arrastam, mas aceitam que uma aula seja solta nelas.
  const sortable = useSortable({ id: row.key, disabled: lesson ? false : { draggable: true } });
  const { setNodeRef, attributes, listeners, isOver, isDragging, setActivatorNodeRef } = sortable;
  const firstOfWeek = row.weekSpan !== null;
  const stripe = row.weekIndex % 2 === 1 ? "bg-week-soft" : "bg-card";
  // Linha vazia só sai se a semana tem outra; linha com conteúdo sempre sai (a interface confirma antes).
  const canRemove = !!lesson || row.weekRows > 1;

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        lesson?.highlight === "project" ? "bg-project" : "bg-card",
        selected && "outline-2 -outline-offset-2 outline-week",
        firstOfWeek && "border-t-2 border-t-week",
        isDragging && "opacity-40",
        isOver && dragging && !isDragging && "outline-2 -outline-offset-2 outline-week",
        "h-14 print:h-[9mm] print:break-inside-avoid",
      )}
    >
      <td className={cn(cellClass, "print:hidden")}>
        {lesson && (
          <div className="flex items-center">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle(row)}
              aria-label={`Selecionar linha ${row.position + 1}`}
              className="mx-1"
            />
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={lesson.custom ? `Mover linha ${row.position + 1}` : `Mover aula ${lesson.number}`}
            className="grid size-10 touch-none place-items-center rounded text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring"
          >
            <GripVertical aria-hidden />
          </button>
          </div>
        )}
      </td>
      {columns.map((id) => {
        if (id === "schedule") {
          if (!firstOfWeek) return null;
          return (
            <td key={id} rowSpan={row.weekSpan ?? 1} className={cn(cellClass, stripe, "align-middle font-bold text-week tabular-nums")}>
              {shortDate(row.week.start)} a {shortDate(row.week.end)}
            </td>
          );
        }
        const field = FIELD[id];
        return (
          <td key={id} className={cellClass}>
            <EditableCell
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
      <td className={cn(cellClass, "print:hidden")}>
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

export function ScheduleTable({ rows, columns, display, onMove, onSave, onRemove, onClone }: { rows: ScheduleRow[]; columns: ColumnId[]; display: Display; onMove: (activeId: string, overPosition: number, ids: string[]) => void } & RowActions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  // Só vale a seleção de linhas que ainda têm aula.
  const selected = useMemo(() => new Set(rows.filter((r) => r.lesson && picked.has(r.key)).map((r) => r.key)), [rows, picked]);
  const toggle = (row: ScheduleRow) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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
  const total = visible.reduce((n, c) => n + WEIGHT[c], 0);

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
    setActiveId(null);
    const over = e.over ? byKey.get(String(e.over.id)) : undefined;
    if (over && e.active.id !== e.over?.id) onMove(String(e.active.id), over.position, groupOf(String(e.active.id)));
  }
  const activeLesson = activeId ? byKey.get(activeId)?.lesson : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={end}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Para mover a aula, aperte Espaço, use as setas para escolher a posição e aperte Espaço de novo para soltar. Esc cancela." },
      }}
    >
      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-3 text-sm print:hidden" role="status">
          <span>{selected.size === 1 ? "1 linha selecionada" : `${selected.size} linhas selecionadas`}. Arraste uma delas para mover todas.</span>
          <button type="button" className="underline" onClick={() => setPicked(new Set())}>Limpar seleção</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-line bg-card print:overflow-visible print:rounded-none print:border-0">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-sm leading-5 print:min-w-0 print:text-[9.5pt] print:leading-[12.5pt]">
          <colgroup>
            <col className="w-24 print:hidden" />
            {visible.map((c) => <col key={c} style={{ width: `${(WEIGHT[c] / total) * 100}%` }} />)}
            <col className="w-24 print:hidden" />
          </colgroup>
          <thead className="table-header-group">
            <tr className="bg-primary text-left text-primary-foreground print:bg-primary">
              <th className="border border-line p-2 print:hidden"><span className="sr-only">Selecionar e mover</span></th>
              {visible.map((c) => (
                <th key={c} scope="col" className="border border-line p-2 font-bold print:px-1.5 print:py-1">{COLUMN_LABELS[c]}</th>
              ))}
              <th className="border border-line p-2 print:hidden"><span className="sr-only">Clonar ou remover linha</span></th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {rows.map((r) => <Row key={r.key} row={r} columns={visible} dragging={activeId !== null} display={display} selected={selected.has(r.key)} onToggle={toggle} onSave={onSave} onRemove={onRemove} onClone={onClone} />)}
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
