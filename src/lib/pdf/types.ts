/** Texto e retângulos de uma página, em coordenadas do PDF (origem embaixo à esquerda). */
export type TextItem = { str: string; x: number; y: number; width: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number; fill: string };
export type PageData = { width: number; height: number; items: TextItem[]; rects: Rect[] };
