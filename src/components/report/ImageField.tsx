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
  kind, label, hint, className, imageClassName,
}: {
  kind: keyof ReportImages;
  label: string;
  hint: string;
  className?: string;
  imageClassName?: string;
}) {
  const image = useProject((s) => s.reportImages[kind]);
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
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local; next/image não se aplica */}
          <img src={image} alt={label} className={cn("block", imageClassName)} />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 print:hidden">
            <Button type="button" variant="outline" size="sm" className="h-8 bg-card" onClick={() => input.current?.click()}>
              <ImagePlus aria-hidden /> Trocar
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-8 bg-card" aria-label={`Remover ${label}`} onClick={() => setImage(kind, null)}>
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
    </div>
  );
}
