"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/basePath";
import type { PeriodoCobertura } from "@/lib/cobertura";
import type { Estatisticas } from "@/lib/estatisticas";
import { FILTROS_INICIAIS, paramsDeFiltros, type Filtros, type TamanhoPagina } from "@/lib/filtro";
import type { Portaria } from "@/lib/types";
import { BulkDownloadBar } from "./BulkDownloadBar";
import { DashboardStats } from "./DashboardStats";
import { DataNotice } from "./DataNotice";
import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { ProgressBar } from "./ProgressBar";
import { ResultsList } from "./ResultsList";
import type { RespostaBusca } from "@/app/api/portarias/route";

const TAMANHO_PAGINA_INICIAL: TamanhoPagina = "20";

interface PortariasExplorerProps {
  estatisticasIniciais: Estatisticas;
  periodoInicial: PeriodoCobertura | null;
}

interface Resultado {
  total: number;
  pagina: number;
  portarias: Portaria[];
  estatisticas: Estatisticas;
  revogadas: string[];
}

export function PortariasExplorer({ estatisticasIniciais, periodoInicial }: PortariasExplorerProps) {
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(FILTROS_INICIAIS);
  const [tamanhoPaginaAplicado, setTamanhoPaginaAplicado] = useState<TamanhoPagina>(TAMANHO_PAGINA_INICIAL);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Map<string, Portaria>>(new Map());

  async function buscar(filtros: Filtros, tamanhoPagina: TamanhoPagina, pagina: number) {
    setBuscando(true);
    setErro(null);
    try {
      const params = paramsDeFiltros(filtros, pagina, tamanhoPagina);
      const resposta = await fetch(assetUrl(`/api/portarias?${params.toString()}`));
      if (!resposta.ok) throw new Error("Não foi possível buscar as portarias.");

      const dados: RespostaBusca = await resposta.json();
      setResultado(dados);
      setFiltrosAplicados(filtros);
      setTamanhoPaginaAplicado(tamanhoPagina);
    } catch {
      setErro("Não foi possível buscar as portarias. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  }

  function toggleSelecionada(portaria: Portaria) {
    setSelecionadas((atual) => {
      const novo = new Map(atual);
      if (novo.has(portaria.id)) novo.delete(portaria.id);
      else novo.set(portaria.id, portaria);
      return novo;
    });
  }

  function selecionarTodasDaPagina() {
    if (!resultado) return;
    setSelecionadas((atual) => {
      const novo = new Map(atual);
      for (const portaria of resultado.portarias) novo.set(portaria.id, portaria);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionadas(new Map());
  }

  const tamanhoPaginaNumero = tamanhoPaginaAplicado === "todas" ? resultado?.total || 1 : Number(tamanhoPaginaAplicado);
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / tamanhoPaginaNumero)) : 1;
  const portariasSelecionadas = Array.from(selecionadas.values());
  const idsSelecionados = new Set(selecionadas.keys());

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <DataNotice periodo={periodoInicial} />

      <DashboardStats estatisticas={resultado?.estatisticas ?? estatisticasIniciais} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <FilterPanel
          filtrosIniciais={filtrosAplicados}
          tamanhoPaginaInicial={tamanhoPaginaAplicado}
          onBuscar={(filtros, tamanhoPagina) => buscar(filtros, tamanhoPagina, 1)}
          buscando={buscando}
        />

        <div className="flex flex-col gap-4">
          {buscando && <ProgressBar />}

          {erro && <p className="text-sm text-if-red">{erro}</p>}

          {!resultado && !buscando && !erro && (
            <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Use os filtros ao lado e clique em &quot;Buscar&quot; para ver as portarias.
            </p>
          )}

          {resultado && (
            <div className={buscando ? "pointer-events-none opacity-50" : undefined}>
              <ResultsList
                portarias={resultado.portarias}
                revogadas={new Set(resultado.revogadas)}
                selecionadas={idsSelecionados}
                onToggleSelecionada={toggleSelecionada}
              />
            </div>
          )}

          {resultado && (
            <Pagination
              pagina={resultado.pagina}
              totalPaginas={totalPaginas}
              total={resultado.total}
              onIrParaPagina={(pagina) => buscar(filtrosAplicados, tamanhoPaginaAplicado, pagina)}
              disabled={buscando}
            />
          )}
        </div>
      </div>

      {resultado && (
        <BulkDownloadBar
          totalFiltrado={resultado.total}
          portariasSelecionadas={portariasSelecionadas}
          onSelecionarTodas={selecionarTodasDaPagina}
          onLimparSelecao={limparSelecao}
        />
      )}
    </div>
  );
}
