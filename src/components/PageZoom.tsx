"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { ZoomControls } from "@/components/ZoomControls";

const KEY = "page-zoom";
const MIN = 0.7;
const MAX = 2;
const STEP = 0.1;
const schema = z.number().min(MIN).max(MAX);

/** Zoom da página inteira: escala o tamanho-base (rem) do documento. Lembrado neste navegador. */
export function PageZoom() {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    try {
      const saved = schema.safeParse(Number(localStorage.getItem(KEY)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o valor salvo depois da hidratação
      if (saved.success) setZoom(saved.data);
    } catch { /* localStorage indisponível */ }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--page-zoom", String(zoom));
    try { localStorage.setItem(KEY, String(zoom)); } catch { /* ignora */ }
  }, [zoom]);

  const change = (next: number) => setZoom(Math.min(MAX, Math.max(MIN, Math.round(next * 100) / 100)));

  return (
    <ZoomControls
      value={zoom}
      min={MIN}
      max={MAX}
      onDecrease={() => change(zoom - STEP)}
      onIncrease={() => change(zoom + STEP)}
      onReset={() => change(1)}
      className="fixed right-4 bottom-4 z-40"
    />
  );
}
