export type ListItem = { text: string; level: 0 | 1 | 2 };

/** Largura de um recuo: dois espaços ou uma tabulação. */
const INDENT = /^(?: {2}|\t)/;

/**
 * Lê o texto de uma lista: uma linha por item; cada recuo (2 espaços ou Tab) desce um nível, até o 3º.
 * Um "- ", "* " ou "• " no começo da linha é aceito e ignorado. Linhas vazias saem.
 */
export function parseList(text: string): ListItem[] {
  const items: ListItem[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let rest = raw;
    let level = 0;
    while (level < 2 && INDENT.test(rest)) {
      rest = rest.replace(INDENT, "");
      level++;
    }
    const clean = rest.trim().replace(/^[-*•●○■]\s+/, "");
    if (clean) items.push({ text: clean, level: level as 0 | 1 | 2 });
  }
  return items;
}

export const BULLETS = ["●", "○", "■"] as const;

export type TextPart = { text: string; href?: string };

/** Separa um texto em pedaços, marcando os endereços http(s) para virarem links. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], href: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
