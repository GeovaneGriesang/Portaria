"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/basePath";
import { calcularDuracao, formatarDataBr, formatarDuracao, isAtiva } from "@/lib/status";
import { TIPO_LABELS, type Portaria, type Servidor } from "@/lib/types";
import { EvolucaoServidor } from "./EvolucaoServidor";

interface ResultsListProps {
  portarias: Portaria[];
  /** Números ("NNNN/AAAA") das portarias desta página revogadas por outra — ver `construirNumerosRevogados`. */
  revogadas: Set<string>;
  selecionadas: Set<string>;
  onToggleSelecionada: (portaria: Portaria) => void;
}

export function ResultsList({ portarias, revogadas, selecionadas, onToggleSelecionada }: ResultsListProps) {
  const [servidorEvolucao, setServidorEvolucao] = useState<Servidor | null>(null);

  if (portarias.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Nenhuma portaria encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {portarias.map((portaria) => {
        const revogada = revogadas.has(portaria.numero);
        const ativa = isAtiva(portaria, { revogadas });
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
              onChange={() => onToggleSelecionada(portaria)}
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
                  {ativa ? "Ativa" : revogada ? "Revogada" : "Expirada"}
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

              <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-neutral-700 dark:text-neutral-300">
                {portaria.servidores.map((servidor, indice) => (
                  <span key={servidor.siape ?? servidor.nome}>
                    {indice > 0 && "; "}
                    {servidor.nome}
                    {servidor.siape && ` (SIAPE ${servidor.siape})`}{" "}
                    <button
                      type="button"
                      onClick={() => setServidorEvolucao(servidor)}
                      className="text-xs font-medium text-if-green underline-offset-2 hover:underline"
                    >
                      Ver linha do tempo
                    </button>
                  </span>
                ))}
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
      {servidorEvolucao && <EvolucaoServidor servidor={servidorEvolucao} onFechar={() => setServidorEvolucao(null)} />}
    </>
  );
}
