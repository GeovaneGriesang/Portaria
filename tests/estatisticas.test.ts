import { describe, expect, it } from "vitest";
import { calcularEstatisticas } from "@/lib/estatisticas";
import type { Portaria } from "@/lib/types";

function portaria(sobrescritas: Partial<Portaria> = {}): Portaria {
  return {
    id: "2026-0001",
    numero: "0001/2026",
    ano: 2026,
    mes: 1,
    arquivo: "portarias/2026/01/portaria-0001.pdf",
    unidade: "Reitoria",
    tipos: ["designacao"],
    servidores: [],
    dataInicio: "2026-01-01",
    ...sobrescritas,
  };
}

describe("calcularEstatisticas", () => {
  it("conta total, ativas e expiradas", () => {
    const resultado = calcularEstatisticas([
      portaria({ dataFim: undefined }),
      portaria({ dataFim: "2020-01-01" }),
      portaria({ dataFim: "2020-01-01" }),
    ]);

    expect(resultado.total).toBe(3);
    expect(resultado.ativas).toBe(1);
    expect(resultado.expiradas).toBe(2);
  });

  it("agrupa por tipo, contando uma portaria em cada tipo que ela tem", () => {
    const resultado = calcularEstatisticas([
      portaria({ tipos: ["designacao", "comissao"] }),
      portaria({ tipos: ["designacao"] }),
    ]);

    expect(resultado.porTipo.designacao).toBe(2);
    expect(resultado.porTipo.comissao).toBe(1);
    expect(resultado.porTipo.nucleo).toBeUndefined();
  });

  it("agrupa por unidade", () => {
    const resultado = calcularEstatisticas([
      portaria({ unidade: "Reitoria" }),
      portaria({ unidade: "Câmpus Pelotas" }),
      portaria({ unidade: "Reitoria" }),
    ]);

    expect(resultado.porUnidade["Reitoria"]).toBe(2);
    expect(resultado.porUnidade["Câmpus Pelotas"]).toBe(1);
  });

  it("lida com lista vazia sem erro", () => {
    expect(calcularEstatisticas([])).toEqual({ total: 0, ativas: 0, expiradas: 0, porTipo: {}, porUnidade: {} });
  });

  it("conta portaria revogada como expirada mesmo sem dataFim", () => {
    const resultado = calcularEstatisticas(
      [portaria({ numero: "0001/2026", dataFim: undefined }), portaria({ numero: "0002/2026", dataFim: undefined })],
      new Set(["0001/2026"]),
    );
    expect(resultado.ativas).toBe(1);
    expect(resultado.expiradas).toBe(1);
  });
});
