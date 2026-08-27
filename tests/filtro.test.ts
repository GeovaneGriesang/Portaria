import { describe, expect, it } from "vitest";
import { passaFiltro, type Filtros } from "@/lib/filtro";
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
    servidores: [{ nome: "Ana Paula Fagundes", siape: "1234567" }],
    dataInicio: "2026-01-01",
    ...sobrescritas,
  };
}

const SEM_FILTRO: Filtros = {
  busca: "",
  numero: "",
  conteudo: "",
  tipos: new Set(),
  unidades: new Set(),
  status: "todas",
};

describe("passaFiltro", () => {
  it("sem nenhum filtro ativo, aceita qualquer portaria", () => {
    expect(passaFiltro(portaria(), SEM_FILTRO)).toBe(true);
  });

  it("busca por nome é tolerante a acento e caixa", () => {
    const filtros: Filtros = { ...SEM_FILTRO, busca: "ana paula" };
    expect(passaFiltro(portaria(), filtros)).toBe(true);
  });

  it("busca por SIAPE bate por substring", () => {
    const filtros: Filtros = { ...SEM_FILTRO, busca: "23456" };
    expect(passaFiltro(portaria(), filtros)).toBe(true);
  });

  it("busca que não corresponde a nenhum servidor rejeita a portaria", () => {
    const filtros: Filtros = { ...SEM_FILTRO, busca: "Outro Nome" };
    expect(passaFiltro(portaria(), filtros)).toBe(false);
  });

  it("busca por número aceita número parcial (sem ano)", () => {
    const filtros: Filtros = { ...SEM_FILTRO, numero: "0001" };
    expect(passaFiltro(portaria({ numero: "0001/2026" }), filtros)).toBe(true);
    expect(passaFiltro(portaria({ numero: "0002/2026" }), filtros)).toBe(false);
  });

  it("busca por número aceita número completo com ano", () => {
    const filtros: Filtros = { ...SEM_FILTRO, numero: "0001/2026" };
    expect(passaFiltro(portaria({ numero: "0001/2026" }), filtros)).toBe(true);
    expect(passaFiltro(portaria({ numero: "0001/2025" }), filtros)).toBe(false);
  });

  it("busca por conteúdo consulta o mapa de textos por id, tolerante a acento", () => {
    const textos = new Map([["2026-0001", "Designa o coordenador do colegiado do TADS de Venâncio Aires"]]);
    const filtros: Filtros = { ...SEM_FILTRO, conteudo: "colegiado do tads de venancio aires" };
    expect(passaFiltro(portaria({ id: "2026-0001" }), filtros, textos)).toBe(true);
    expect(passaFiltro(portaria({ id: "2026-0002" }), filtros, textos)).toBe(false);
  });

  it("busca por conteúdo sem mapa de textos disponível rejeita tudo", () => {
    const filtros: Filtros = { ...SEM_FILTRO, conteudo: "colegiado" };
    expect(passaFiltro(portaria(), filtros)).toBe(false);
  });

  it("filtro de tipo é OR entre os tipos selecionados", () => {
    const filtros: Filtros = { ...SEM_FILTRO, tipos: new Set(["nucleo", "designacao"]) };
    expect(passaFiltro(portaria({ tipos: ["designacao"] }), filtros)).toBe(true);
    expect(passaFiltro(portaria({ tipos: ["comissao"] }), filtros)).toBe(false);
  });

  it("filtro de unidade exige correspondência exata", () => {
    const filtros: Filtros = { ...SEM_FILTRO, unidades: new Set(["Câmpus Pelotas"]) };
    expect(passaFiltro(portaria({ unidade: "Câmpus Pelotas" }), filtros)).toBe(true);
    expect(passaFiltro(portaria({ unidade: "Reitoria" }), filtros)).toBe(false);
  });

  it("filtro de vigência separa ativas de expiradas", () => {
    const ativas: Filtros = { ...SEM_FILTRO, status: "ativas" };
    const expiradas: Filtros = { ...SEM_FILTRO, status: "expiradas" };
    const vigente = portaria({ dataFim: undefined });
    const vencida = portaria({ dataFim: "2020-01-01" });

    expect(passaFiltro(vigente, ativas)).toBe(true);
    expect(passaFiltro(vigente, expiradas)).toBe(false);
    expect(passaFiltro(vencida, ativas)).toBe(false);
    expect(passaFiltro(vencida, expiradas)).toBe(true);
  });

  it("filtro de vigência trata portaria revogada como expirada mesmo sem dataFim", () => {
    const ativas: Filtros = { ...SEM_FILTRO, status: "ativas" };
    const expiradas: Filtros = { ...SEM_FILTRO, status: "expiradas" };
    const revogada = portaria({ numero: "0001/2026", dataFim: undefined });
    const revogadas = new Set(["0001/2026"]);

    expect(passaFiltro(revogada, ativas, undefined, revogadas)).toBe(false);
    expect(passaFiltro(revogada, expiradas, undefined, revogadas)).toBe(true);
  });
});
