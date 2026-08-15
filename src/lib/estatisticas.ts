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
 * para contar totais, apenas estes números já prontos.
 */
export function calcularEstatisticas(portarias: Portaria[]): Estatisticas {
  let ativas = 0;
  const porTipo: Partial<Record<TipoPortaria, number>> = {};
  const porUnidade: Record<string, number> = {};

  for (const portaria of portarias) {
    if (isAtiva(portaria)) ativas += 1;

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
