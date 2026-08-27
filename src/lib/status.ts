import type { Portaria } from "./types";

/** Trata as datas ISO (yyyy-mm-dd) como datas locais, sem componente de hora. */
function parseData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number) as [number, number, number];
  return new Date(ano, mes - 1, dia);
}

export interface OpcoesIsAtiva {
  /** Números ("NNNN/AAAA") de portarias revogadas por alguma outra — ver `construirNumerosRevogados`. */
  revogadas?: Set<string>;
  referencia?: Date;
}

/**
 * Uma portaria expira tanto por passar da data de fim expressa quanto por
 * ter sido revogada/tornada sem efeito por outra portaria (ainda que dentro
 * do prazo de vigência original) — a revogação prevalece sobre a data.
 */
export function isAtiva(portaria: Pick<Portaria, "dataFim" | "numero">, opcoes: OpcoesIsAtiva = {}): boolean {
  const { revogadas, referencia = new Date() } = opcoes;
  if (revogadas?.has(portaria.numero)) return false;
  if (!portaria.dataFim) return true;
  return parseData(portaria.dataFim) >= referencia;
}

/**
 * Índice reverso: números ("NNNN/AAAA") de portarias citadas como revogadas
 * no texto de alguma outra portaria do conjunto — usado por `isAtiva` para
 * marcar como expirada mesmo sem `dataFim` explícita. Precisa ser calculado
 * sobre TODAS as portarias (não só um subconjunto já filtrado), já que a
 * portaria revogadora pode estar em outro ano/página do que a revogada.
 */
export function construirNumerosRevogados(portarias: Portaria[]): Set<string> {
  const revogados = new Set<string>();
  for (const portaria of portarias) {
    for (const numero of portaria.revoga ?? []) revogados.add(numero);
  }
  return revogados;
}

export interface Duracao {
  anos: number;
  meses: number;
  dias: number;
}

/**
 * Diferença civil (anos/meses/dias) entre duas datas, contando o dia final
 * como incluído (uma portaria de 01/01 a 01/01 do mesmo ano vale "1 dia").
 * Usada para conferir pontuação de tempo de serviço em núcleos/comissões.
 */
export function calcularDuracao(inicioIso: string, fimIso?: string, hoje: Date = new Date()): Duracao {
  const inicio = parseData(inicioIso);
  const fim = fimIso ? parseData(fimIso) : hoje;

  let anos = fim.getFullYear() - inicio.getFullYear();
  let meses = fim.getMonth() - inicio.getMonth();
  let dias = fim.getDate() - inicio.getDate() + 1;

  if (dias <= 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(fim.getFullYear(), fim.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  return { anos: Math.max(anos, 0), meses: Math.max(meses, 0), dias: Math.max(dias, 0) };
}

export function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDuracao({ anos, meses, dias }: Duracao): string {
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos === 1 ? "" : "s"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mês" : "meses"}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} dia${dias === 1 ? "" : "s"}`);

  if (partes.length === 1) return partes[0]!;
  if (partes.length === 2) return `${partes[0]} e ${partes[1]}`;
  return `${partes[0]}, ${partes[1]} e ${partes[2]}`;
}
