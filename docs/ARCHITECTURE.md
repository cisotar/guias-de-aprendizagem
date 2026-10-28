# Arquitetura

## Visão geral

Aplicação Next.js (App Router) que roda local. Quase tudo acontece no navegador; o servidor só existe para o route handler de feriados (evita problemas de CORS e permite cache).

```
PDF ──► lib/pdf ──► Curriculum ─┐
Minhas matérias + sidebar (bimestres) ─┼─► lib/schedule ──► Schedule ──► Tabela ──► Impressão
Feriados (lib/holidays) ────────┘        (sem uso no cálculo, por ora)      └─► Exportação
                       tudo persistido em store (Zustand + localStorage)
```

## Modelo de dados

Definidos como schemas `zod` em `src/types/` (os tipos TypeScript saem de `z.infer`).

```ts
type PlanDocument = {       // a guia de uma turma, vinda de um PDF
  id: string;
  fileName: string;
  klass: string;            // turma dona desta cópia; "" = a série não separa turmas
  curriculum: Curriculum;
  rowOrder: string[];       // sequência das linhas (ids de aulas ou `blank-…`); o que o arrastar altera
  removedRows: Record<string, number>; // linhas removidas, por id de semana
  deletedLessons: string[]; // aulas do PDF removidas da tabela (voltam com "Restaurar")
};

type Curriculum = {
  grade: string;            // "1ª série"
  term: number;             // 4 (bimestre do guia)
  subject: string;          // "Geografia"
  lessons: Lesson[];
};

type Lesson = {
  id: string;               // estável, usado no arrastar
  number: number;           // coluna "Aula"
  title: string;
  content: string[];        // tópicos
  objectives: string[];
  skills: string[];         // ex.: "EM13CHS306"
  essentialLearning: { code: string; text: string }[]; // ex.: AE6
  highlight?: "project";    // aulas 11 e 12 aparecem destacadas no guia
  custom?: true;            // linha escrita pelo professor (number = 0); fora da contagem do PDF
};

type LessonsPerDay = { 1: number; 2: number; 3: number; 4: number; 5: number }; // segunda=1 ... sexta=5; 0 = não leciona

type Teacher = { name: string; assignments: Assignment[] };

type Assignment = {         // uma matéria numa série
  grade: string;            // "1ª série"
  subject: string;          // "Biologia"
  classes: string[];        // ["A", "B", "C"]; vazio = não separa turmas
  classLessons: Record<string, LessonsPerDay>; // aulas por dia de cada turma, pelo nome; sem entrada usa lessonsPerDay
  lessonsPerDay: LessonsPerDay; // horário da série sem turmas; nas turmas sem horário próprio, é o ponto de partida
};
// lessonsPerDayFor(teacher, grade, subject, klass?): o horário da turma; o cronograma de cada documento usa o `klass` dele.

type Term = { number: 1 | 2 | 3 | 4; start: string; end: string }; // ISO yyyy-MM-dd

type Holiday = {
  date: string;             // ISO
  name: string;
  scope: "national" | "state" | "municipal" | "manual";
  source: string;           // "brasilapi", "date-holidays", "manual"
};

type Week = {
  id: string;
  start: string;            // ISO, já cortado pelo bimestre
  end: string;
  teachingDays: number;     // quantos dias com aula caem na semana
  lessonSlots: number;      // soma das aulas desses dias (linhas base da semana)
  lessonCount: number;      // quantas linhas a semana tem (calculado)
};

type Schedule = {
  termNumber: number;
  weeks: Week[];
  order: string[];          // ids das aulas, na ordem atual (o que o arrastar altera)
};
```

A linha na posição *k* da tabela mostra `order[k]`; a semana dessa posição sai da soma acumulada de `lessonCount`. Por isso arrastar altera só `order`.

## Cálculo das semanas (`lib/schedule/weeks.ts`)

1. Percorrer de `term.start` a `term.end`, agrupando por semana (segunda a sexta) com `date-fns` (`eachWeekOfInterval` com `weekStartsOn: 1`, locale `ptBR`).
2. Cortar a primeira e a última semana pelas datas do bimestre.
3. Em cada semana, contar `teachingDays` (dias com aula dentro do corte) e somar `lessonSlots` (aulas desses dias).
4. Descartar semanas com `lessonSlots = 0`.

Casos de borda para teste: bimestre começando no meio da semana; terminando numa segunda; começando num sábado; um único dia; fim anterior ao início (erro de validação); professor sem nenhum dia marcado (erro de validação).

## Linhas das semanas (`lib/schedule/build.ts` e `rows.ts`)

Entrada: semanas com `lessonSlots`, a sequência `rowOrder` do documento e `removedRows`. Saída: `lessonCount` (linhas) por semana.

1. `base = max(1, lessonSlots − removedRows[semana])` linhas em cada semana.
2. A sequência é normalizada (`normalizeRowOrder`): ids de aulas que existem ou de linhas em branco (`blank-…`), sem repetidos, com as aulas que faltam no fim e sem brancos sobrando no final.
3. Se a sequência é maior que a soma das bases, `spreadExtraRows` dá uma linha extra por semana, da última para a primeira, recomeçando pela última se for preciso.
4. A linha *k* da tabela mostra `order[k]` (ou fica vazia); a semana vem da soma acumulada de `lessonCount`.

Mexer na linha: arrastar = tirar da sequência as linhas movidas (`moveRows`, uma ou várias, mantendo a ordem entre elas) e reinseri-las em bloco de modo que a linha pegada caia na posição de destino (sem deixar buraco se o destino tem conteúdo) (completada com `blank-…` se a posição de destino está além do fim); a regra está em `moveBlock` (`src/lib/schedule/move.ts`), usada ao soltar e na prévia do arrasto (a tabela chama `moveBlock` com o alvo atual e mostra em cada linha fixa a aula que ficaria ali); clonar (`cloneRow`) = copiar a aula como `custom` (mantém o `number`) logo abaixo na sequência; remover linha (`removeRow`) = `removedRows[semana] += 1` (exceto em semana de uma linha só) e tirar o item da sequência; se era aula do PDF vai para `deletedLessons`, se era linha livre é apagada; digitar numa linha vazia = criar uma aula `custom` (número 0) naquela posição; esvaziar uma linha `custom` a devolve a `blank-…`.

Testes: 30 linhas e 34 aulas (4 extras nas 4 últimas semanas); extras maiores que o número de semanas; remoção; semana nunca fica sem linha; branco no meio; normalização.

## Leitura do PDF (`lib/pdf`)

- Biblioteca: `pdfjs-dist` (Mozilla PDF.js), rodando no navegador com worker.
- O PDF tem camada de texto. A extração simples embaralha as colunas, então usamos as **coordenadas** de cada trecho de texto (`getTextContent()` devolve a posição).
- A matéria **não** está no PDF: `readCurriculumPdf(file, subject)` dá a todas as leituras a matéria que o professor escolheu ao enviar (entre as de `teacher.assignments`).
- Um PDF pode trazer várias séries e bimestres. `parsePages` devolve `ParsedCurriculum[]`, uma leitura por (série, bimestre): cada página diz os dois no cabeçalho ("Escopo - Sequência · 1ª série · 2º Bimestre"); o que a página não diz continua valendo da anterior. A linha que continua da página anterior só se junta a uma aula da mesma leitura. A série é normalizada para "Nª série" (`lib/schedule/grades.ts`).
- Passos: (1) localizar o cabeçalho em cada página (Aula, Conteúdo, Objetivos de aprendizagem, Habilidades, Aprendizagem Essencial); (2) achar a grade da tabela pelos **retângulos preenchidos** do PDF (`getOperatorList`, com o CTM acompanhado): as células do cabeçalho dão as faixas de coluna e as células encostadas na borda esquerda dão as faixas de linha. O texto sozinho não serve: o cabeçalho é centralizado e as linhas têm alturas diferentes; (3) atribuir cada trecho de texto à célula pela faixa de `x` e pela faixa de `y` da linha; linhas com fundo não branco são as de projeto; (4) dividir os tópicos por marcador e quebra de linha; (5) ler a etiqueta de série e bimestre; (6) validar com `zod`.
- Tópicos: novo tópico = linha com marcador, ou linha em maiúscula logo depois de uma linha que termina em `)`. É heurística: nas aulas 7, 9 e 10 itens sem marcador acabam juntos num tópico só, e a conferência existe para corrigir isso.
- Particularidades conhecidas do guia: linhas se dividem entre páginas; a aula 10 tem duas AEs; a aula 4 tem um conteúdo sem marcador; as aulas 11 e 12 aparecem em lilás.
- **Tela de conferência**: depois da leitura, o professor vê as aulas encontradas e corrige qualquer campo antes de seguir. Se a leitura falhar, o app diz o que não achou e oferece importar um JSON.
- A leitura é um módulo isolado, com testes usando o PDF de exemplo como fixture.

## Série e bimestre do PDF, conflitos e navegação

- Cada `ParsedCurriculum` tem `term` `null` quando o cabeçalho não traz "Nº Bimestre" (1 a 4) e `grade` vazio quando não traz "Nª série". `ParseReview` mostra um grupo por leitura, com seletores de série e de bimestre, e só confirma com todos escolhidos; o resultado é `Curriculum[]`, salvo de uma vez (um documento por leitura, todos com o nome do arquivo).
- Um PDF vira **um documento por turma** (`addGuide`): cada turma tem a sua cópia das aulas, com ordem, linhas livres e linhas removidas próprias, e o seu horário. A chave de uma guia é `curriculum.grade` + `curriculum.subject` + `klass` + `curriculum.term`, a mesma do relatório. O conflito de PDF continua sendo do trio série, matéria e bimestre (a janela mostra cada PDF uma vez; substituir remove as cópias de todas as turmas). `lib/schedule/guides.ts` lista as guias (`guideTargets`: matéria, série e turma, vindas de "O que leciono" e dos documentos), acha os documentos de uma guia (`docsOf`) e calcula o status por bimestre (`guideStatus`: sem PDF, pronta ou editada). `lib/schedule/grades.ts` lista as séries com PDF e ordena os documentos por série (pelo número) e depois por bimestre.
- `lib/schedule/sameCurriculum.ts` (`curriculumDifferences`) compara dois guias: série, disciplina e aulas (número, título, conteúdo, objetivos, habilidades e AEs; ignora maiúsculas, espaços, ids e linhas escritas pelo professor).
- A conferência só roda quando a leitura entra numa série e bimestre: PDF novo ou troca de série ou bimestre. Corrigir o texto de um PDF que já está lá não dispara aviso. Se algum PDF da mesma série e bimestre difere, `TermConflictDialog` pergunta: manter os dois, substituir os que diferem ou cancelar. As leituras sem conflito são salvas na hora; as com conflito entram numa fila, uma janela por vez.
- A área principal tem duas seções no topo: **Minhas matérias** (`SubjectsPage`: matérias e um link por série; `SeriesPage`: turmas (pills A a E e "+", lógica em `lib/schedule/classPills.ts`) e aulas por dia em `ClassesEditor`, envio e conferência do PDF, os 4 bimestres com "Ver guia" e `CopyGuideForm`) e **Guias**. A sidebar só tem professor, bimestres (universais), feriados e colunas/saída. "Enviar PDF" nos cartões das guias leva à `SeriesPage`.
- `GuideNav` (`ModeToggle`, `GuideFilters`, `TargetCards`, `TermStrip`): "Ver por" Matéria, Série ou Bimestre (preferência do navegador em `localStorage`, chave `cronograma-geografia:ver-por`, fora do projeto e do JSON). `GuideFilters` desenha os dropdowns em cascata, vazios no início (selects nativos, acessíveis por teclado); a ordem de cada visão fica em `FILTER_ORDER` e a lógica (`filterOptions`, `filterTargets`) em `src/lib/schedule/guides.ts`, testada. O estado (`filter`, `opened`, `selectedTerm`) fica em `App` e zera ao trocar de visão. Matéria e Série: `TargetCards` lista as guias filtradas; com uma só guia (ou ao abrir um cartão) aparece a guia, com `TermStrip` e o relatório ou cronograma. Bimestre: um cartão por guia filtrada (status; "Abrir guia"; sem guia, "Enviar PDF" ou "Copiar de…"); "Ver e imprimir todas" empilha as guias filtradas, uma por página.
- `buildSchedule` usa o horário da série e matéria do documento (`lessonsPerDayFor(teacher, grade, subject)`, lido de `teacher.assignments`); sem atribuição, não há aulas por dia e a tela pede o cadastro em "O que leciono".
- `CopyGuideDialog` copia a guia de uma turma para outras da série, nos bimestres marcados (`copyGuide`: documentos e relatório; o destino é substituído, com aviso). `setClasses` acompanha as guias: passar a separar turmas leva a guia (e o relatório) da série para a primeira turma; deixar de separar traz a da primeira turma de volta; remover uma turma apaga as guias dela (o relatório fica).

## Estado e persistência (`store/`)

- Zustand com middleware `persist` (localStorage), com `version` e `migrate` para evoluir o formato.
- O que é salvo: `documents` (cada um com `curriculum`, `rowOrder` e `removedRows`), `teacher`, `terms`, `holidays`, `columns`, `display` (visíveis e ordem), `reports` e `reportImages` (relatório), `location` (UF e município para feriados).
- Dados da versão 1 (um só `curriculum` e `teachingDays`) são convertidos pelo zod na leitura: viram um documento e 1 aula por dia marcado. O mesmo vale para o JSON exportado com `schemaVersion: 1`.
- Dados de antes das turmas por guia: cada documento sem `klass` vira uma cópia por turma da série e matéria dele, a primeira com o id original (`upgradeClassDocuments`, no localStorage e no JSON importado); sem turmas, `klass` fica vazio.
- Dados de antes das matérias: o horário geral (`lessonsPerDay`) e o por série (`lessonsPerDayByGrade`) viram uma atribuição para cada par série e matéria que já tem PDF, com o horário da série e sem turmas (`upgradeLegacyAssignments`). Relatórios guardados pelo bimestre (`"2"`) ou pela série e bimestre (`"1ª série|2"`) passam para cada série e matéria que tem PDF naquele bimestre, sem turma (`"1ª série|Geografia||2"`); a chave mais específica vence, e sem PDF no bimestre ficam como estão (`upgradeLegacyReports`). Vale para o localStorage e para o JSON importado (inclusive `schemaVersion: 2`).
- Série, matéria e turma não podem ter "|", que separa as partes da chave do relatório.
- As `weeks` e o `Schedule` **não são salvos**: são recalculados a cada mudança por `buildSchedule` (função pura e determinística). O JSON exportado inclui o `schedule` calculado, só para leitura; ao importar valem o `rowOrder` e o `removedRows` de cada documento (o nome antigo `lessonOrder` ainda é aceito).
- A store usa `skipHydration` e é reidratada no cliente (`useHydrated`), para não haver diferença entre servidor e navegador.
- Toda leitura do storage passa por `zod`; se falhar, o app mostra um aviso e não apaga o conteúdo antigo sem confirmação.

## Tabela, colunas e arrastar

- `@tanstack/react-table` para a tabela. Visibilidade e ordem de colunas já fazem parte do estado da biblioteca (`columnVisibility`, `columnOrder`).
- `@dnd-kit/core` + `@dnd-kit/sortable` para arrastar as linhas, com sensores de mouse, toque e **teclado**.
- A coluna Cronograma é renderizada a partir das semanas e é fixa em relação à posição: não faz parte do que se arrasta. Linhas da mesma semana ficam agrupadas, com um separador mais forte entre semanas.
- O seletor de colunas também usa `dnd-kit` para a ordem.

## Impressão

- Impressão nativa do navegador (`window.print()`), sem biblioteca.
- `@page { size: A4 landscape; margin: 12mm 15mm; }` (valores iniciais; ver `docs/DESIGN_SYSTEM.md`). A margem do `@page` é aplicada em todas as páginas. Nas guias (cronograma e relatório) o `@page` fica com margem 0 e as mesmas margens (12 mm em cima e embaixo, 15 mm nas laterais) são desenhadas no conteúdo (`src/components/print/PrintFrame.tsx` e `ReportView`), para valerem também com "Margens: Nenhuma" na janela de impressão do navegador. As margens que o dono do projeto quer garantidas são as **laterais** (esquerda e direita): a tabela usa `width: 100%` da área útil (267 mm em A4 paisagem com 15 mm de cada lado), com `table-layout: fixed` e quebra de palavras longas, para nada ultrapassar a margem.
- `thead { display: table-header-group }` para repetir o cabeçalho; `tr { break-inside: avoid }` para não cortar linhas.
- Sidebar e controles recebem `print:hidden`. A tabela impressa usa as mesmas colunas, na mesma ordem, escolhidas na tela.

## Relatório (`lib/report` + `components/report`)

- Guia de aprendizagem de cada série, matéria e turma em cada bimestre, no modelo `files/ex-guia.docx`: faixa no topo, título com a logo da escola, identificação (escola, professor, componente, série, bimestre), justificativa e objetivos, datas e eventos, o cronograma, competências e temas, estratégias didáticas, princípios e critérios, referências. Fica numa visão própria ("Guia de aprendizagem") ao lado do cronograma; o cronograma entra no lugar da tabela de aulas do modelo.
- `reports[reportKey(série, matéria, turma, bimestre)]` (chave `"1ª série|Biologia|A|2"`; turma vazia = `"1ª série|Biologia||2"`) guarda só o que o professor editou. `copyReport(de, para)` (usado por `copyGuide`) copia o relatório de uma turma ou série para outra, sem o campo `grade` (a identificação volta a ser derivada do destino: série mais turma). Cada campo cai, nesta ordem, em: o que ele escreveu, o valor que o app já sabe (professor, disciplina e série do PDF, "Nº Bimestre/ano" das datas) e o texto do modelo (`lib/report/defaults.ts`). Texto apagado fica vazio e não volta ao padrão.
- Listas são texto: um item por linha; dois espaços (ou Tab) no começo da linha criam subitem, até o 3º nível (●, ○, ■). Endereços `http(s)` viram links (`lib/report/list.ts`). As datas e eventos são linhas `{ text, date }` com data em texto livre ("26/04", "10/06 a 25/06"), preenchidas à mão.
- `reportImages` (faixa do topo e logo da escola) valem para todas as séries e bimestres e ficam como data URL no localStorage. Ao enviar, a imagem é reduzida num `canvas` (`lib/report/image.ts`) para não estourar o espaço do navegador. Sem imagem, a tela mostra o campo de envio e a impressão não reserva espaço.
- Impressão: a faixa está no `thead` de uma tabela externa, então se repete em todas as páginas; cada caixa tem `break-inside: avoid`. Conferido no PDF gerado pelo Chrome (A4 paisagem, 7 páginas com 30 aulas e 4 semanas vazias).

## Feriados (`lib/holidays`)

- Nacionais: BrasilAPI, endpoint `/api/feriados/v1/{ano}`.
- Estaduais e municipais: não há uma fonte gratuita confirmada para todos os municípios. Estratégia em camadas: (1) tentar a fonte online configurada; (2) cair para a biblioteca `date-holidays` (cálculo offline, tem o Brasil, cobertura de estados e municípios a verificar); (3) cadastro manual pelo professor, sempre disponível.
- A função `loadHolidays` normaliza tudo para `Holiday`, deduplica por data e nome.
- Falha de rede nunca bloqueia o app: a sidebar mostra "não foi possível buscar agora" e mantém o que já estava salvo.
- Nesta versão, os feriados só são armazenados e exibidos na sidebar.
- Implementado: BrasilAPI para os nacionais (com `date-holidays` de reserva) e `date-holidays` para os estaduais. O município é guardado, mas não é consultado: só o cadastro manual cobre feriados municipais.

## Exportação (`lib/export`)

- **JSON (principal)**: arquivo versionado com todo o estado do projeto, importável de volta.

```json
{
  "schemaVersion": 3,
  "exportedAt": "2026-10-24T12:00:00-03:00",
  "teacher": { "name": "...", "assignments": [
    { "grade": "1ª série", "subject": "Biologia", "classes": ["A", "B"], "classLessons": { "B": { "1": 0, "2": 2, "3": 0, "4": 1, "5": 0 } }, "lessonsPerDay": { "1": 2, "2": 0, "3": 1, "4": 0, "5": 0 } }
  ] },
  "terms": [{ "number": 4, "start": "2026-10-05", "end": "2026-12-18" }],
  "documents": [
    { "id": "doc-1", "fileName": "guia.pdf", "lessonOrder": [],
      "curriculum": { "grade": "1ª série", "term": 4, "subject": "Geografia", "lessons": [] },
      "schedule": { "termNumber": 4, "weeks": [], "order": [] } }
  ],
  "holidays": [],
  "columns": ["schedule", "number", "content"],
  "reports": { "1ª série|Biologia|A|2": { "school": "...", "events": [{ "text": "Prova Paulista", "date": "10/06 a 25/06" }] } },
  "reportImages": { "banner": "data:image/jpeg;base64,...", "schoolLogo": null }
}
```

- **Markdown (opcional)**: tabela legível com as colunas selecionadas, só para leitura e cópia. Leva o que está na tela (série, matéria e/ou bimestre), em ordem de série, matéria e bimestre.
- Não usamos `.js` como formato de dados: importar código executável de um arquivo é um risco desnecessário, e o JSON cobre o mesmo caso.
- Importação valida com `zod` e mostra o que será substituído antes de confirmar.

## Publicação (GitHub Pages)

O app é exportado como site estático (`output: "export"` em `next.config.ts`) e publicado por `.github/workflows/pages.yml` a cada push em `main`. O `basePath` vem de `PAGES_BASE_PATH` (definido no workflow); no `npm run dev` fica vazio. `cacheComponents` e `partialPrefetching` foram desligados porque não funcionam com export estático. Não há route handlers: a rota `/api/holidays` virou a função `loadHolidays` no navegador.
