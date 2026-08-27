import { NextResponse, type NextRequest } from "next/server";
import { calcularEstatisticas } from "@/lib/estatisticas";
import { filtrosDeParams, passaFiltro } from "@/lib/filtro";
import { getPortarias } from "@/lib/portarias";
import { getTextosPortarias } from "@/lib/portariasTexto";
import { construirNumerosRevogados } from "@/lib/status";

export interface RespostaBusca {
  total: number;
  pagina: number;
  portarias: ReturnType<typeof getPortarias>;
  estatisticas: ReturnType<typeof calcularEstatisticas>;
  /** Números das portarias desta página que foram revogadas por outra — ver `construirNumerosRevogados`. */
  revogadas: string[];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filtros = filtrosDeParams(params);
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);
  const tamanhoPaginaParam = params.get("tamanhoPagina");

  const todas = getPortarias();
  const revogadas = construirNumerosRevogados(todas);
  const textos = filtros.conteudo.trim() ? getTextosPortarias() : undefined;
  const filtradas = todas.filter((portaria) => passaFiltro(portaria, filtros, textos, revogadas));
  const estatisticas = calcularEstatisticas(filtradas, revogadas);

  const tamanhoPagina = tamanhoPaginaParam === "todas" ? filtradas.length : Number(tamanhoPaginaParam) || 20;
  const inicio = (pagina - 1) * tamanhoPagina;
  const portariasPagina = tamanhoPagina > 0 ? filtradas.slice(inicio, inicio + tamanhoPagina) : [];
  const revogadasDaPagina = portariasPagina.map((p) => p.numero).filter((numero) => revogadas.has(numero));

  const resposta: RespostaBusca = {
    total: filtradas.length,
    pagina,
    portarias: portariasPagina,
    estatisticas,
    revogadas: revogadasDaPagina,
  };
  return NextResponse.json(resposta);
}
