import type { ReactNode } from "react";

/**
 * Margens A4 paisagem desenhadas no conteúdo, para valerem mesmo quando a janela de impressão do navegador está em
 * "Margens: Nenhuma" (que ignora o `@page`). Na tela é transparente (`display: contents`). Na impressão é uma tabela cujo
 * cabeçalho vazio (12 mm) se repete em cada folha e cuja célula dá 15 mm nas laterais. Embaixo, os 12 mm são margem do
 * `@page` (onde cai o "x de y"). Quem usa deve zerar o resto da margem do `@page` (ver `reportPageStyle` em App).
 */
export function PrintFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <table role="presentation" className={`contents w-full table-fixed border-collapse print:table ${className ?? ""}`}>
      <thead role="presentation" className="hidden print:table-header-group">
        <tr><td className="h-[12mm] p-0" /></tr>
      </thead>
      <tbody role="presentation" className="contents print:table-row-group">
        <tr role="presentation" className="contents print:table-row">
          <td role="presentation" className="contents p-0 align-top print:table-cell print:px-[15mm]">{children}</td>
        </tr>
      </tbody>
    </table>
  );
}
