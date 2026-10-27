# AGENTS.md

Guia de trabalho para qualquer assistente de código (ou pessoa) que mexa neste repositório. Leia antes de escrever código.

## O que é o projeto

Webapp local que recebe o PDF do **Guia do Currículo Priorizado de Geografia (EM, SP)**, transforma a tabela "Escopo - Sequência" em uma página HTML e monta um **cronograma por semanas** a partir dos dias de aula e das datas dos bimestres informados pelo professor. O professor reordena as aulas arrastando, escolhe as colunas, imprime em A4 e exporta os dados.

Detalhes: `docs/PRODUCT.md`. Arquitetura e modelo de dados: `docs/ARCHITECTURE.md`. Visual: `docs/DESIGN_SYSTEM.md`. Bibliotecas e fontes: `docs/REFERENCES.md`.

## Stack

- Next.js (App Router) + React + TypeScript em modo `strict`
- Tailwind CSS + shadcn/ui (componentes copiados para o repositório, base Radix)
- Roda **somente local** (`npm run dev`). Sem banco de dados e sem conta de usuário: os dados ficam no navegador (localStorage) e podem ser exportados.

## Regras de ouro

1. **Biblioteca consolidada antes de código próprio.** Antes de escrever qualquer utilitário (datas, validação, arrastar e soltar, tabela, estado, leitura de PDF, formulários), consulte `docs/REFERENCES.md` e procure em `node_modules`. Só escreva código próprio quando nenhuma biblioteca atender, e registre o motivo em `docs/REFERENCES.md`, na seção "Decisões de não usar biblioteca".
2. **Reaproveite o que já existe no repositório.** Procure componentes, hooks e funções parecidos antes de criar novos. Estenda em vez de duplicar.
3. **Nova dependência exige registro.** Adicione uma linha em `docs/REFERENCES.md` (finalidade, por que esta, alternativas descartadas) no mesmo commit que a instala.
4. **Domínio puro fora da interface.** Cálculo de semanas, distribuição de aulas, leitura do PDF e exportação ficam em `src/lib/` como funções puras com testes. Componentes só chamam essas funções.
5. **TypeScript sem `any`.** Dados que vêm de fora (PDF lido, JSON importado, API de feriados, localStorage) passam por um schema `zod` antes de entrar no estado.
6. **Privacidade.** Nenhum dado do professor sai da máquina, exceto as consultas de feriados (que só enviam ano, UF e município). Não adicione analytics nem serviços externos sem pedido explícito.
7. **Interface em português do Brasil.** Código, nomes de variáveis e commits em inglês. Use o glossário abaixo para manter o vocabulário.
8. **Acessibilidade é requisito**, não acabamento: foco visível, contraste AA, arrastar também por teclado, `prefers-reduced-motion` respeitado.

## Fluxo de trabalho combinado com o dono do projeto

- Trabalhamos **por partes**. Antes de implementar uma parte nova, mostre o plano e espere aprovação.
- Entregue uma **primeira versão enxuta** e espere a revisão antes de ampliar.
- Quando houver dúvida de produto, pergunte uma coisa de cada vez.
- Mudou uma decisão? Atualize o documento correspondente em `docs/` no mesmo commit.

## Glossário (interface em português, código em inglês)

| Interface | Código |
| --- | --- |
| Aula (linha do guia) | `Lesson` |
| Conteúdo | `content` |
| Objetivos de aprendizagem | `objectives` |
| Habilidades (códigos BNCC) | `skills` |
| Aprendizagem Essencial (AE) | `essentialLearning` |
| Bimestre | `term` |
| Semana do cronograma | `Week` |
| Cronograma | `schedule` |
| Feriado | `Holiday` |
| Dia de aula | `teachingDay` |

## Estrutura de pastas (alvo)

```
src/
  app/                 rotas e layout (Next App Router)
  components/
    ui/                shadcn/ui
    sidebar/           blocos da sidebar (professor, bimestres, feriados, saída)
    subjects/          Minhas matérias e página de cada série (turmas, aulas por dia, PDF)
    schedule/          tabela, linhas arrastáveis, seletor de colunas
    print/             estilos e visão de impressão
  lib/
    pdf/               leitura do PDF e montagem das aulas
    schedule/          semanas e distribuição das aulas
    holidays/          clientes e normalização de feriados
    export/            JSON e Markdown
  store/               estado global (Zustand + persist)
  types/               tipos e schemas zod
docs/
```

## Definição de pronto (por parte entregue)

- Tipos e schemas atualizados; sem `any`.
- Funções de `src/lib/` com testes (Vitest) cobrindo os casos de borda descritos em `docs/ARCHITECTURE.md`.
- Navegável só com teclado; sem erros no console.
- Impressão conferida em A4 (visualização de impressão do navegador) quando a parte tocar tabela ou estilos.
- Documentos em `docs/` atualizados.
