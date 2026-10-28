import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.join(process.cwd(), "public", "img");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".bmp"]);

/**
 * Caminho público de public/img/<nome>.* (qualquer extensão de imagem), ou null se não existir.
 * Roda no servidor: no `next build` (site estático) vira parte da página; no `npm run dev` é relido a cada pedido.
 * O `?v=` (data de modificação) evita que o navegador mostre a versão antiga ao trocar o arquivo.
 */
export function findPublicImage(stem: string, basePath: string): string | null {
  try {
    const name = readdirSync(IMAGE_DIR).find((f) => path.parse(f).name.toLowerCase() === stem && IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
    if (!name) return null;
    const version = Math.round(statSync(path.join(IMAGE_DIR, name)).mtimeMs);
    return `${basePath}/img/${encodeURIComponent(name)}?v=${version}`;
  } catch {
    return null;
  }
}

export const findOpeningImage = (basePath: string) => findPublicImage("openning", basePath);
