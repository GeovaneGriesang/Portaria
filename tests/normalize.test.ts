import { describe, expect, it } from "vitest";
import { normalizar } from "@/lib/normalize";

describe("normalizar", () => {
  it("remove acentos e caixa", () => {
    expect(normalizar("João Sílvio")).toBe("joao silvio");
  });

  it("mantém dígitos intactos (útil para SIAPE)", () => {
    expect(normalizar("1234567")).toBe("1234567");
  });

  it("remove espaços nas pontas", () => {
    expect(normalizar("  Ana  ")).toBe("ana");
  });
});
