import { describe, expect, it } from "vitest";
import { construirSequencias, identificarPortariasDoServidor } from "@/lib/evolucaoFuncao";
import { calcularDuracao } from "@/lib/status";
import type { Portaria } from "@/lib/types";

function portaria(sobrescritas: Partial<Portaria> = {}): Portaria {
  return {
    id: `${sobrescritas.ano ?? 2021}-x-${sobrescritas.numero ?? "0001"}`,
    numero: "0001/2021",
    ano: 2021,
    mes: 1,
    arquivo: "portarias/2021/01/portaria-0001.pdf",
    unidade: "Câmpus Venâncio Aires",
    tipos: ["designacao"],
    servidores: [{ nome: "Ana Paula Fagundes", siape: "1234567" }],
    dataInicio: "2021-01-01",
    ...sobrescritas,
  };
}

describe("identificarPortariasDoServidor", () => {
  it("casa por SIAPE quando informado, ignorando nome diferente", () => {
    const portarias = [
      portaria({ id: "a", servidores: [{ nome: "Ana Paula Fagundes", siape: "1234567" }] }),
      portaria({ id: "b", servidores: [{ nome: "Ana Paula F.", siape: "1234567" }] }),
      portaria({ id: "c", servidores: [{ nome: "Ana Paula Fagundes", siape: "7654321" }] }),
    ];
    const resultado = identificarPortariasDoServidor(portarias, { nome: "Ana Paula Fagundes", siape: "1234567" });
    expect(resultado.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("sem SIAPE, casa por nome normalizado exato", () => {
    const portarias = [
      portaria({ id: "a", servidores: [{ nome: "João da Silva" }] }),
      portaria({ id: "b", servidores: [{ nome: "joao da silva" }] }),
      portaria({ id: "c", servidores: [{ nome: "João da Silva Neto" }] }),
    ];
    const resultado = identificarPortariasDoServidor(portarias, { nome: "João da Silva" });
    expect(resultado.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("descarta tipos irrelevantes para a linha do tempo (ex.: diária)", () => {
    const portarias = [portaria({ id: "a", tipos: ["diaria"] })];
    expect(identificarPortariasDoServidor(portarias, { nome: "Ana Paula Fagundes" })).toEqual([]);
  });
});

describe("construirSequencias", () => {
  it("encadeia redesignações consecutivas e usa a data da próxima como fim da anterior", () => {
    const portarias = [
      portaria({ id: "p1", numero: "1842/2021", dataInicio: "2021-09-16", tipos: ["designacao"] }),
      portaria({ id: "p2", numero: "2279/2022", dataInicio: "2022-09-13", tipos: ["designacao"] }),
      portaria({ id: "p3", numero: "3052/2022", dataInicio: "2022-12-13", tipos: ["designacao"] }),
    ];

    const [sequencia] = construirSequencias(portarias);
    expect(sequencia!.entradas).toHaveLength(3);
    expect(sequencia!.entradas[0]).toMatchObject({ inicio: "2021-09-16", fim: "2022-09-13", emAndamento: false });
    expect(sequencia!.entradas[1]).toMatchObject({ inicio: "2022-09-13", fim: "2022-12-13", emAndamento: false });
    expect(sequencia!.entradas[2]).toMatchObject({ inicio: "2022-12-13", emAndamento: true });
    expect(sequencia!.emAndamento).toBe(true);
    expect(sequencia!.periodoTotal).toEqual({ inicio: "2021-09-16", fim: undefined });
    expect(sequencia!.duracaoTotal).toEqual(calcularDuracao("2021-09-16", undefined));
  });

  it("uma exoneração fecha a sequência sem virar uma entrada própria", () => {
    const portarias = [
      portaria({ id: "p1", numero: "1/2021", dataInicio: "2021-01-01", tipos: ["designacao"] }),
      portaria({ id: "p2", numero: "2/2022", dataInicio: "2022-01-01", tipos: ["exoneracao"] }),
    ];

    const [sequencia] = construirSequencias(portarias);
    expect(sequencia!.entradas).toHaveLength(1);
    expect(sequencia!.entradas[0]).toMatchObject({ inicio: "2021-01-01", fim: "2022-01-01", emAndamento: false });
    expect(sequencia!.encerradaPor?.id).toBe("p2");
    expect(sequencia!.emAndamento).toBe(false);
    expect(sequencia!.periodoTotal).toEqual({ inicio: "2021-01-01", fim: "2022-01-01" });
  });

  it("uma nova designação após o encerramento inicia uma segunda sequência", () => {
    const portarias = [
      portaria({ id: "p1", numero: "1/2021", dataInicio: "2021-01-01", tipos: ["designacao"] }),
      portaria({ id: "p2", numero: "2/2022", dataInicio: "2022-01-01", tipos: ["exoneracao"] }),
      portaria({ id: "p3", numero: "3/2023", dataInicio: "2023-01-01", tipos: ["designacao"] }),
    ];

    const sequencias = construirSequencias(portarias);
    expect(sequencias).toHaveLength(2);
    expect(sequencias[0]!.entradas.map((e) => e.portaria.id)).toEqual(["p1"]);
    expect(sequencias[1]!.entradas.map((e) => e.portaria.id)).toEqual(["p3"]);
    expect(sequencias[1]!.emAndamento).toBe(true);
  });

  it("uma exoneração sem sequência aberta é ignorada (nada a encerrar)", () => {
    const portarias = [portaria({ id: "p1", numero: "1/2021", dataInicio: "2021-01-01", tipos: ["exoneracao"] })];
    expect(construirSequencias(portarias)).toEqual([]);
  });

  it("ementas com assunto diferente iniciam uma nova sequência, mesmo sem exoneração no meio", () => {
    const portarias = [
      portaria({
        id: "p1",
        numero: "1/2021",
        dataInicio: "2021-01-01",
        tipos: ["comissao", "designacao"],
        ementa: "Designar servidor como Gestor do Contrato de limpeza nº 12/2021",
      }),
      portaria({
        id: "p2",
        numero: "2/2021",
        dataInicio: "2021-06-01",
        tipos: ["comissao", "designacao"],
        ementa: "Designar servidor como Fiscal do Contrato de vigilância nº 45/2021",
      }),
    ];

    const sequencias = construirSequencias(portarias);
    expect(sequencias).toHaveLength(2);
    expect(sequencias[0]!.entradas.map((e) => e.portaria.id)).toEqual(["p1"]);
    expect(sequencias[1]!.entradas.map((e) => e.portaria.id)).toEqual(["p2"]);
  });

  it("ementas com palavras-chave em comum continuam a mesma sequência", () => {
    const portarias = [
      portaria({
        id: "p1",
        numero: "1842/2021",
        dataInicio: "2021-09-16",
        ementa: "Designar Fulano para exercer a função de Coordenador do Colegiado do Curso de TADS, do Câmpus Venâncio Aires",
      }),
      portaria({
        id: "p2",
        numero: "2279/2022",
        dataInicio: "2022-09-13",
        ementa: "Designar Fulano para exercer a função de Coordenador do Colegiado do Curso de TADS, do Câmpus Venâncio Aires",
      }),
    ];

    const sequencias = construirSequencias(portarias);
    expect(sequencias).toHaveLength(1);
    expect(sequencias[0]!.entradas.map((e) => e.portaria.id)).toEqual(["p1", "p2"]);
  });

  it("mesmo curso/campus mas órgão diferente (colegiado vs NDE) não é o mesmo assunto", () => {
    const portarias = [
      portaria({
        id: "p1",
        numero: "1842/2021",
        dataInicio: "2021-09-16",
        tipos: ["designacao"],
        ementa:
          "Designar a equipe abaixo relacionada para, sob a coordenação do primeiro, constituir o Colegiado do Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas, do câmpus Venâncio Aires",
      }),
      portaria({
        id: "p2",
        numero: "1843/2021",
        dataInicio: "2021-09-16",
        tipos: ["nucleo", "designacao"],
        ementa:
          "Designar a equipe abaixo relacionada para, sob a coordenação do primeiro, constituir o Núcleo Docente Estruturante (NDE) do curso superior de Tecnologia em Análise e Desenvolvimento de Sistemas, do câmpus Venâncio Aires",
      }),
    ];

    const sequencias = construirSequencias(portarias);
    expect(sequencias).toHaveLength(2);
    expect(sequencias[0]!.entradas.map((e) => e.portaria.id)).toEqual(["p1"]);
    expect(sequencias[1]!.entradas.map((e) => e.portaria.id)).toEqual(["p2"]);
  });

  it("sem ementa em algum dos dois lados não fragmenta a sequência", () => {
    const portarias = [
      portaria({ id: "p1", numero: "1/2021", dataInicio: "2021-01-01", ementa: undefined }),
      portaria({ id: "p2", numero: "2/2022", dataInicio: "2022-01-01", ementa: "Designar Fulano para o Colegiado" }),
    ];

    const sequencias = construirSequencias(portarias);
    expect(sequencias).toHaveLength(1);
  });

  it("usa dataFim da última portaria quando não há sucessora nem encerramento", () => {
    const portarias = [
      portaria({ id: "p1", numero: "1/2021", dataInicio: "2021-01-01", dataFim: "2021-06-30", tipos: ["designacao"] }),
    ];
    const [sequencia] = construirSequencias(portarias);
    expect(sequencia!.entradas[0]).toMatchObject({ fim: "2021-06-30", emAndamento: false });
  });

  it("trata dataFim: null (valor real do JSON gerado pela ingestão) como em andamento, não crasha", () => {
    // A ingestão grava "dataFim": null (não omite o campo) quando não há data de
    // fim conhecida — bug real reproduzido em produção: sem essa normalização,
    // `fim` ficava `null` em vez de `undefined` e quebrava a UI em
    // formatarDataBr(null).split(...).
    const portarias = [
      portaria({
        id: "p1",
        numero: "1/2021",
        dataInicio: "2021-01-01",
        dataFim: null as unknown as undefined,
        tipos: ["designacao"],
      }),
    ];
    const [sequencia] = construirSequencias(portarias);
    expect(sequencia!.entradas[0]).toMatchObject({ fim: undefined, emAndamento: true });
    expect(sequencia!.periodoTotal.fim).toBeUndefined();
  });
});
