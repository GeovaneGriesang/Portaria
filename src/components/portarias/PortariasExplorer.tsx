"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/normalize";
import { isAtiva } from "@/lib/status";
import type { Portaria } from "@/lib/types";
import { BulkDownloadBar } from "./BulkDownloadBar";
import { DashboardStats } from "./DashboardStats";
import { DataNotice } from "./DataNotice";
import { FilterPanel, type Filtros } from "./FilterPanel";
import { ResultsList } from "./ResultsList";

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
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const portariasFiltradas = useMemo(
    () => portarias.filter((portaria) => passaFiltro(portaria, filtros)),
    [portarias, filtros],
  );

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
        <FilterPanel filtros={filtros} onChange={setFiltros} />
        <ResultsList
          portarias={portariasFiltradas}
          selecionadas={selecionadas}
          onToggleSelecionada={toggleSelecionada}
        />
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
