import { isAtiva } from "./status";
import type { Portaria, TipoPortaria } from "./types";

export interface Estatisticas {
  total: number;
  ativas: number;
  expiradas: number;
  porTipo: Partial<Record<TipoPortaria, number>>;
  porUnidade: Record<string, number>;
}

/**
 * Agregados calculados no servidor a partir da lista completa (ou já
 * filtrada) de portarias — o cliente nunca recebe os objetos individuais só
 * para contar totais, apenas estes números já prontos. `revogadas` (ver
 * `construirNumerosRevogados`) deve vir calculado sobre TODAS as portarias,
 * mesmo quando `portarias` aqui é só um subconjunto já filtrado.
 */
export function calcularEstatisticas(portarias: Portaria[], revogadas?: Set<string>): Estatisticas {
  let ativas = 0;
  const porTipo: Partial<Record<TipoPortaria, number>> = {};
  const porUnidade: Record<string, number> = {};

  for (const portaria of portarias) {
    if (isAtiva(portaria, { revogadas })) ativas += 1;

    for (const tipo of portaria.tipos) {
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
    }

    porUnidade[portaria.unidade] = (porUnidade[portaria.unidade] ?? 0) + 1;
  }

  return {
    total: portarias.length,
    ativas,
    expiradas: portarias.length - ativas,
    porTipo,
    porUnidade,
  };
}
