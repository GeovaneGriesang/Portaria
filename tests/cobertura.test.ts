import { describe, expect, it } from "vitest";
import { periodoCobertura } from "@/lib/cobertura";
import type { Portaria } from "@/lib/types";

function portaria(ano: number, mes: number): Portaria {
  return { ano, mes } as Portaria;
}

describe("periodoCobertura", () => {
  it("retorna null para lista vazia", () => {
    expect(periodoCobertura([])).toBeNull();
  });

  it("retorna o mesmo mês como início e fim quando há uma única portaria", () => {
    expect(periodoCobertura([portaria(2021, 3)])).toEqual({ inicio: "março/2021", fim: "março/2021" });
  });

  it("encontra o menor e o maior mês/ano entre várias portarias, fora de ordem", () => {
    const lista = [portaria(2023, 10), portaria(2021, 1), portaria(2026, 6), portaria(2022, 12)];
    expect(periodoCobertura(lista)).toEqual({ inicio: "janeiro/2021", fim: "junho/2026" });
  });
});
