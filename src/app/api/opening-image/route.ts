import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const IMAGE_DIR = path.join(process.cwd(), "img");

const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

/** Serve o arquivo "openning.*" de img/, seja qual for a extensão, lido do disco a cada pedido; sem arquivo, 404. */
export async function GET() {
  try {
    const name = (await readdir(IMAGE_DIR)).find((f) => path.parse(f).name.toLowerCase() === "openning" && path.extname(f).toLowerCase() in IMAGE_TYPES);
    if (!name) return new Response(null, { status: 404 });
    const file = await readFile(path.join(IMAGE_DIR, name));
    return new Response(new Uint8Array(file), { headers: { "Content-Type": IMAGE_TYPES[path.extname(name).toLowerCase()], "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
