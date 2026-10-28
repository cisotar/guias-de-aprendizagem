import { describe, expect, it } from "vitest";
import { moveBlock } from "./move";

const seq = ["a", "b", "c", "d", "e", "f", "g", "h"];
let n = 0;
const blank = () => `blank-${n++}`;

describe("moveBlock", () => {
  it("uma linha: a de cima desce e as do meio sobem", () => {
    expect(moveBlock(seq, "a", 5, ["a"], blank)).toEqual(["b", "c", "d", "e", "f", "a", "g", "h"]);
  });
  it("uma linha para cima", () => {
    expect(moveBlock(seq, "f", 1, ["f"], blank)).toEqual(["a", "f", "b", "c", "d", "e", "g", "h"]);
  });
  it("bloco contíguo: a primeira linha ocupa o destino e a outra fica colada", () => {
    expect(moveBlock(seq, "c", 5, ["c", "d"], blank)).toEqual(["a", "b", "e", "f", "g", "c", "d", "h"]);
  });
  it("bloco para cima", () => {
    expect(moveBlock(seq, "f", 1, ["f", "g"], blank)).toEqual(["a", "f", "g", "b", "c", "d", "e", "h"]);
  });
  it("linha pegada fora da seleção move só ela", () => {
    expect(moveBlock(seq, "a", 2, ["c", "d"], blank)).toEqual(["b", "c", "a", "d", "e", "f", "g", "h"]);
  });
  it("destino além do fim completa com linhas em branco", () => {
    const out = moveBlock(["a", "b"], "a", 4, ["a"], blank);
    expect(out).toHaveLength(5);
    expect(out?.[4]).toBe("a");
    expect(out?.[0]).toBe("b");
  });
  it("id que não está na sequência não move nada", () => {
    expect(moveBlock(seq, "zzz", 2, ["zzz"], blank)).toBeNull();
  });
});
