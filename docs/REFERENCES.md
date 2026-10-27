# Referências

Regra do projeto: **biblioteca consolidada antes de código próprio**. Esta lista é a primeira parada antes de escrever qualquer utilitário. Toda dependência nova entra aqui no mesmo commit que a instala.

> Versões não estão fixadas neste documento de propósito. Ao instalar, confirme a versão estável atual e registre-a no `package.json`.

## Bibliotecas escolhidas

| Necessidade | Pacote | Por que esta | Alternativas descartadas | Documentação |
| --- | --- | --- | --- | --- |
| Framework | `next`, `react`, `typescript` | Definidos pelo dono do projeto | | https://nextjs.org/docs |
| Estilo | `tailwindcss` | Definido pelo dono do projeto | | https://tailwindcss.com/docs |
| Componentes de interface | `shadcn/ui` (Radix + Tailwind) | Inclui `Sidebar`, `Calendar`, `Dialog`, `Table`; componentes ficam no repositório e são editáveis | Material UI e Chakra (estilo próprio pesado, conflita com Tailwind) | https://ui.shadcn.com |
| Ícones | `lucide-react` | Padrão do shadcn/ui | | https://lucide.dev |
| Leitura de PDF | `pdfjs-dist` | PDF.js da Mozilla, referência do ecossistema, devolve texto com coordenadas | `pdf-parse` (só texto corrido, perde colunas); OCR (o PDF já tem camada de texto) | https://mozilla.github.io/pdf.js/ |
| Tabela | `@tanstack/react-table` | Estado pronto de visibilidade e ordem de colunas, sem impor visual | Tabela feita à mão | https://tanstack.com/table |
| Arrastar e soltar | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Listas ordenáveis, sensores de teclado e toque, acessibilidade embutida | `react-beautiful-dnd` (descontinuado); HTML5 drag-and-drop nativo (sem teclado e frágil em tabelas) | https://dndkit.com |
| Datas | `date-fns` (locale `ptBR`) | Semanas, intervalos e formatação sem inventar cálculo de calendário | `dayjs`, `moment` | https://date-fns.org |
| Seletor de datas | `Calendar` do shadcn/ui (usa `react-day-picker`) | Já vem no kit, aceita locale | | https://daypicker.dev |
| Estado global e persistência | `zustand` com middleware `persist` | Pequeno, tipado, persistência em localStorage pronta | Redux Toolkit (excesso para este caso) | https://zustand.docs.pmnd.rs |
| Validação | `zod` | Valida PDF lido, JSON importado, API e storage; gera os tipos | Validação manual | https://zod.dev |
| Formulários | `react-hook-form` + `@hookform/resolvers` | Integra com `zod` e com os campos do shadcn/ui | | https://react-hook-form.com |
| Notificações | `sonner` (via shadcn/ui) | | | https://sonner.emilkowal.ski |
| Testes unitários | `vitest` + `@testing-library/react` | Rápido, funciona bem com TypeScript | Jest | https://vitest.dev |
| Teste de impressão e fluxo | `playwright` (opcional; usado só à mão, não é dependência do projeto) | Gera PDF A4 de verdade para conferir quebras e margens | | https://playwright.dev |
| Cálculo offline de feriados | `date-holidays` | Cobre feriados nacionais e estaduais do Brasil (conferido: SP traz 9 de Julho). Não cobre municípios | | https://github.com/commenthol/date-holidays |
| Utilitário de classes CSS | `clsx` + `tailwind-merge` | Padrão do shadcn/ui (`cn`) | O pacote `cn` que o `shadcn init` adicionou foi removido: não é este utilitário | https://github.com/lukeed/clsx |
| Base dos componentes shadcn | `@base-ui/react`, `class-variance-authority`, `tw-animate-css` | Vêm com o estilo `base-nova` do shadcn/ui | | https://ui.shadcn.com |
| Lint e formatação | `eslint` (config do Next), `prettier` | | | https://nextjs.org/docs/app/api-reference/config/eslint |

## Sem biblioteca (decisões)

- **Redimensionar imagem do relatório**: `canvas` do navegador (`createImageBitmap` + `toDataURL`), cerca de 20 linhas. Bibliotecas de imagem (browser-image-compression, compressorjs) trazem mais do que o caso pede: reduzir uma imagem a um tamanho máximo antes de guardar no localStorage.
- **Lista com marcadores e links no relatório**: `lib/report/list.ts`, 40 linhas. Um editor de texto rico (Tiptap, Lexical) seria exagero para listas de uma linha por item e exigiria guardar HTML.

| Item | Decisão | Motivo |
| --- | --- | --- |
| Impressão | `window.print()` + CSS `@page` | Controle total de A4 e margens; `react-to-print` não acrescenta nada aqui |
| Exportação | `Blob` + `<a download>` | Poucas linhas; `file-saver` é desnecessário nos navegadores atuais |
| Geração do Markdown | Função própria em `lib/export` | É um `join` de linhas; nenhuma biblioteca compensa |
| Seletor de datas | `<input type="date">` nativo | Acessível, usa o idioma do navegador e não pesa; o `Calendar` do shadcn fica para se o professor pedir |
| Ordem das colunas | Botões “mover para antes/depois” | Funciona por teclado sem segundo contexto de arrastar; o dnd-kit continua só nas linhas |
| Linhas por semana e sobra de aulas | Funções próprias em `lib/schedule` (`build.ts`, `rows.ts`) | Regra específica do produto (uma linha por aula do professor, extras nas últimas semanas); testes cobrem |
| Edição de célula | Componente próprio `EditableCell` (texto simples, salvar ao sair) | Não precisa de editor rico; texto puro com uma linha por item |

## Fontes de dados

### Feriados

| Escopo | Fonte | Situação |
| --- | --- | --- |
| Nacionais | BrasilAPI, `GET /api/feriados/v1/{ano}` | Endpoint existente e documentado. Docs: https://brasilapi.com.br/docs |
| Estaduais | `date-holidays` (cálculo offline) | **Confirmado** na instalação: lista feriados públicos por UF |
| Municipais | Proposta de endpoint v2 por estado e município no repositório da BrasilAPI (pull requests #555 e #558) | **Não confirmei que esteja publicada.** Verificar antes de depender dela |
| Cálculo offline (reserva) | `date-holidays` | Lista o Brasil entre os países suportados; **cobertura de estados e municípios a verificar** na instalação. https://github.com/commenthol/date-holidays |
| Municipais (garantia) | Cadastro manual pelo professor | Sempre disponível; é o único caminho certo para feriados municipais |
| Lista de UFs e municípios (campo de localização) | API de localidades do IBGE | A confirmar na implementação. https://servicodados.ibge.gov.br/api/docs/localidades |

Consultas de feriados saem direto do navegador (`lib/holidays/load.ts`), pois o app é publicado como site estático no GitHub Pages; a BrasilAPI aceita CORS. Só o ano é enviado à BrasilAPI; UF e município não saem da máquina.

### Educação

- **Texto das habilidades EM13CHS**: extraído do PDF oficial da BNCC Ensino Médio (MEC, 2018, `basenacionalcomum.mec.gov.br/images/historico/BNCC_EnsinoMedio_embaixa_site_110518.pdf`) e gravado em `src/lib/skills/bncc.ts` (31 habilidades de Ciências Humanas). Habilidades de outras áreas não estão no arquivo e aparecem como “descrição não encontrada”.
- **Guia do Currículo Priorizado de Geografia (EM)**, Secretaria da Educação do Estado de São Paulo: fonte do PDF de entrada (arquivo de exemplo usado como fixture dos testes de leitura).
- **BNCC**: códigos de habilidade `EM13CHS...` (ex.: `EM13CHS306`). https://basenacionalcomum.mec.gov.br
- **Currículo Paulista**: base dos guias estaduais.

## Arquivos de teste (fixtures)

- `tests/fixtures/guia-geografia-1e2serie-todos.pdf`: cópia de `files/escopo - todos.pdf` (16 páginas, 1ª e 2ª série, bimestres 1 a 4). Os testes conferem as 8 leituras, na ordem do PDF, cada uma começando na aula 1 e sem aulas repetidas.
- `tests/fixtures/guia-geografia-1serie-4bim.pdf`: o PDF de exemplo. O resultado esperado está nas asserções de `src/lib/pdf/parse.test.ts` (12 aulas, aula 10 com AE1 e AE6, aula 4 com dois conteúdos, aulas 11 e 12 marcadas como projeto).

## Como atualizar este documento

1. Instalou ou removeu pacote: ajuste a tabela.
2. Escolheu escrever código próprio: registre em "Sem biblioteca".
3. Confirmou uma fonte de dados que estava "a verificar": troque a situação e cite como confirmou.
