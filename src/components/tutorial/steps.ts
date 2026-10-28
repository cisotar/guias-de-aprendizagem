/** Passos do tutorial. `image` é o nome do arquivo em public/tutorial/, gerado por scripts/tutorial-screenshots.cjs. */
export type TutorialStep = {
  id: string;
  title: string;
  /** Parágrafos curtos; `**negrito**` é marcado por quem renderiza. */
  body: string[];
  /** Lista numerada de ações, quando o passo tem uma sequência. */
  actions?: string[];
  /** `compact`: capturas altas e estreitas aparecem como miniatura e abrem ampliadas em um modal. */
  images: { file: string; alt: string; caption: string; compact?: boolean }[];
  tip?: string;
};

export const STEPS: TutorialStep[] = [
  {
    id: "pdf",
    title: "Pegue o Escopo-Sequência no guia oficial",
    body: [
      "O app trabalha a partir de um PDF. Ele vem do **Guia do Currículo Priorizado** da sua disciplina (o documento oficial da rede). Dentro dele, procure a seção **Escopo - Sequência**: é a tabela com as aulas, os conteúdos, os objetivos e as habilidades de cada bimestre.",
      "Envie ao app **somente as páginas do Escopo - Sequência**, não o guia inteiro: páginas que não são a tabela fazem o envio ser recusado.",
    ],
    images: [{ file: "01-escopo-sequencia.png", alt: "Página do guia com a tabela Escopo - Sequência, com colunas de aula, conteúdo, objetivos e habilidades.", caption: "A tabela que você procura: Escopo - Sequência." }],
  },
  {
    id: "imprimir",
    title: "Salve só essas páginas como PDF",
    body: ["Com o guia aberto no navegador, anote em que páginas está o Escopo - Sequência e gere o seu PDF assim:"],
    actions: [
      "Aperte **Ctrl + P** (no Mac, **Cmd + P**) para abrir a janela de impressão.",
      "Em **Destino**, escolha **Salvar como PDF**.",
      "Em **Páginas**, escolha **Personalizado** e digite só as páginas do Escopo - Sequência (por exemplo, 7-9).",
      "Clique em **Salvar** e, na janela que abrir, escolha a pasta **Documentos** do seu computador.",
    ],
    images: [{ file: "02-janela-imprimir.png", alt: "Janela de impressão do navegador com Destino em Salvar como PDF e Páginas em Personalizado.", caption: "Ilustração da janela de impressão: destino, páginas e botão Salvar." }],
    tip: "Guardar na pasta Documentos facilita achar o arquivo na hora de enviar ao app. Dê um nome claro, como “escopo-geografia-2bim.pdf”.",
  },
  {
    id: "materias",
    title: "Cadastre a matéria, a etapa e as séries ou anos",
    body: ["Na aba **Minhas matérias**, escreva o nome da matéria, escolha a etapa (**Ensino Médio** usa séries; **Ensino Fundamental** usa anos, do 6º ao 9º), marque as séries ou anos em que você leciona e clique em **Adicionar matéria**. Cada série ganha uma página própria."],
    images: [{ file: "03-materias.png", alt: "Tela Minhas matérias com a matéria Geografia e cartões para as três séries.", caption: "Cada série tem o seu cartão." }],
  },
  {
    id: "turmas",
    title: "Informe suas turmas e as aulas por semana",
    body: ["Abra uma série. Na parte **Turmas e aulas por semana**, marque as turmas (pills A a E; o **+** acrescenta F, G…) e diga quantas aulas você dá em cada dia, de segunda a sexta. É com isso que o app calcula as semanas."],
    images: [{ file: "04-turmas.png", alt: "Página da série com turmas A e B e campos de aulas de segunda a sexta.", caption: "Aulas por dia, turma a turma." }],
  },
  {
    id: "enviar",
    title: "Envie o PDF e confira a leitura",
    body: [
      "Na parte **PDF do Escopo-Sequência**, clique em **Enviar PDF** (ou arraste o arquivo da pasta Documentos). O app lê a tabela e mostra o que entendeu.",
      "Confira se as aulas estão certas e confirme. O PDF vale para todas as turmas da série.",
    ],
    images: [
      { file: "05-enviar-pdf.png", alt: "Área de envio do PDF na página da série.", caption: "Enviar o PDF." },
      { file: "06-conferir-leitura.png", alt: "Janela de conferência com a lista de aulas lidas do PDF.", caption: "Conferir a leitura antes de salvar." },
    ],
  },
  {
    id: "calendario",
    title: "Preencha seus dados e os bimestres",
    body: ["Na barra lateral, escreva seu nome e o da escola e informe início e fim de cada bimestre. Os feriados podem ser buscados ali também. Esses dados valem para todas as guias."],
    images: [{ file: "07-barra-lateral.png", alt: "Barra lateral com os blocos Professor, Bimestres e Feriados.", caption: "Professor, bimestres e feriados.", compact: true }],
  },
  {
    id: "cronograma",
    title: "Veja e ajuste o cronograma",
    body: [
      "Em **Cronograma**, escolha matéria, série e turma. O app distribui as aulas pelas semanas do bimestre.",
      "Para mudar a ordem, **arraste a linha** pela alça. Pelo teclado, foque a alça e use as setas. **Restaurar posição original** desfaz tudo.",
    ],
    images: [{ file: "08-cronograma.png", alt: "Tabela do cronograma com as aulas distribuídas por semana.", caption: "O cronograma por semanas." }],
  },
  {
    id: "colunas",
    title: "Escolha as colunas e imprima",
    body: ["Em **Colunas e saída**, marque o que aparece na tabela e mude a ordem com as setas. Depois clique em **Imprimir** e use papel A4. A visualização de impressão mostra como vai ficar."],
    images: [{ file: "09-colunas.png", alt: "Bloco Colunas e saída com caixas de seleção e botões de imprimir e exportar.", caption: "Colunas e botões de saída.", compact: true }],
  },
];

export const SAVE_STEPS = [
  { title: "Exporte", text: "Na barra lateral, em **Colunas e saída**, clique em **Exportar dados**. O navegador baixa um arquivo com a data de hoje, como **2026.10.28-export-guias.json**." },
  { title: "Envie ao Google Drive", text: "Abra o **drive.google.com** com a sua conta **pessoal**, clique em **Novo › Upload de arquivo** e escolha o arquivo exportado (**AAAA.MM.DD-export-guias.json**)." },
  { title: "Restaure quando precisar", text: "Em outro computador, navegador ou depois de limpar o histórico, baixe o arquivo do Drive e use **Importar dados**." },
];
