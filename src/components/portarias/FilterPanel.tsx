"use client";

import { TIPO_LABELS, UNIDADES, type TipoPortaria } from "@/lib/types";

export type StatusFiltro = "todas" | "ativas" | "expiradas";

export interface Filtros {
  busca: string;
  tipos: Set<TipoPortaria>;
  unidades: Set<string>;
  status: StatusFiltro;
}

interface FilterPanelProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
}

const CHECKBOX_LABEL_CLASS =
  "flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300";
const CHECKBOX_CLASS =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-if-green focus:ring-if-green dark:border-neutral-700";

export function FilterPanel({ filtros, onChange }: FilterPanelProps) {
  function alternarTipo(tipo: TipoPortaria) {
    const novosTipos = new Set(filtros.tipos);
    if (novosTipos.has(tipo)) novosTipos.delete(tipo);
    else novosTipos.add(tipo);
    onChange({ ...filtros, tipos: novosTipos });
  }

  function alternarUnidade(unidade: string) {
    const novasUnidades = new Set(filtros.unidades);
    if (novasUnidades.has(unidade)) novasUnidades.delete(unidade);
    else novasUnidades.add(unidade);
    onChange({ ...filtros, unidades: novasUnidades });
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <label htmlFor="busca-servidor" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Servidor (nome ou SIAPE)
        </label>
        <input
          id="busca-servidor"
          type="text"
          value={filtros.busca}
          onChange={(evento) => onChange({ ...filtros, busca: evento.target.value })}
          placeholder="Ex.: Ana Paula ou 1234567"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-if-green focus:outline-none focus:ring-1 focus:ring-if-green dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo de portaria</span>
        <div className="flex flex-col gap-2">
          {(Object.entries(TIPO_LABELS) as Array<[TipoPortaria, string]>).map(([tipo, label]) => (
            <label key={tipo} className={CHECKBOX_LABEL_CLASS}>
              <input
                type="checkbox"
                className={CHECKBOX_CLASS}
                checked={filtros.tipos.has(tipo)}
                onChange={() => alternarTipo(tipo)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Unidade</span>
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {UNIDADES.map((unidade) => (
            <label key={unidade} className={CHECKBOX_LABEL_CLASS}>
              <input
                type="checkbox"
                className={CHECKBOX_CLASS}
                checked={filtros.unidades.has(unidade)}
                onChange={() => alternarUnidade(unidade)}
              />
              {unidade}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Vigência</span>
        <div className="flex gap-4">
          {(["todas", "ativas", "expiradas"] as StatusFiltro[]).map((status) => (
            <label key={status} className={CHECKBOX_LABEL_CLASS}>
              <input
                type="radio"
                name="status-vigencia"
                className="h-4 w-4 border-neutral-300 text-if-green focus:ring-if-green dark:border-neutral-700"
                checked={filtros.status === status}
                onChange={() => onChange({ ...filtros, status })}
              />
              {status === "todas" ? "Todas" : status === "ativas" ? "Ativas" : "Expiradas"}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
