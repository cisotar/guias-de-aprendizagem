/** Turmas oferecidas de início como pills (A a E); o "+" acrescenta as seguintes. */
export const DEFAULT_CLASS_LETTERS = ["A", "B", "C", "D", "E"];

const isLetter = (name: string) => /^[A-Z]$/.test(name);

/** Letras primeiro, em ordem alfabética; nomes que não são uma letra (ex.: "1º A") depois, na ordem em que vieram. */
export function sortClasses(classes: string[]): string[] {
  return [...classes.filter(isLetter).sort(), ...classes.filter((c) => !isLetter(c))];
}

/** As pills mostradas: A a E mais as turmas já cadastradas fora desse intervalo (ex.: F, ou um nome livre). */
export function classPills(classes: string[]): string[] {
  return sortClasses([...new Set([...DEFAULT_CLASS_LETTERS, ...classes])]);
}

/** Letra que o "+" acrescenta: a seguinte à maior letra mostrada. `null` depois do Z. */
export function nextClassLetter(classes: string[]): string | null {
  const last = classPills(classes).filter(isLetter).pop() ?? "A";
  return last === "Z" ? null : String.fromCharCode(last.charCodeAt(0) + 1);
}

/** Liga ou desliga uma turma, mantendo a ordem das pills. */
export function toggleClass(classes: string[], name: string): string[] {
  return sortClasses(classes.includes(name) ? classes.filter((c) => c !== name) : [...classes, name]);
}
