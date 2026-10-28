import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CloudUpload, Download, HardDriveDownload, ShieldAlert, Upload } from "lucide-react";
import { Rich } from "@/components/tutorial/Rich";
import { SAVE_STEPS, STEPS } from "@/components/tutorial/steps";

export const metadata: Metadata = {
  title: "Como usar · Guias de Aprendizagem",
  description: "Passo a passo para montar o cronograma e guardar seus dados com segurança.",
};

const SAVE_ICONS = [Download, CloudUpload, Upload];

export default function TutorialPage() {
  const basePath = process.env.PAGES_BASE_PATH ?? "";
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-10">
      <nav aria-label="Neste tutorial" className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
        <Link href="/" className="mb-4 inline-flex min-h-10 items-center gap-1.5 font-bold text-primary underline">
          <ArrowLeft aria-hidden className="size-4" /> Voltar ao app
        </Link>
        <ol className="space-y-1 text-sm">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-md px-2 py-1.5 hover:bg-muted">{i + 1}. {s.title}</a>
            </li>
          ))}
          <li><a href="#salvar" className="block rounded-md px-2 py-1.5 font-bold text-primary hover:bg-muted">Guarde seus dados</a></li>
        </ol>
      </nav>

      <main id="conteudo" className="min-w-0 space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl leading-9 font-bold">Como usar o app</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Em poucos passos você transforma o Escopo - Sequência do guia em um cronograma por semanas, ajusta a ordem das aulas e imprime em A4.
          </p>
        </header>

        {STEPS.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`h-${s.id}`} className="scroll-mt-8 space-y-4">
            <h2 id={`h-${s.id}`} className="flex items-center gap-3 text-2xl leading-8 font-bold">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-base text-primary-foreground">{i + 1}</span>
              {s.title}
            </h2>
            {s.body.map((p) => <p key={p} className="max-w-3xl text-base leading-7"><Rich text={p} /></p>)}
            {s.actions && (
              <ol className="max-w-3xl list-decimal space-y-2 pl-6 text-base leading-7 marker:font-bold marker:text-primary">
                {s.actions.map((a) => <li key={a}><Rich text={a} /></li>)}
              </ol>
            )}
            {s.tip && <p className="max-w-3xl rounded-lg border-l-4 border-ring bg-accent p-3 text-sm leading-6"><strong>Dica:</strong> {s.tip}</p>}
            <div className="space-y-4">
              {s.images.map((img) => (
                <figure key={img.file}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${basePath}/tutorial/${img.file}`} alt={img.alt} loading="lazy" className="w-full rounded-xl border border-border bg-card shadow-sm" />
                  <figcaption className="mt-2 text-[13px] text-muted-foreground">{img.caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}

        <footer className="rounded-xl bg-muted p-5">
          <p className="font-bold">Terminou? Exporte os dados e guarde no Google Drive.</p>
          <p className="mt-1 text-sm text-muted-foreground">Leva dez segundos e evita perder o trabalho. <a href="#salvar" className="underline">Ver como</a>.</p>
          <Link href="/" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary px-5 font-bold text-primary-foreground">Ir para o app</Link>
        </footer>

        <section id="salvar" aria-labelledby="h-salvar" className="scroll-mt-8 space-y-5 rounded-2xl border-2 border-primary bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden className="mt-1 size-7 shrink-0 text-primary" />
            <div>
              <h2 id="h-salvar" className="text-2xl leading-8 font-bold">Importante: exporte seus dados e guarde no seu Google Drive</h2>
              <p className="mt-2 text-base leading-7">
                O app <strong>não tem servidor nem conta</strong>. Tudo o que você faz fica salvo <strong>somente neste navegador</strong>, neste computador. Se você limpar o histórico, trocar de computador ou de navegador, <strong>perde tudo</strong>: matérias, ordem das aulas e ajustes.
              </p>
              <p className="mt-2 text-base leading-7">
                A saída é simples: exporte um arquivo JSON e guarde no <strong>Google Drive pessoal</strong>. Faça isso sempre que terminar uma sessão de trabalho.
              </p>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {SAVE_STEPS.map((s, i) => {
              const Icon = SAVE_ICONS[i];
              return (
                <li key={s.title} className="rounded-xl bg-muted p-4">
                  <Icon aria-hidden className="mb-2 size-6 text-primary" />
                  <h3 className="font-bold">{i + 1}. {s.title}</h3>
                  <p className="mt-1 text-sm leading-6"><Rich text={s.text} /></p>
                </li>
              );
            })}
          </ol>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/tutorial/10-exportar-dados.png`} alt="Barra lateral com o botão Exportar dados em destaque." loading="lazy" className="mx-auto max-h-96 rounded-lg border border-border" />
            <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">O botão Exportar dados fica no fim da barra lateral.</figcaption>
          </figure>
          <p className="flex items-start gap-2 text-sm leading-6">
            <HardDriveDownload aria-hidden className="mt-0.5 size-4 shrink-0" />
            Use o Drive <strong>pessoal</strong>, não o da escola: contas institucionais podem ser fechadas quando você muda de escola. Seus dados não saem do computador a não ser por esse arquivo.
          </p>
        </section>
      </main>
    </div>
  );
}
