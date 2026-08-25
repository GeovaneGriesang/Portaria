import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTextosPortarias } from "@/lib/portariasTexto";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "portarias");

describe("getTextosPortarias", () => {
  it("lê os arquivos <ano>.texto.json e devolve um mapa id -> texto", () => {
    const textos = getTextosPortarias(FIXTURES_DIR);
    expect(textos.get("2026-1001")).toContain("colegiado do TADS de Venâncio Aires");
    expect(textos.get("2026-1050")).toContain("sindicância");
    expect(textos.has("2026-1102")).toBe(false);
  });

  it("devolve mapa vazio quando o diretorio nao existe", () => {
    expect(getTextosPortarias(path.join(__dirname, "fixtures", "inexistente")).size).toBe(0);
  });
});
