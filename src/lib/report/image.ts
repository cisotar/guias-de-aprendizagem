/** Tamanho que cabe em `maxWidth` x `maxHeight` mantendo a proporção; nunca aumenta a imagem. */
export function fitSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const IMAGE_LIMITS = {
  banner: { maxWidth: 2000, maxHeight: 400 },
  schoolLogo: { maxWidth: 400, maxHeight: 400 },
} as const;

/**
 * Lê uma imagem do computador e devolve um data URL já reduzido (o localStorage tem pouco espaço).
 * PNG mantém transparência; as demais viram JPEG.
 */
export async function imageFileToDataUrl(file: File, kind: keyof typeof IMAGE_LIMITS): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("O arquivo não é uma imagem.");
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitSize(bitmap.width, bitmap.height, IMAGE_LIMITS[kind].maxWidth, IMAGE_LIMITS[kind].maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("O navegador não conseguiu processar a imagem.");
    const png = file.type === "image/png";
    if (!png) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.88);
  } finally {
    bitmap.close();
  }
}
