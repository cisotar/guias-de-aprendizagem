# Design system

## Quem usa e para quê

Professor planejando o bimestre, em geral num notebook, com muito texto denso para ler, comparar e reorganizar, e uma folha impressa como produto final. O design serve à **leitura de tabela** e à **impressão**. A interface tem que sumir e deixar a tabela aparecer.

## Princípios

1. **A tabela é a protagonista.** Sidebar discreta, tabela com o maior espaço e o maior cuidado tipográfico.
2. **A semana é a estrutura.** O que diferencia este app de uma tabela qualquer é a coluna Cronograma: as semanas são faixas visíveis, e as aulas de cada semana ficam agrupadas. Este é o único elemento "memorável" da interface; o resto é quieto.
3. **Herdar o guia oficial.** As cores de apoio vêm do próprio PDF (carmim do cabeçalho, rosa das bordas, lilás das aulas de projeto), para o professor reconhecer a fonte.
4. **Tela e papel são o mesmo desenho.** O que aparece na impressão sai de tokens próprios, sem depender de sombras, cores de fundo pesadas ou hover.
5. **Texto de interface curto e direto**, em português, na voz de quem usa: "Enviar PDF", "Salvar", "Exportar dados". Um botão mantém o mesmo nome em todo o fluxo. Erros dizem o que aconteceu e como resolver.

## Cores

Definidas como variáveis CSS e expostas no Tailwind (tema do shadcn/ui com estes valores).

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#F1F4F7` | fundo da página (cinza azulado, ecoa o fundo do guia) |
| `--surface` | `#FFFFFF` | tabela, sidebar, diálogos |
| `--ink` | `#1C2430` | texto principal |
| `--ink-muted` | `#566274` | texto secundário, legendas |
| `--primary` | `#B3203F` | ações principais, cabeçalho da tabela |
| `--primary-foreground` | `#FFFFFF` | texto sobre `--primary` |
| `--line` | `#F3B8C8` | bordas da tabela (rosa do guia) |
| `--week` | `#1F5F7A` | faixa e texto da coluna Cronograma (azul-petróleo) |
| `--week-soft` | `#E3EEF2` | só na prévia do arrasto (sem uso nas semanas) |
| `--project` | `#E9D5F5` | sem uso na tabela (aulas de projeto só têm o selo "Projeto") |
| `--report-head` | `#F8E7BB` | títulos das caixas do relatório (bege do guia da escola) |
| `--report-bar` | `#DDD9C3` | barra acima da tabela de datas do relatório |
| `--focus` | `#1F5F7A` | anel de foco (2 px + 2 px de afastamento) |
| `--danger` | `#B42318` | erros |

Regras:

- Contraste mínimo **AA** (4,5:1 para texto). Conferir `--primary-foreground` sobre `--primary` e `--ink-muted` sobre `--surface`.
- Cor nunca é o único sinal: aula de projeto também tem um rótulo "Projeto"; semana sem aula tem o texto "sem aula prevista".
- Sem gradientes e sem sombras decorativas. Elevação só em diálogos e no item sendo arrastado.

## Tipografia

- **Família única:** Atkinson Hyperlegible (via `next/font/google`), criada para leitura clara; combina com texto denso em tabela. Verificar se a variante "Next" está disponível no `next/font` e, se não estiver, usar a clássica.
- Números de data e de aula com `font-variant-numeric: tabular-nums` para alinhar.
- Fallback: `system-ui, sans-serif`.

| Papel | Tamanho / linha | Peso |
| --- | --- | --- |
| Título da página | 24 / 32 | 700 |
| Título de bloco da sidebar | 15 / 22 | 700 |
| Corpo e células da tabela | 14 / 20 | 400 |
| Cabeçalho da tabela | 14 / 20 | 700 |
| Legenda e ajuda | 13 / 18 | 400 |
| Impressão (células) | 9,5 pt / 12,5 pt | 400 |

- Texto corrido com no máximo ~75 caracteres por linha (diálogos e ajudas).
- Frases em caixa normal. Sem rótulos em caixa alta.

## Layout

- **Sidebar à esquerda**, 320 px, recolhível (componente `Sidebar` do shadcn/ui). Em telas estreitas vira gaveta.
- **Área principal** ocupa o resto, com a tabela rolando horizontalmente dentro do próprio contêiner (a página nunca rola de lado).
- Espaçamento em múltiplos de 4 px; blocos da sidebar separados por 24 px.

```
┌───────────────┬──────────────────────────────────────────────┐
│ Sidebar 320   │  Cronograma · Geografia · 1ª série · 4º bim.  │
│               │ ┌─────────┬────┬──────────┬────────┬────┬────┐ │
│ PDF           │ │Cronogr. │Aula│Conteúdo  │Objetiv.│Hab.│AE  │ │
│ Professor     │ ├─────────┼────┼──────────┼────────┼────┼────┤ │
│ Bimestres     │ │ 05/10–  │ 1  │ ⠿ ...    │        │    │    │ │
│ Feriados      │ │ 09/10   │ 2  │ ⠿ ...    │        │    │    │ │
│ Colunas       │ ├─────────┼────┼──────────┼────────┼────┼────┤ │
│ Saída         │ │ 12/10–  │ 3  │ ⠿ ...    │        │    │    │ │
│  [Imprimir]   │ │ 16/10   │    │          │        │    │    │ │
│  [Exportar]   │ └─────────┴────┴──────────┴────────┴────┴────┘ │
└───────────────┴──────────────────────────────────────────────┘
```

## Componentes

Base: **shadcn/ui** (Sidebar, Button, Input, Checkbox, Calendar/Popover, Dialog, Tabs, Toast/Sonner, Table, Tooltip, Select, Switch). Reutilizar antes de criar. Componentes próprios:

| Componente | Função | Observações |
| --- | --- | --- |
| `ScheduleTable` | tabela principal | `@tanstack/react-table`; cabeçalho `--primary`; bordas `--line` |
| `WeekCell` | célula Cronograma | `rowSpan` com as aulas da semana; texto `--week`, fundo uniforme (`--surface`, como as demais células; a semana se separa pela linha grossa); mostra "05/10 a 09/10" |
| `SortableRow` | linha arrastável | alça `GripVertical` (lucide); arrasta por mouse, toque e teclado |
| `ColumnPicker` | colunas visíveis e ordem | lista com checkbox e alça |
| `TeachingDaysField` | segunda a sexta | cinco checkboxes numa linha, rótulos "Seg" a "Sex" |
| `TermDatesField` | início e fim por bimestre | seletor de data em pt-BR; erro se fim ≤ início |
| `HolidaysPanel` | feriados | lista por escopo, botão "Buscar feriados", formulário de feriado manual |
| `PdfDropzone` | envio do PDF | arrastar ou escolher arquivo; estado de leitura e de erro |
| `ParseReview` | conferência da leitura | tabela editável das aulas encontradas |

## Estados

- **Vazio** (sem PDF): chamada única, "Envie o PDF do guia para montar o cronograma", com o botão "Enviar PDF".
- **Lendo PDF**: indicador de progresso com texto "Lendo o PDF…".
- **Erro de leitura**: diz o que não foi achado ("Não encontrei a coluna Habilidades na página 2") e oferece corrigir à mão ou importar JSON.
- **Semana sem aula prevista**: linha com texto em `--ink-muted`.
- **Dados salvos**: toast "Alterações salvas" só em ações explícitas (importar, exportar), nunca a cada arrastar.

## Interação e movimento

- Arrastar: item sobe com sombra e leve escala; os demais se acomodam com a animação padrão do `dnd-kit`. É movimento que responde à ação do professor.
- Sem animações de entrada de página ou de seção.
- `prefers-reduced-motion` desliga a animação de reordenação.
- Teclado: Tab chega à alça; Espaço pega; setas movem; Espaço solta; Esc cancela. Anúncios para leitor de tela via `dnd-kit` em português.
- Foco sempre visível com `--focus`.

## Impressão (A4)

| Item | Valor inicial |
| --- | --- |
| Tamanho | `A4` |
| Orientação | paisagem (confirmado por ora; retrato fica para depois) |
| Margens (`@page`) | 15 mm esquerda e direita (garantidas); 12 mm superior e inferior |
| Largura útil da tabela | 267 mm; `table-layout: fixed`, sem passar da margem |
| Cabeçalho da tabela | repete em todas as páginas |
| Quebra de linha da tabela | `break-inside: avoid` em cada linha |
| Cor | cabeçalho em `--primary` com texto branco; se a impressora for preto e branco, o cabeçalho continua legível por ser texto em negrito sobre cinza escuro |
| Fundo | sem fundo na página; `print-color-adjust: exact` só no cabeçalho e nas aulas de projeto |
| Ocultar | sidebar, botões, alças de arrastar (`print:hidden`) |
| Relatório | faixa no `thead` de uma tabela externa, repete em todas as páginas; caixas com `break-inside: avoid`; fundo bege impresso com `print-color-adjust: exact` |
| Identificação | nome do professor, disciplina, série e bimestre no topo da primeira página |

## Responsividade e acessibilidade

- Funciona de 1024 px para cima como alvo principal; abaixo disso a sidebar vira gaveta e a tabela rola dentro do contêiner.
- Alvos de toque de pelo menos 40 px nas alças e checkboxes.
- Rótulos visíveis em todos os campos; `aria-label` nas alças ("Mover aula 3").
- Língua da página `pt-BR`.
