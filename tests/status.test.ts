import { describe, expect, it } from "vitest";
import { calcularDuracao, construirNumerosRevogados, formatarDuracao, isAtiva } from "@/lib/status";
import type { Portaria } from "@/lib/types";

describe("isAtiva", () => {
  it("é ativa quando não há data de fim (vigência indeterminada)", () => {
    expect(isAtiva({ dataFim: undefined, numero: "0001/2026" })).toBe(true);
  });

  it("é ativa quando a data de fim ainda não chegou", () => {
    expect(isAtiva({ dataFim: "2030-01-01", numero: "0001/2026" }, { referencia: new Date(2026, 0, 1) })).toBe(true);
  });

  it("é ativa no próprio dia da data de fim", () => {
    expect(isAtiva({ dataFim: "2026-01-01", numero: "0001/2026" }, { referencia: new Date(2026, 0, 1) })).toBe(true);
  });

  it("está expirada quando a data de fim já passou", () => {
    expect(isAtiva({ dataFim: "2025-01-01", numero: "0001/2026" }, { referencia: new Date(2026, 0, 1) })).toBe(false);
  });

  it("está expirada quando revogada, mesmo com data de fim futura ou indeterminada", () => {
    const revogadas = new Set(["0001/2026"]);
    expect(isAtiva({ dataFim: undefined, numero: "0001/2026" }, { revogadas })).toBe(false);
    expect(isAtiva({ dataFim: "2099-01-01", numero: "0001/2026" }, { revogadas })).toBe(false);
    expect(isAtiva({ dataFim: undefined, numero: "0002/2026" }, { revogadas })).toBe(true);
  });
});

describe("construirNumerosRevogados", () => {
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

  it("reúne os números citados em `revoga` de todas as portarias", () => {
    const revogadas = construirNumerosRevogados([
      portaria({ numero: "0002/2026", revoga: ["0001/2026"] }),
      portaria({ numero: "0003/2026", revoga: ["0002/2026", "0001/2025"] }),
      portaria({ numero: "0004/2026" }),
    ]);
    expect(revogadas).toEqual(new Set(["0001/2026", "0002/2026", "0001/2025"]));
  });

  it("lista vazia sem revogações não quebra", () => {
    expect(construirNumerosRevogados([portaria()])).toEqual(new Set());
  });
});

describe("calcularDuracao", () => {
  it("conta o mesmo dia como 1 dia", () => {
    expect(calcularDuracao("2026-04-01", "2026-04-01")).toEqual({ anos: 0, meses: 0, dias: 1 });
  });

  it("calcula dias dentro do mesmo mês", () => {
    expect(calcularDuracao("2026-01-01", "2026-01-31")).toEqual({ anos: 0, meses: 0, dias: 31 });
  });

  it("calcula quando cruza a virada de mês", () => {
    // 15/01 a 10/02 inclusive = 17 dias de janeiro + 10 dias de fevereiro = 27 dias
    expect(calcularDuracao("2026-01-15", "2026-02-10")).toEqual({ anos: 0, meses: 0, dias: 27 });
  });

  it("calcula anos completos", () => {
    expect(calcularDuracao("2025-01-01", "2026-01-01")).toEqual({ anos: 1, meses: 0, dias: 1 });
  });

  it("usa a data de referência quando não há data de fim (vigência em curso)", () => {
    expect(calcularDuracao("2026-01-01", undefined, new Date(2026, 5, 1))).toEqual({
      anos: 0,
      meses: 5,
      dias: 1,
    });
  });
});

describe("formatarDuracao", () => {
  it("formata apenas dias", () => {
    expect(formatarDuracao({ anos: 0, meses: 0, dias: 1 })).toBe("1 dia");
    expect(formatarDuracao({ anos: 0, meses: 0, dias: 5 })).toBe("5 dias");
  });

  it("formata dois componentes com 'e'", () => {
    expect(formatarDuracao({ anos: 0, meses: 1, dias: 1 })).toBe("1 mês e 1 dia");
  });

  it("formata os três componentes", () => {
    expect(formatarDuracao({ anos: 1, meses: 2, dias: 3 })).toBe("1 ano, 2 meses e 3 dias");
  });

  it("pluraliza corretamente", () => {
    expect(formatarDuracao({ anos: 2, meses: 0, dias: 0 })).toBe("2 anos");
  });
});
