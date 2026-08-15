import { normalizar } from "./normalize";
import { isAtiva } from "./status";
import type { Portaria, TipoPortaria } from "./types";

export type StatusFiltro = "todas" | "ativas" | "expiradas";

export type TamanhoPagina = "20" | "50" | "todas";

export interface Filtros {
  busca: string;
  tipos: Set<TipoPortaria>;
  unidades: Set<string>;
  status: StatusFiltro;
}

export const FILTROS_INICIAIS: Filtros = {
  busca: "",
  tipos: new Set(),
  unidades: new Set(),
  status: "todas",
};

export function passaFiltro(portaria: Portaria, filtros: Filtros): boolean {
  if (filtros.busca.trim()) {
    const alvoNome = normalizar(filtros.busca);
    const alvoSiape = filtros.busca.trim();
    const bate = portaria.servidores.some(
      (servidor) => normalizar(servidor.nome).includes(alvoNome) || (servidor.siape ?? "").includes(alvoSiape),
    );
    if (!bate) return false;
  }

  if (filtros.tipos.size > 0 && !portaria.tipos.some((tipo) => filtros.tipos.has(tipo))) {
    return false;
  }

  if (filtros.unidades.size > 0 && !filtros.unidades.has(portaria.unidade)) {
    return false;
  }

  if (filtros.status !== "todas") {
    const ativa = isAtiva(portaria);
    if (filtros.status === "ativas" && !ativa) return false;
    if (filtros.status === "expiradas" && ativa) return false;
  }

  return true;
}

/** Parseia os filtros a partir da query string recebida pela API (server). */
export function filtrosDeParams(params: URLSearchParams): Filtros {
  const tipos = (params.get("tipos") ?? "")
    .split(",")
    .filter(Boolean) as TipoPortaria[];
  const unidades = (params.get("unidades") ?? "").split(",").filter(Boolean);
  const status = params.get("status");

  return {
    busca: params.get("busca") ?? "",
    tipos: new Set(tipos),
    unidades: new Set(unidades),
    status: status === "ativas" || status === "expiradas" ? status : "todas",
  };
}

/** Monta a query string enviada pelo cliente para GET /api/portarias. */
export function paramsDeFiltros(filtros: Filtros, pagina: number, tamanhoPagina: TamanhoPagina): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.busca.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.tipos.size > 0) params.set("tipos", Array.from(filtros.tipos).join(","));
  if (filtros.unidades.size > 0) params.set("unidades", Array.from(filtros.unidades).join(","));
  if (filtros.status !== "todas") params.set("status", filtros.status);
  params.set("pagina", String(pagina));
  params.set("tamanhoPagina", tamanhoPagina);
  return params;
}
