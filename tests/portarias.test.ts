import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPortarias } from "@/lib/portarias";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "portarias");

describe("getPortarias", () => {
  it("mescla os arquivos de todos os anos e ordena da mais recente para a mais antiga", () => {
    const portarias = getPortarias(FIXTURES_DIR);

    expect(portarias.length).toBeGreaterThanOrEqual(11);
    expect(portarias[0]!.ano).toBe(2026);
    expect(portarias[portarias.length - 1]!.ano).toBe(2025);

    for (let i = 1; i < portarias.length; i += 1) {
      const anterior = portarias[i - 1]!;
      const atual = portarias[i]!;
      const chaveAnterior = anterior.ano * 100 + anterior.mes;
      const chaveAtual = atual.ano * 100 + atual.mes;
      expect(chaveAnterior).toBeGreaterThanOrEqual(chaveAtual);
    }
  });

  it("devolve lista vazia quando o diretorio nao existe (data/portarias real, antes da ingestao)", () => {
    expect(getPortarias(path.join(__dirname, "fixtures", "inexistente"))).toEqual([]);
  });

  it("ignora os arquivos <ano>.texto.json (texto integral, não é um array de Portaria)", () => {
    const portarias = getPortarias(FIXTURES_DIR);
    expect(portarias.every((p) => typeof p === "object" && "numero" in p)).toBe(true);
  });
});
