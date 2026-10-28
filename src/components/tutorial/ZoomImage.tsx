"use client";

import { useState } from "react";
import { ZoomControls } from "@/components/ZoomControls";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Props = { src: string; alt: string; caption: string };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

/** Miniatura de captura de tela; clicar (ou o link) abre a imagem inteira em um modal centralizado. */
export function ZoomImage({ src, alt, caption }: Props) {
  const [zoom, setZoom] = useState(1);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const change = (next: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  return (
    <Dialog onOpenChange={(open) => open && setZoom(1)}>
      <figure className="flex flex-wrap items-start gap-4">
        <DialogTrigger
          aria-label={`Ampliar: ${caption}`}
          className="shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" className="max-h-[75vh] w-auto max-w-full rounded-lg border border-border bg-card shadow-sm" />
        </DialogTrigger>
        <figcaption className="space-y-2 text-[13px] text-muted-foreground">
          <p>{caption}</p>
          <DialogTrigger className="min-h-10 cursor-pointer font-bold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Ampliar imagem
          </DialogTrigger>
        </figcaption>
      </figure>
      <DialogContent
        className="max-h-[90vh] w-fit min-w-72 max-w-[calc(100%-2rem)] grid-rows-[minmax(0,1fr)] sm:max-w-[min(56rem,calc(100%-2rem))]"
        showCloseButton
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") change(zoom + ZOOM_STEP);
          if (e.key === "-") change(zoom - ZOOM_STEP);
        }}
      >
        <DialogTitle className="sr-only">{caption}</DialogTitle>
        <DialogDescription className="sr-only">{alt}</DialogDescription>
        <div className="min-h-0 overflow-auto rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)} style={naturalWidth ? { width: naturalWidth * zoom } : undefined} className="mx-auto h-auto max-w-none rounded-lg" />
        </div>
        <ZoomControls
          value={zoom}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          onDecrease={() => change(zoom - ZOOM_STEP)}
          onIncrease={() => change(zoom + ZOOM_STEP)}
          onReset={() => change(1)}
          className="absolute right-4 bottom-4"
        />
      </DialogContent>
    </Dialog>
  );
}
