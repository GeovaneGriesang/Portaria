import { normalizar } from "./normalize";
import { isAtiva } from "./status";
import type { Portaria, TipoPortaria } from "./types";

export type StatusFiltro = "todas" | "ativas" | "expiradas";

export type TamanhoPagina = "20" | "50" | "todas";

export interface Filtros {
  busca: string;
  numero: string;
  conteudo: string;
  tipos: Set<TipoPortaria>;
  unidades: Set<string>;
  status: StatusFiltro;
}

export const FILTROS_INICIAIS: Filtros = {
  busca: "",
  numero: "",
  conteudo: "",
  tipos: new Set(),
  unidades: new Set(),
  status: "todas",
};

/**
 * `textos` só é necessário quando `filtros.conteudo` está preenchido — o
 * mapa de texto integral é caro de carregar (dezenas de MB) e por isso só é
 * lido pela API quando a busca por conteúdo é de fato usada. `revogadas`
 * (ver `construirNumerosRevogados`) precisa vir calculado sobre TODAS as
 * portarias, não só as já filtradas — passar aqui pro filtro de status.
 */
export function passaFiltro(
  portaria: Portaria,
  filtros: Filtros,
  textos?: Map<string, string>,
  revogadas?: Set<string>,
): boolean {
  if (filtros.busca.trim()) {
    const alvoNome = normalizar(filtros.busca);
    const alvoSiape = filtros.busca.trim();
    const bate = portaria.servidores.some(
      (servidor) => normalizar(servidor.nome).includes(alvoNome) || (servidor.siape ?? "").includes(alvoSiape),
    );
    if (!bate) return false;
  }

  if (filtros.numero.trim() && !portaria.numero.includes(filtros.numero.trim())) {
    return false;
  }

  if (filtros.conteudo.trim()) {
    const texto = textos?.get(portaria.id) ?? "";
    if (!normalizar(texto).includes(normalizar(filtros.conteudo))) return false;
  }

  if (filtros.tipos.size > 0 && !portaria.tipos.some((tipo) => filtros.tipos.has(tipo))) {
    return false;
  }

  if (filtros.unidades.size > 0 && !filtros.unidades.has(portaria.unidade)) {
    return false;
  }

  if (filtros.status !== "todas") {
    const ativa = isAtiva(portaria, { revogadas });
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
    numero: params.get("numero") ?? "",
    conteudo: params.get("conteudo") ?? "",
    tipos: new Set(tipos),
    unidades: new Set(unidades),
    status: status === "ativas" || status === "expiradas" ? status : "todas",
  };
}

/** Monta a query string enviada pelo cliente para GET /api/portarias. */
export function paramsDeFiltros(filtros: Filtros, pagina: number, tamanhoPagina: TamanhoPagina): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.busca.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.numero.trim()) params.set("numero", filtros.numero.trim());
  if (filtros.conteudo.trim()) params.set("conteudo", filtros.conteudo.trim());
  if (filtros.tipos.size > 0) params.set("tipos", Array.from(filtros.tipos).join(","));
  if (filtros.unidades.size > 0) params.set("unidades", Array.from(filtros.unidades).join(","));
  if (filtros.status !== "todas") params.set("status", filtros.status);
  params.set("pagina", String(pagina));
  params.set("tamanhoPagina", tamanhoPagina);
  return params;
}
