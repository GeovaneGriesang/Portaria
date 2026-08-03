"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/normalize";
import { isAtiva } from "@/lib/status";
import type { Portaria } from "@/lib/types";
import { BulkDownloadBar } from "./BulkDownloadBar";
import { DashboardStats } from "./DashboardStats";
import { DataNotice } from "./DataNotice";
import { FilterPanel, type Filtros } from "./FilterPanel";
import { ProgressBar } from "./ProgressBar";
import { ResultsList } from "./ResultsList";

// Delay so a busca de fato mostra a barra de progresso em vez de "piscar" —
// o filtro em si é rápido, mas com ~18 mil portarias renderizar a lista
// nova ainda toma um tempo perceptível, e refazer isso a cada tecla digitada
// (em vez de só ao clicar "Buscar") é o que pesava no desempenho antes.
const ATRASO_BUSCA_MS = 300;

interface PortariasExplorerProps {
  portarias: Portaria[];
}

const FILTROS_INICIAIS: Filtros = {
  busca: "",
  tipos: new Set(),
  unidades: new Set(),
  status: "todas",
};

function passaFiltro(portaria: Portaria, filtros: Filtros): boolean {
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

export function PortariasExplorer({ portarias }: PortariasExplorerProps) {
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(FILTROS_INICIAIS);
  const [buscando, setBuscando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const portariasFiltradas = useMemo(
    () => portarias.filter((portaria) => passaFiltro(portaria, filtrosAplicados)),
    [portarias, filtrosAplicados],
  );

  function buscar(novosFiltros: Filtros) {
    setBuscando(true);
    setTimeout(() => {
      setFiltrosAplicados(novosFiltros);
      setBuscando(false);
    }, ATRASO_BUSCA_MS);
  }

  function toggleSelecionada(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodas() {
    setSelecionadas(new Set(portariasFiltradas.map((p) => p.id)));
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  const portariasSelecionadas = portariasFiltradas.filter((p) => selecionadas.has(p.id));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <DataNotice portarias={portarias} />

      <DashboardStats portarias={portariasFiltradas} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <FilterPanel filtrosIniciais={filtrosAplicados} onBuscar={buscar} buscando={buscando} />
        <div className="flex flex-col gap-3">
          {buscando && <ProgressBar />}
          <ResultsList
            portarias={portariasFiltradas}
            selecionadas={selecionadas}
            onToggleSelecionada={toggleSelecionada}
          />
        </div>
      </div>

      <BulkDownloadBar
        totalFiltrado={portariasFiltradas.length}
        portariasSelecionadas={portariasSelecionadas}
        onSelecionarTodas={selecionarTodas}
        onLimparSelecao={limparSelecao}
      />
    </div>
  );
}
