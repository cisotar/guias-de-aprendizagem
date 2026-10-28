/**
 * Nova sequência depois de mover um bloco de linhas. A linha pegada (`activeId`) cai em `overPosition` e as outras
 * do bloco seguem coladas a ela, na ordem em que estavam; as demais linhas fecham o espaço. Usada ao soltar (store)
 * e na prévia durante o arrasto, para as duas mostrarem sempre o mesmo resultado. `null` se `activeId` não está na sequência.
 */
export function moveBlock(seq: string[], activeId: string, overPosition: number, ids: string[], newBlank: () => string): string[] | null {
  const wanted = new Set(ids.includes(activeId) ? ids : [activeId]);
  const block = seq.filter((x) => wanted.has(x));
  const at = block.indexOf(activeId);
  if (at < 0) return null;
  const rest = seq.filter((x) => !wanted.has(x));
  // Solto sobre uma linha que tem conteúdo: o bloco nunca deixa buraco. Solto sobre linhas vazias
  // (além do fim da sequência): completa com linhas em branco até a posição de destino.
  let start = Math.max(0, overPosition - at);
  if (overPosition < seq.length) start = Math.min(start, rest.length);
  while (rest.length < start) rest.push(newBlank());
  rest.splice(start, 0, ...block);
  return rest;
}
