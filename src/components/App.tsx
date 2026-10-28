"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/report/ReportView";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SeriesPage } from "@/components/subjects/SeriesPage";
import { SubjectsPage, TutorialCallout } from "@/components/subjects/SubjectsPage";
import { Legends } from "@/components/schedule/Legends";
import { ParseReview } from "@/components/schedule/ParseReview";
import { TermConflictDialog, type TermConflict } from "@/components/schedule/TermConflictDialog";
import { CopyGuideDialog } from "@/components/schedule/CopyGuideDialog";
import { FILTER_ORDER, GuideFilters, ModeToggle, StatusPill, TargetCards, TermStrip, type ViewMode } from "@/components/schedule/GuideNav";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { buildSchedule, normalizeRowOrder } from "@/lib/schedule/build";
import { classLabel, docsOf, filterTargets, guideStatus, guideTargets, sameTarget, type FilterKey, type GuideFilter, type GuideTarget } from "@/lib/schedule/guides";
import { textToField } from "@/lib/schedule/lessonText";
import { buildRows } from "@/lib/schedule/rows";
import { curriculumDifferences } from "@/lib/schedule/sameCurriculum";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project";
import { useHydrated } from "@/store/useHydrated";
import { type Curriculum, type ParsedCurriculum, type PlanDocument, type ReportImages } from "@/types";

/** Botões de ação da guia: azul escuro com texto branco (contraste ~10:1); desativado vira cinza legível, não azul apagado. */
const DARK_BLUE = "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100";

/** Fora da ordem do PDF: aulas trocadas de lugar, linhas em branco no meio ou linhas escritas/clonadas. */
function isReordered(doc: PlanDocument) {
  const current = normalizeRowOrder(doc.rowOrder, doc.curriculum.lessons, doc.deletedLessons);
  const original = normalizeRowOrder([], doc.curriculum.lessons, doc.deletedLessons);
  return current.length !== original.length || current.some((id, i) => id !== original[i]);
}

function DocumentSection({ doc, first, inReport = false }: { doc: PlanDocument; first: boolean; inReport?: boolean }) {
  const teacher = useProject((s) => s.teacher);
  const terms = useProject((s) => s.terms);
  const columns = useProject((s) => s.columns);
  const display = useProject((s) => s.display);
  const moveRows = useProject((s) => s.moveRows);
  const cloneRow = useProject((s) => s.cloneRow);
  const setRowFields = useProject((s) => s.setRowFields);
  const removeRow = useProject((s) => s.removeRow);
  const restoreRows = useProject((s) => s.restoreRows);
  const setTaught = useProject((s) => s.setTaught);
  const { curriculum } = doc;

  const result = useMemo(
    () => buildSchedule(curriculum, teacher, terms.find((t) => t.number === curriculum.term), doc),
    [curriculum, teacher, terms, doc],
  );
  const rows = useMemo(() => (result.ok ? buildRows(result.schedule, curriculum.lessons) : []), [result, curriculum]);

  const removed = Object.values(doc.removedRows).reduce((a, b) => a + b, 0) + doc.deletedLessons.length;

  return (
    <section aria-labelledby={`h-${doc.id}`} className={cn("space-y-3", !first && "print:break-before-page")}>
      <h2 id={`h-${doc.id}`} className={cn("text-lg leading-7 font-bold", inReport && "print:hidden")}>
        {curriculum.subject} · {classLabel(curriculum.grade, doc.klass)}
        {doc.fileName && <span className="ml-2 text-sm font-normal text-muted-foreground print:hidden">{doc.fileName}</span>}
      </h2>
      {removed > 0 && (
        <button type="button" className="text-[13px] underline print:hidden" onClick={() => restoreRows(doc.id)}>
          Restaurar linhas removidas
        </button>
      )}
      {!result.ok ? (
        <div role="status" className="rounded-lg border border-border bg-card p-4 print:hidden">
          <p>{result.error}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Informe as aulas por dia de {curriculum.subject} na {curriculum.grade} (em (em &ldquo;O que leciono&rdquo;)ldquo;Minhas matérias(em &ldquo;O que leciono&rdquo;)rdquo;) e as datas do {curriculum.term}º bimestre na barra lateral.
          </p>
        </div>
      ) : (
        <>
          <ScheduleTable
            rows={rows}
            columns={columns}
            display={display}
            taught={doc.taught ?? {}}
            onTaught={(row, value) => row.itemId && setTaught(doc.id, row.itemId, value)}
            onMove={(active, position, ids) => moveRows(doc.id, active, position, ids)}
            onClone={(row) => row.itemId && cloneRow(doc.id, row.itemId)}
            onSave={(row, field, text) => setRowFields(doc.id, { itemId: row.itemId, position: row.position }, textToField(field, text))}
            onRemove={(row) => {
              if (row.lesson) {
                const name = row.lesson.number > 0 ? `${row.lesson.number} · ${row.lesson.title}` : row.lesson.title || "linha escrita por você";
                const single = row.weekRows <= 1 ? " Como é a única linha da semana, a linha fica vazia." : "";
                if (!window.confirm(`Esta linha tem conteúdo (${name}). Remover mesmo assim?${single}`)) return;
              }
              removeRow(doc.id, { weekId: row.week.id, weekRows: row.weekRows, itemId: row.itemId });
            }}
          />
          <Legends rows={rows} columns={columns} display={display} />
        </>
      )}
    </section>
  );
}

const VIEW_MODE_KEY = "cronograma-geografia:ver-por";

/** "Ver por" é preferência deste navegador: fica fora do projeto e do JSON exportado. */
function readViewMode(): ViewMode {
  try {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_MODE_KEY) : null;
    return saved === "grade" || saved === "term" ? saved : "subject";
  } catch {
    return "subject";
  }
}

export function App({ defaultImages }: { defaultImages: Partial<Record<keyof ReportImages, string | null>> }) {
  const hydrated = useHydrated();
  const documents = useProject((s) => s.documents);
  const teacher = useProject((s) => s.teacher);
  const reports = useProject((s) => s.reports);
  const storageWarning = useProject((s) => s.storageWarning);
  const addGuide = useProject((s) => s.addGuide);
  const removeDocument = useProject((s) => s.removeDocument);
  const resetRowOrder = useProject((s) => s.resetRowOrder);
  const editDocument = useProject((s) => s.editDocument);
  const addAssignment = useProject((s) => s.addAssignment);
  const [mode, setModeState] = useState<ViewMode>(readViewMode);
  // Dropdowns começam vazios; cada escolha filtra as guias mostradas (campo ausente = "Todas").
  const [filter, setFilter] = useState<GuideFilter>({});
  // Guia aberta a partir de um cartão (ou do PDF recém-salvo); sem ela, a guia aparece quando a escolha dos dropdowns sobra uma só.
  const [opened, setOpened] = useState<GuideTarget | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [view, setView] = useState<"schedule" | "report">("report");
  // Seção da tela: a lista de matérias, a página de uma série ou as guias. Quem não tem matéria cadastrada começa em "materias".
  const [section, setSection] = useState<"materias" | "serie" | "guias">("materias");
  const [open, setOpen] = useState<{ subject: string; grade: string } | null>(null);
  // Modo bimestre: mostra todas as guias do bimestre, uma depois da outra, para imprimir de uma vez.
  const [stacked, setStacked] = useState(false);
  const [copy, setCopy] = useState<{ grade: string; subject: string; from: string; to?: string; n: number } | null>(null);
  // `pending` são as leituras novas ainda em conferência (uma por série e bimestre); `editingId` é a revisão de um PDF já salvo.
  const [pending, setPending] = useState<{ curricula: ParsedCurriculum[]; fileName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Leituras confirmadas que entram numa série, matéria e bimestre onde já há PDF com dados diferentes: uma decisão por vez.
  const [conflicts, setConflicts] = useState<(TermConflict & { curriculum: Curriculum; fileName: string; editingId: string | null })[]>([]);
  const conflict = conflicts[0] ?? null;

  function setMode(m: ViewMode) {
    setModeState(m);
    setFilter({});
    setOpened(null);
    setSelectedTerm(null);
    setStacked(false);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, m);
    } catch {
      // sem acesso ao storage: a escolha vale só nesta visita
    }
  }

  function openSeries(subject: string, grade: string) {
    setOpen({ subject, grade });
    setSection("serie");
  }

  /** Abre a guia e deixa os dropdowns como se o professor a tivesse escolhido. */
  function focusGuide(t: GuideTarget, term: number) {
    setFilter({ subject: t.subject, grade: t.grade, ...(t.klass ? { klass: t.klass } : {}) });
    setOpened(t);
    setSelectedTerm(term);
    setStacked(false);
  }

  /** Abre a guia da série (turma A, se há turmas) no bimestre pedido. */
  function viewGuide(term: number) {
    if (!open) return;
    focusGuide({ subject: open.subject, grade: open.grade, klass: assignmentClasses({ ...open, term } as Curriculum)[0] ?? "" }, term);
    setSection("guias");
  }

  function select(c: Curriculum) {
    focusGuide({ subject: c.subject, grade: c.grade, klass: assignmentClasses(c)[0] ?? "" }, c.term);
  }

  /** Trocar um dropdown limpa os que vêm depois: as opções deles mudam. */
  function changeFilter(key: FilterKey, value: string | undefined) {
    const order = FILTER_ORDER[mode];
    const next: GuideFilter = {};
    for (const k of order.slice(0, order.indexOf(key))) next[k] = filter[k];
    if (value !== undefined) next[key] = value;
    setFilter(next);
    setOpened(null);
    setStacked(false);
  }

  /** Turmas da série e matéria de um PDF; a primeira fica selecionada depois de salvar. */
  function assignmentClasses(c: Curriculum) {
    return teacher.assignments.find((a) => a.grade === c.grade && a.subject === c.subject)?.classes ?? [];
  }

  function commit(c: Curriculum, fileName: string, targetId: string | null) {
    if (targetId) editDocument(targetId, c);
    else addGuide(c, fileName);
  }

  function confirm(curricula: Curriculum[]) {
    const target = editingId ? documents.find((d) => d.id === editingId) : undefined;
    const fileName = pending?.fileName ?? target?.fileName ?? "";
    close();
    // Série que o PDF trouxe e o professor ainda não tinha cadastrado: entra em "Minhas matérias", sem aulas por dia.
    for (const c of curricula) addAssignment(c.grade, c.subject);
    const waiting: typeof conflicts = [];
    let saved = 0;
    const unchanged: string[] = [];
    for (const c of curricula) {
      // Só confere quando o PDF entra numa série e bimestre (PDF novo ou troca); corrigir texto não conta.
      const entering = !target || target.curriculum.term !== c.term || target.curriculum.grade !== c.grade;
      // Os PDFs de uma série vêm em uma cópia por turma: cada PDF aparece uma vez só na lista.
      const inSlot = entering
        ? documents.filter((d) => d.id !== target?.id && d.curriculum.grade === c.grade && d.curriculum.subject === c.subject && d.curriculum.term === c.term)
        : [];
      const differing = entering
        ? inSlot
            .map((d) => ({ id: d.id, fileName: d.fileName, differences: curriculumDifferences(d.curriculum, c) }))
            .filter((d) => d.differences.length > 0)
            .filter((d, i, all) => all.findIndex((x) => x.fileName === d.fileName && x.differences.join() === d.differences.join()) === i)
        : [];
      if (!target && inSlot.length > 0 && differing.length === 0) {
        // Mesmo PDF já salvo neste bimestre: nada a gravar, para não duplicar a guia.
        unchanged.push(`${c.subject}, ${c.grade}, ${c.term}º bimestre`);
      } else if (differing.length === 0) {
        commit(c, fileName, target?.id ?? null);
        saved += 1;
      } else waiting.push({ grade: c.grade, subject: c.subject, term: c.term, differing, curriculum: c, fileName, editingId: target?.id ?? null });
    }
    if (curricula[0]) select(curricula[0]);
    if (saved > 0) toast.success(saved === 1 ? "PDF enviado com sucesso" : `PDF enviado com sucesso: ${saved} bimestres salvos`);
    if (unchanged.length > 0) toast.info(`Este PDF já estava salvo (${unchanged.join("; ")}). Nada mudou.`, { duration: 8000 });
    if (waiting.length > 0) {
      const where = waiting.map((w) => `${w.subject}, ${w.grade}, ${w.term}º bimestre`).join("; ");
      toast.warning(`Já havia guia gerada (${where}). Ela será substituída se você escolher substituir.`, { duration: 8000 });
    }
    setConflicts(waiting);
  }

  function resolve(replace: boolean) {
    if (!conflict) return;
    if (replace) {
      const names = new Set(conflict.differing.map((d) => d.fileName));
      documents
        .filter((d) => d.curriculum.grade === conflict.grade && d.curriculum.subject === conflict.subject && d.curriculum.term === conflict.term && names.has(d.fileName))
        .forEach((d) => removeDocument(d.id));
    }
    commit(conflict.curriculum, conflict.fileName, conflict.editingId);
    select(conflict.curriculum);
    toast.success(replace ? "Guia substituída com sucesso" : "PDF enviado com sucesso");
    setConflicts((q) => q.slice(1));
  }

  const targets = useMemo(() => guideTargets(teacher, documents), [teacher, documents]);
  const hasDocs = (t: GuideTarget, term?: number) => docsOf(documents, t, term).length > 0;
  const matching = useMemo(() => filterTargets(targets, filter), [targets, filter]);
  // Nada aparece até o primeiro dropdown ser escolhido (na visão bimestre, o de bimestre).
  const started = mode === "term" ? selectedTerm !== null : filter[FILTER_ORDER[mode][0]] !== undefined;
  const detail = (opened && targets.find((t) => sameTarget(t, opened))) || (mode !== "term" && started && matching.length === 1 ? matching[0] : null);
  const detailTerms = detail ? [1, 2, 3, 4].filter((n) => hasDocs(detail, n)) : [];
  const activeTerm = detail ? (selectedTerm !== null && detailTerms.includes(selectedTerm) ? selectedTerm : (detailTerms[0] ?? selectedTerm ?? 1)) : selectedTerm;

  if (!hydrated) return <div className="min-h-screen" aria-busy="true" />;

  const editing = documents.find((d) => d.id === editingId);
  const reviewing = pending?.curricula ?? (editing ? [{ ...editing.curriculum, lessons: editing.curriculum.lessons.filter((l) => !l.custom) }] : null);
  const close = () => {
    setPending(null);
    setEditingId(null);
  };

  /** A guia de uma turma num bimestre: relatório (com o cronograma dentro) ou só o cronograma. */
  const guide = (t: GuideTarget, term: number, first = true) => {
    const docs = docsOf(documents, t, term);
    if (view === "report") {
      return (
        <div key={`${t.subject}|${t.grade}|${t.klass}`} className={cn(!first && "print:break-before-page")}>
          <ReportView defaultImages={defaultImages} grade={t.grade} subject={t.subject} klass={t.klass} term={term}>
            {docs.map((d, j) => <DocumentSection key={d.id} doc={d} first={j === 0} inReport />)}
          </ReportView>
        </div>
      );
    }
    return (
      <div key={`${t.subject}|${t.grade}|${t.klass}`} className={cn("space-y-4", !first && "print:break-before-page")}>
        <header>
          <h1 className="text-2xl leading-8 font-bold">Cronograma · {t.subject} · {classLabel(t.grade, t.klass)} · {term}º bimestre</h1>
          {teacher.name && <p className="text-muted-foreground print:text-foreground">Professor(a): {teacher.name}</p>}
        </header>
        {docs.map((d, j) => <DocumentSection key={d.id} doc={d} first={j === 0} />)}
      </div>
    );
  };

  // Guia de aprendizagem: página sem margem, para a faixa do topo ir de borda a borda na primeira folha; as margens de
  // cima, de baixo e dos lados vêm de dentro do conteúdo (ReportView). No cronograma vale a margem de globals.css.
  const reportPageStyle = view === "report" && section === "guias" ? <style media="print">{"@page { margin: 0; }"}</style> : null;

  const classesOfTarget = detail ? (teacher.assignments.find((a) => a.grade === detail.grade && a.subject === detail.subject)?.classes ?? []) : [];

  /** Visão bimestre: as guias do bimestre que combinam com os dropdowns, para abrir uma ou imprimir todas. */
  const termList = (term: number) => {
    const stackedTargets = matching.filter((t) => hasDocs(t, term));
    return (
      <div className="space-y-6">
                {stacked ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <Button variant="outline" className="h-10" onClick={() => setStacked(false)}>Voltar às guias</Button>
                      <Button className="h-10" onClick={() => window.print()}>Imprimir ({stackedTargets.length} {stackedTargets.length === 1 ? "guia" : "guias"})</Button>
                    </div>
                    {stackedTargets.map((t, i) => guide(t, term, i === 0))}
                  </>
                ) : (
                  <>
                    <header className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h1 className="text-2xl leading-8 font-bold">{term}º bimestre · todas as guias</h1>
                        <p className="text-[13px] text-muted-foreground">
                          {matching.length} {matching.length === 1 ? "guia" : "guias"} · {stackedTargets.length} com PDF
                        </p>
                      </div>
                      <Button className="h-10" onClick={() => setStacked(true)}>Ver e imprimir todas</Button>
                    </header>
                    {[...new Set(matching.map((t) => t.subject))].map((subject) => (
                      <section key={subject} aria-label={subject} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                        <h2 className="text-xl font-bold">{subject}</h2>
                        {[...new Set(matching.filter((t) => t.subject === subject).map((t) => t.grade))].map((grade) => (
                          <div key={grade} className="space-y-2">
                            <h3 className="text-[15px] text-muted-foreground">{grade}</h3>
                            <ul className="flex flex-wrap gap-3">
                              {matching.filter((t) => t.subject === subject && t.grade === grade).map((t) => {
                                const status = guideStatus(documents, reports, t, term);
                                const classes = teacher.assignments.find((a) => a.grade === t.grade && a.subject === t.subject)?.classes ?? [];
                                const source = classes.find((k) => k !== t.klass && hasDocs({ ...t, klass: k }, term));
                                return (
                                  <li key={t.klass} className={cn("flex w-full max-w-sm min-w-60 flex-1 flex-col gap-1.5 rounded-xl border bg-card p-3", status === "none" ? "border-dashed border-amber-700 bg-amber-50" : "border-border")}>
                                    <p className="font-bold">{classLabel(t.grade, t.klass)}</p>
                                    <StatusPill status={status} />
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {status !== "none" && (
                                        <Button
                                          className="h-10"
                                          onClick={() => {
                                            focusGuide(t, term);
                                          }}
                                        >
                                          Abrir guia
                                        </Button>
                                      )}
                                      {status === "none" && (
                                        <Button variant="outline" className="h-10" onClick={() => openSeries(t.subject, t.grade)}>Enviar PDF</Button>
                                      )}
                                      {status === "none" && source !== undefined && (
                                        <Button variant="outline" className="h-10" onClick={() => setCopy({ grade: t.grade, subject: t.subject, from: source, to: t.klass, n: Date.now() })}>
                                          Copiar de {classLabel(t.grade, source)}
                                        </Button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </section>
                    ))}
                  </>
                )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row print:block print:min-h-0">
      {reportPageStyle}
      <Sidebar
        activeGrade={section === "guias" ? (detail?.grade ?? null) : null}
        activeSubject={section === "guias" ? (detail?.subject ?? null) : null}
        activeKlass={section === "guias" ? (detail?.klass ?? null) : null}
        activeTerm={section === "guias" ? activeTerm : null}
      />
      <main id="conteudo" className="min-w-0 flex-1 p-5 lg:p-8 print:p-0">
        {storageWarning && <p role="alert" className="mb-4 rounded-lg border border-destructive p-3 text-sm text-destructive">{storageWarning}</p>}
        <nav aria-label="Seções" className="mb-6 flex flex-wrap gap-1 border-b border-border pb-3 print:hidden">
          {([
            ["materias", "Minhas matérias", section !== "guias", () => setSection("materias")],
            ["schedule", "Cronograma", section === "guias" && view === "schedule", () => { setView("schedule"); setSection("guias"); }],
            ["report", "Guias de aprendizagem", section === "guias" && view === "report", () => { setView("report"); setSection("guias"); }],
          ] as const).map(([id, label, active, go]) => (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={go}
              className={cn("lift min-h-10 rounded-lg border px-5 font-bold", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
            >
              {label}
            </button>
          ))}
        </nav>
        {section === "materias" && <SubjectsPage onOpen={openSeries} />}
        {section === "serie" && open && (
          <SeriesPage
            subject={open.subject}
            grade={open.grade}
            onBack={() => setSection("materias")}
            onViewGuide={viewGuide}
            onRead={(curricula, fileName) => setPending({ curricula, fileName })}
            onReview={setEditingId}
          />
        )}
        {section === "guias" && (documents.length === 0 ? (
          <div className="mx-auto mt-24 max-w-md text-center">
            <h1 className="text-2xl leading-8 font-bold">Guias de aprendizagem</h1>
            <p className="mt-2 text-muted-foreground">Ainda não há guia. Em &ldquo;Minhas matérias&rdquo;, abra uma série e envie o PDF do guia.</p>
            <Button className="mt-4 h-10" onClick={() => setSection("materias")}>Ir para Minhas matérias</Button>
            <div className="mt-4 text-left"><TutorialCallout /></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="print:hidden">
              <ModeToggle mode={mode} onMode={setMode} />
            </div>
            <GuideFilters
              mode={mode}
              targets={targets}
              filter={filter}
              term={mode === "term" ? { value: selectedTerm, onChange: (n) => { setSelectedTerm(n); setOpened(null); setStacked(false); } } : undefined}
              onFilter={changeFilter}
            />
            {detail && activeTerm !== null ? (
              <div id="painel-bimestre" className="min-w-0 space-y-5">
                {opened && matching.length !== 1 && (
                  <Button variant="outline" className="h-10 print:hidden" onClick={() => setOpened(null)}>Voltar às guias</Button>
                )}
                <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
                  <div>
                    <h1 className="text-2xl leading-8 font-bold">{detail.subject} · {classLabel(detail.grade, detail.klass)}</h1>
                    {teacher.name && <p className="text-[13px] text-muted-foreground">Professor(a): {teacher.name}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {classesOfTarget.length > 1 && (
                      <Button variant="outline" className="h-10" onClick={() => setCopy({ grade: detail.grade, subject: detail.subject, from: detail.klass, n: Date.now() })}>
                        Copiar guia para outra turma…
                      </Button>
                    )}
                    <Button className={cn("h-10", DARK_BLUE)} onClick={() => window.print()}>Imprimir esta guia</Button>
                  </div>
                </header>
                <TermStrip target={detail} activeTerm={activeTerm} onTerm={setSelectedTerm} onUpload={() => openSeries(detail.subject, detail.grade)} />
                {hasDocs(detail, activeTerm) ? (
                  <>
                    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
                      <Button
                        className={cn("h-10", DARK_BLUE)}
                        disabled={!docsOf(documents, detail, activeTerm).some(isReordered)}
                        onClick={() => {
                          if (window.confirm("Voltar todas as linhas para a ordem original do PDF? As posições que você ajustou serão perdidas.")) {
                            docsOf(documents, detail, activeTerm).forEach((d) => resetRowOrder(d.id));
                          }
                        }}
                      >
                        Restaurar posição original
                      </Button>
                    </div>
                    {guide(detail, activeTerm)}
                  </>
                ) : (
                  <p role="status" className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-muted-foreground">
                    {classLabel(detail.grade, detail.klass)} de {detail.subject} ainda não tem guia neste bimestre. Envie o PDF acima.
                  </p>
                )}
              </div>
            ) : !started ? (
              <p role="status" className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-muted-foreground print:hidden">
                {mode === "term" ? "Escolha um bimestre para ver as guias." : mode === "grade" ? "Escolha uma série para ver as guias." : "Escolha uma matéria para ver as guias."}
              </p>
            ) : mode === "term" && selectedTerm !== null ? (
              termList(selectedTerm)
            ) : (
              <TargetCards
                targets={matching}
                groupBy={mode === "subject" ? "grade" : "subject"}
                onOpen={(t, n) => focusGuide(t, n)}
                onUpload={(t) => openSeries(t.subject, t.grade)}
              />
            )}
          </div>
        ))}
      </main>
      {copy && <CopyGuideDialog key={copy.n} grade={copy.grade} subject={copy.subject} from={copy.from} to={copy.to} onClose={() => setCopy(null)} />}
      <ParseReview
        curricula={reviewing}
        open={reviewing !== null}
        isNew={pending !== null}
        onCancel={close}
        onConfirm={confirm}
      />
      <TermConflictDialog
        conflict={conflict}
        onCancel={() => setConflicts((q) => q.slice(1))}
        onKeepBoth={() => resolve(false)}
        onReplace={() => resolve(true)}
      />
    </div>
  );
}
