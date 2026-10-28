import { describe, expect, it } from "vitest";
import { classPills, nextClassLetter, sortClasses, toggleClass } from "./classPills";

describe("classPills", () => {
  it("mostra A a E quando não há turmas", () => {
    expect(classPills([])).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("mantém as turmas fora de A a E, letras antes dos nomes livres", () => {
    expect(classPills(["G", "1º A", "B"])).toEqual(["A", "B", "C", "D", "E", "G", "1º A"]);
  });
});

describe("nextClassLetter", () => {
  it("começa em F e segue a maior letra mostrada", () => {
    expect(nextClassLetter([])).toBe("F");
    expect(nextClassLetter(["A", "F"])).toBe("G");
    expect(nextClassLetter(["H"])).toBe("I");
  });

  it("para depois do Z", () => {
    expect(nextClassLetter(["Z"])).toBeNull();
  });
});

describe("toggleClass", () => {
  it("liga na ordem das pills e desliga", () => {
    expect(toggleClass(["C"], "A")).toEqual(["A", "C"]);
    expect(toggleClass(["A", "C"], "A")).toEqual(["C"]);
  });
});

describe("sortClasses", () => {
  it("não mexe na ordem dos nomes livres", () => {
    expect(sortClasses(["2º", "B", "1º"])).toEqual(["B", "2º", "1º"]);
  });
});
