import { BULLETS, parseList, splitLinks } from "@/lib/report/list";
import { cn } from "@/lib/utils";

/** Texto corrido com links clicáveis; mantém as quebras de linha digitadas. */
export function RichText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-line">
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-700 underline break-all">
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

const INDENT = ["pl-0", "pl-6", "pl-12"] as const;

/** Lista com marcadores ● ○ ■ conforme o nível (ver `parseList`). */
export function BulletList({ text }: { text: string }) {
  return (
    <ul className="space-y-0.5">
      {parseList(text).map((item, i) => (
        <li key={i} className={cn("flex gap-2", INDENT[item.level])}>
          <span aria-hidden className="shrink-0 text-[0.7em] leading-[1.9]">{BULLETS[item.level]}</span>
          <RichText text={item.text} />
        </li>
      ))}
    </ul>
  );
}
