"use client";

import { assetUrl } from "@/lib/basePath";
import { calcularDuracao, formatarDuracao, isAtiva } from "@/lib/status";
import { TIPO_LABELS, type Portaria } from "@/lib/types";

interface ResultsListProps {
  portarias: Portaria[];
  selecionadas: Set<string>;
  onToggleSelecionada: (id: string) => void;
}

function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ResultsList({ portarias, selecionadas, onToggleSelecionada }: ResultsListProps) {
  if (portarias.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Nenhuma portaria encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {portarias.map((portaria) => {
        const ativa = isAtiva(portaria);
        const duracao = formatarDuracao(calcularDuracao(portaria.dataInicio, portaria.dataFim));

        return (
          <li
            key={portaria.id}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-start sm:gap-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <input
              type="checkbox"
              aria-label={`Selecionar portaria ${portaria.numero}`}
              checked={selecionadas.has(portaria.id)}
              onChange={() => onToggleSelecionada(portaria.id)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-if-green focus:ring-if-green dark:border-neutral-700"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Portaria {portaria.numero}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ativa
                      ? "bg-if-green/10 text-if-green"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {ativa ? "Ativa" : "Expirada"}
                </span>
                {portaria.tipos.map((tipo) => (
                  <span
                    key={tipo}
                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {TIPO_LABELS[tipo]}
                  </span>
                ))}
              </div>

              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{portaria.unidade}</p>
              {portaria.ementa && <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{portaria.ementa}</p>}

              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {portaria.servidores.map((s) => s.nome + (s.siape ? ` (SIAPE ${s.siape})` : "")).join("; ")}
              </p>

              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Vigência: {formatarDataBr(portaria.dataInicio)} até{" "}
                {portaria.dataFim ? formatarDataBr(portaria.dataFim) : "indeterminado"} · Duração: {duracao}
              </p>
            </div>

            <a
              href={assetUrl(portaria.arquivo)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 self-start rounded-md border border-if-green px-3 py-1.5 text-xs font-medium text-if-green hover:bg-if-green/10"
            >
              Baixar PDF
            </a>
          </li>
        );
      })}
    </ul>
  );
}
