# Produto

## Problema

O professor recebe o Escopo-Sequência do bimestre em PDF (slides em tabela) e precisa transformá-lo em um cronograma com datas, ajustado ao seu calendário real, para planejar e imprimir. Ele pode lecionar mais de uma matéria, em várias séries e turmas.

## Usuário

Professor do Ensino Médio da rede estadual de SP (o guia de exemplo é o de Geografia), trabalhando no próprio computador, sem necessidade de internet (exceto para buscar feriados).

## Escopo da primeira versão

### Sidebar (esquerda): só o que vale para tudo

1. **Professor**: nome e escola (ficam armazenados e entram no JSON exportado). O nome do professor e o da escola preenchem a identificação de todas as guias; se o professor escrever outro valor numa guia, vale o da guia, e apagar o campo na guia volta ao da barra lateral.
2. **Bimestres**: data de início e de fim de cada bimestre. As datas são **universais**: valem para todas as séries, matérias e turmas (é o calendário da escola).
3. **Feriados**: o app busca feriados nacionais, estaduais e municipais; o professor também pode cadastrar feriados à mão. **Nesta versão os feriados são apenas recebidos e armazenados; não entram no cálculo.**
4. **Colunas e saída**: escolher quais colunas aparecem e em qual ordem, imprimir e exportar.

### Minhas matérias (área principal)

- **Lista de matérias**: o professor cadastra a matéria (ex.: Matemática) e marca as séries em que leciona (1ª, 2ª, 3ª). Cada matéria mostra **um link por série** ("Matemática · 3ª série") com as turmas, as aulas por semana e quantos bimestres têm PDF. Série em que não leciona aparece tracejada, com "Passar a lecionar".
- **Página de uma matéria numa série**, em quatro partes:
  1. **Turmas e aulas por semana**: turmas (A, B, C; sem turmas = horário direto) e, para cada uma, quantas aulas dá de segunda a sexta (0 = não leciona).
  2. **PDF do Escopo-Sequência**: enviar o PDF já ligado à matéria e à série (o PDF não diz a matéria). O PDF traz só a tabela de aulas e vale para todas as turmas: cada turma recebe a sua cópia. **Um PDF pode trazer várias séries e bimestres** (ex.: `files/escopo - todos.pdf`): o app separa uma leitura por série e bimestre e salva todas de uma vez; série que o PDF traz e o professor não cadastrou entra na lista, sem aulas por dia (o aviso aparece na conferência). Cada leitura salva pode ser conferida de novo ou removida.
  3. **Guia de aprendizagem**: os quatro bimestres, com o status de cada um (pronta, editada, falta o PDF), as datas do calendário da escola (só leitura) e o botão "Ver guia".
  4. **Copiar a guia entre as turmas** (quando há mais de uma turma).
- **A guia de aprendizagem é o documento completo** (modelo da escola), não só a tabela extraída do PDF: a tabela é a parte "Cronograma". O layout da guia não muda.

### Guias (área principal)

- **Dados por série, matéria e bimestre**: cada leitura do PDF pertence a uma série, uma matéria e um bimestre; o PDF gera uma cópia da guia para cada **turma**, e cada cópia guarda a sua ordem de aulas, o seu horário e o seu relatório.
- **Ver por matéria, série ou bimestre** (botões fixos no topo, guardados neste navegador). Abaixo deles, dropdowns em cascata que **começam vazios**: nada aparece até o primeiro ser escolhido, e os outros só liberam depois dele. Cada dropdown lista só o que existe dentro dos anteriores; "Todas" tira o filtro.
  - **Matéria**: Matéria › Série › Turma. **Série**: Série › Matéria › Turma. **Bimestre**: Bimestre › Matéria › Série › Turma.
  - Matéria e Série: cada escolha filtra os cartões de guia mostrados (agrupados por série ou por matéria, cada cartão com os 4 bimestres). Quando a escolha deixa uma só guia (turma escolhida ou série sem turmas), abre a guia, com os quatro bimestres dela. "Abrir guia" num cartão também abre, com "Voltar às guias".
  - Bimestre: cartões das guias do bimestre que combinam com os filtros (na impressão, cada uma começa numa página nova).
  - Guia sem PDF no bimestre: o cartão oferece "Enviar PDF"; a tela nunca esconde os dropdowns.
- **Bimestres**: os quatro sempre aparecem (cartões na visão por guia, dropdown na visão por bimestre). Cada um mostra as datas do bimestre, "faltam datas" ou "falta PDF" (desabilitado no dropdown quando não há PDF na guia escolhida ou, na visão bimestre, em nenhuma guia filtrada).
- **Série e bimestre do PDF**: o que o cabeçalho de cada página diz vale. Se o PDF não diz, o professor escolhe na conferência (não conclui sem escolher). Em qualquer caso a conferência tem seletores de série e de bimestre, e trocar move a leitura de lugar.
- **Dois PDFs na mesma série, matéria e bimestre** (envio ou troca): se série, disciplina e aulas são idênticas, nada acontece. Se diferem, uma janela avisa em que diferem e oferece manter os dois, substituir o antigo ou cancelar (com várias leituras em conflito, uma janela por vez).
- **Imprimir e exportar em Markdown** valem para o que está na tela (uma série e matéria num bimestre, ou todas as do bimestre); o JSON leva tudo.
- **Um PDF, uma tabela**: dois PDFs do mesmo bimestre aparecem em tabelas separadas, cada uma com o seu cronograma sobre as datas do bimestre e a sua própria ordem de aulas.
- Tabela com a coluna **Cronograma** (início e fim de cada semana, centralizados na vertical) seguida das colunas do guia: Aula, Conteúdo, Objetivos de aprendizagem, Habilidades, Aprendizagem Essencial.
- **Descrição de habilidades e AEs:** por padrão a célula mostra a sigla. Quatro caixas de seleção deixam o professor mostrar o texto em cada célula e/ou numa legenda abaixo da tabela, separadamente para habilidades e para AEs (padrão: AE com texto na célula, o resto desligado). O texto das habilidades vem da BNCC (dados fixos em `src/lib/skills/bncc.ts`); o das AEs vem do próprio PDF. A quantidade de aulas vem do PDF e não muda.
- Cada semana tem **tantas linhas quantas aulas o professor dá nela** (soma das aulas dos dias). As aulas do PDF entram nas linhas em sequência; as linhas que sobram ficam vazias, no fim do bimestre.
- O professor **arrasta as linhas** (também para linhas vazias). As semanas e a quantidade de linhas de cada semana não mudam; só o conteúdo se move.
- **Várias linhas de uma vez**: cada linha com aula tem uma caixa de seleção. Arrastar uma linha selecionada leva todas as selecionadas, que mantêm a ordem entre si e se encaixam juntas; arrastar uma linha não selecionada move só ela.
- **Aula dada**: duas colunas à direita da tabela, "AD" (caixa de marcar; ao passar o mouse mostra "Aula dada") e "AD data" (o dia em que o professor marcou). Desmarcar apaga a data. A marca acompanha a aula ao arrastar, fica salva no navegador e vai no JSON exportado (`taught` em cada documento, id da aula → AAAA-MM-DD) e no Markdown. As duas colunas podem ser ocultadas em "Colunas e saída", como as outras.
- **Barra lateral recolhível**: em telas largas, uma faixa do topo ao pé da tela, na borda da barra, recolhe (««) e reexibe (»») a barra com animação; ela cresce um pouco ao passar o mouse. A escolha fica salva neste navegador e não vai no JSON.
- **Prévia do movimento**: enquanto arrasta, a tabela já mostra o resultado. As aulas entre a origem e o destino se deslocam, e o bloco movido aparece apagado, com borda tracejada, no lugar onde cairá. Nada muda de verdade até soltar; Esc cancela.
- **Restaurar posição original**: botão na mesma linha das abas "Cronograma" e "Guia de aprendizagem", no lado direito, nas duas visões. Devolve as linhas da guia aberta à ordem do PDF (pede confirmação; linhas escritas ou clonadas vão para o fim; linhas removidas continuam removidas). Fica desativado enquanto a ordem já é a original.
- **Clonar**: cada linha com aula tem um botão que copia a linha logo abaixo e empurra as de baixo uma posição (consome uma linha vazia do fim; se não houver, a última semana ganha uma linha). A cópia é uma linha livre, fora da contagem do PDF.
- **Todas as células são editáveis** (clique ou Enter). Digitar numa linha vazia cria uma linha livre, que não conta como aula do PDF.
- **Qualquer linha pode ser removida** (só a linha, nunca a semana). Se a linha tem conteúdo, o app avisa e pede confirmação. Toda semana mantém ao menos uma linha: na única linha de uma semana, remover apaga o conteúdo e a linha fica vazia (linha vazia sozinha na semana não tem botão). "Restaurar linhas removidas" devolve as linhas vazias e as aulas do PDF removidas (as aulas voltam no fim da sequência; linhas escritas pelo professor e removidas não voltam).

### Guia de aprendizagem

- Visão "Guia de aprendizagem" por série, matéria, turma e bimestre (é a que abre por padrão; "Cronograma" mostra só a tabela), no modelo do DOCX da escola (`files/ex-guia.docx`): faixa no topo de cada página, logo da escola, identificação, justificativa, objetivos, datas e eventos, cronograma, competências socioemocionais, temas transversais, estratégias didáticas, princípios e premissas, critérios de avaliação e referências.
- **Turmas**: cada turma tem a sua guia, independente das outras: aulas por dia, ordem das aulas, linhas livres e relatório. O PDF enviado gera uma cópia para cada turma cadastrada; turma cadastrada depois começa sem guia e recebe uma cópia de outra turma. Impressão: sai a guia que está na tela.
- **Ver por matéria ou série**: dropdowns de matéria, série e turma; mostra os 4 bimestres da guia escolhida (pronta, editada ou falta o PDF) e abre o bimestre clicado. **Ver por bimestre**: as guias do bimestre (filtráveis por matéria, série e turma), agrupadas por matéria, série e turma, com "Ver e imprimir todas".
- **Copiar guia**: "Copiar guia para outra turma…" leva aulas, ordem, linhas livres e relatório de uma turma para outras turmas da série, nos bimestres marcados. Muda só a identificação (série e turma passam a ser as do destino). Se o destino já tinha guia, avisa que será substituída. Depois cada guia se edita à parte.
- **Imagens**: dois campos de envio, a faixa do topo (repete em todas as páginas impressas) e a logo da escola. Valem para todas as séries e bimestres. Já vêm preenchidos com `public/img/header.*` (faixa) e `public/img/logo.*` (logo), se esses arquivos existirem. O professor pode **Trocar** por outra imagem ou **Remover** (o campo fica vazio, com a opção "Usar a imagem padrão"). Só as imagens enviadas por ele entram no JSON exportado; a padrão não.
- **Todo texto é editável** (clique ou Enter). Professor, disciplina, série e bimestre/ano já vêm preenchidos do app; as listas vêm com o texto do modelo. Listas: um item por linha, dois espaços criam subitem; links viram clicáveis.
- **Datas e eventos**: preenchidos à mão (linhas com texto e data livre), sem usar os feriados da sidebar.
- Linhas como "Feriado" e "Prova Paulista" ficam como linhas normais do cronograma (decisão do dono do projeto).
- Primeira versão: tela e impressão; exportar o relatório como DOCX fica para depois.

### Saída

- **Impressão em A4**, respeitando margens, usando só as colunas escolhidas, na ordem escolhida.
- **Exportação** dos dados para o professor não perder o trabalho (formato em `docs/ARCHITECTURE.md`).

## Fora de escopo agora

- Usar os feriados no cálculo das semanas.
- Vários anos no mesmo projeto. Várias séries, matérias e turmas são aceitas: cada turma tem o seu horário, a sua ordem de aulas e o seu relatório, mas todas dividem professor, datas dos bimestres, feriados e colunas.
- Contas de usuário, sincronização na nuvem, compartilhamento.
- Edição do texto das aulas além de correções simples após a leitura do PDF.

## Fluxo principal

1. Abre o app. Se já há dados salvos, a página abre no ponto em que parou.
2. Escolhe a matéria e envia o PDF (quantos precisar). O app lê e mostra uma **conferência** das aulas encontradas, com correção de campos.
3. Informa o nome e as datas dos bimestres (sidebar) e, em Minhas matérias, o que leciona (matéria, série, turmas e aulas por dia).
4. O app mostra a tabela com o cronograma sugerido.
5. Arrasta linhas, escolhe colunas, imprime e exporta.

## Regras de negócio

- **Semana**: de segunda a sexta. A primeira e a última semana do bimestre são cortadas pelas datas informadas (ex.: bimestre que começa numa quarta tem a primeira semana de quarta a sexta).
- **Semana com aula**: só entram no cronograma as semanas que têm pelo menos um dia de aula marcado dentro do período.
- **Linhas da semana**: uma por aula que o professor dá nos dias da semana (ex.: 2 na segunda e 1 na quarta = 3 linhas). Linhas vazias removidas pelo professor saem da conta daquela semana.
- **Preenchimento**: aula 1 na primeira linha, aula 2 na seguinte, e assim por diante. Se há mais aulas (ou linhas livres) do que linhas, as últimas semanas ganham **uma linha extra cada**, uma por semana, da última para trás; se ainda faltar, recomeça pela última.
- **Reordenar** move o conteúdo de uma linha para outra posição (as demais se acomodam), e o número de linhas de cada semana permanece.
- Um bimestre só é calculado quando início e fim estão preenchidos e o fim é posterior ao início.

## Hipóteses que precisam de confirmação

| # | Hipótese | Como está tratada |
| --- | --- | --- |
| 1 | ~~Cada dia marcado equivale a uma aula~~ **Substituída:** o professor informa as aulas de cada dia | A soma das aulas dos dias da semana é o número de linhas da semana |
| 2 | ~~Margens verticais~~ **Confirmado:** são as margens esquerda e direita | O `@page` define 15 mm nas laterais (prioridade) e 12 mm em cima e embaixo; a tabela nunca passa da área útil |
| 3 | ~~Orientação da impressão~~ **Confirmado:** paisagem por ora | Paisagem fixa na primeira versão; opção de retrato fica para depois |
| 4 | O PDF de cada bimestre segue o mesmo layout do anexado | A leitura calibra as colunas pelo cabeçalho de cada página |
| 5 | Formato de exportação | Proposta: JSON como principal (reimportável) e Markdown como opção de leitura |

## Critérios de aceite da primeira versão

- Enviar o PDF anexado resulta em 12 aulas com os cinco campos corretos, incluindo a aula 10 com duas AEs e a aula 4 com dois conteúdos.
- Com 3 aulas por semana em 5 semanas e 12 aulas no PDF, a tabela tem 15 linhas: as 12 aulas em sequência e 3 vazias no fim.
- Arrastar uma linha não altera nenhuma data nem a quantidade de linhas por semana.
- A impressão em A4 paisagem respeita as margens esquerda e direita em todas as páginas (nada da tabela invade a margem), não corta linhas no meio e repete o cabeçalho da tabela em cada página.
- Recarregar a página mantém todos os dados; exportar e importar devolve o mesmo estado.
