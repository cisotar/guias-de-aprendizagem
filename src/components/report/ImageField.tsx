"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { imageFileToDataUrl } from "@/lib/report/image";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project";
import type { ReportImages } from "@/types";

/**
 * Campo de imagem do relatório. Sem imagem, mostra o botão de envio (só na tela); com imagem, mostra
 * a imagem e os botões de trocar e remover (só na tela). Na impressão sai só a imagem, se houver.
 */
export function ImageField({
  kind, fallback, label, hint, className, imageClassName,
}: {
  kind: keyof ReportImages;
  /** Imagem padrão (public/img) usada enquanto o professor não enviar outra. */
  fallback?: string | null;
  label: string;
  hint: string;
  className?: string;
  imageClassName?: string;
}) {
  const own = useProject((s) => s.reportImages[kind]);
  const image = own === "none" ? null : (own ?? fallback ?? null);
  const setImage = useProject((s) => s.setReportImage);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setImage(kind, await imageFileToDataUrl(file, kind));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui ler esta imagem.");
    }
  }

  return (
    <div className={cn("group relative", !image && "print:hidden", className)}>
      <input
        ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Escolher arquivo: ${label}`}
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }}
      />
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local (data URL ou public/img); next/image não se aplica */}
          <img src={image} alt={label} className={cn("block", imageClassName)} />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 print:hidden">
            <Button type="button" variant="outline" size="sm" className="h-8 bg-card" onClick={() => input.current?.click()}>
              <ImagePlus aria-hidden /> Trocar
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-8 bg-card" aria-label={`Remover ${label}`} onClick={() => setImage(kind, "none")}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-full min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-input bg-card p-2 text-center text-[13px] leading-[18px] text-muted-foreground hover:bg-muted/60"
        >
          <ImagePlus aria-hidden className="size-5" />
          <span className="font-medium text-foreground">Enviar {label}</span>
          <span>{hint}</span>
        </button>
      )}
      {!image && fallback && (
        <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-[13px] print:hidden" onClick={() => setImage(kind, null)}>
          Usar a imagem padrão
        </Button>
      )}
    </div>
  );
}
