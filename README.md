# Cronograma de Geografia

Webapp local que lê o PDF do **Guia do Currículo Priorizado de Geografia (EM, SP)** e monta o cronograma do bimestre por semanas, com reordenação por arrastar, escolha de colunas, impressão em A4 e exportação dos dados.

Stack: Next.js (App Router), React, TypeScript, Tailwind CSS e shadcn/ui. Roda apenas na sua máquina.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Testes: `npm test`. Tipos: `npm run typecheck`. Os dados ficam no navegador (localStorage). Use **Exportar dados** para guardar uma cópia.

## Documentos

| Arquivo | Conteúdo |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | Regras de trabalho, estrutura de pastas e definição de pronto |
| [`docs/PRODUCT.md`](./docs/PRODUCT.md) | O que o app faz, regras de negócio, hipóteses e critérios de aceite |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Modelo de dados, cálculo das semanas, linhas por semana, leitura do PDF, impressão, feriados e exportação |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Cores, tipografia, layout, componentes, estados e impressão |
| [`docs/REFERENCES.md`](./docs/REFERENCES.md) | Bibliotecas escolhidas, fontes de dados e decisões de não usar biblioteca |

## Estado do projeto

Primeira versão implementada (leitura do PDF com conferência, cronograma, arrastar por mouse e teclado, impressão A4 paisagem, exportação em JSON e Markdown, importação em JSON). Cobre: leitura do PDF com conferência, sidebar (professor, dias de aula, bimestres, feriados, colunas e saída), cronograma sugerido, arrastar linhas, impressão A4 e exportação em JSON. Feriados são armazenados, mas ainda não entram no cálculo.
