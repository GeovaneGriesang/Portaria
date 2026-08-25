"use client";

import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/basePath";
import { formatarDataBr, formatarDuracao } from "@/lib/status";
import type { Servidor } from "@/lib/types";
import type { RespostaEvolucao } from "@/app/api/portarias/evolucao/route";

interface EvolucaoServidorProps {
  servidor: Servidor;
  onFechar: () => void;
}

export function EvolucaoServidor({ servidor, onFechar }: EvolucaoServidorProps) {
  const [resposta, setResposta] = useState<RespostaEvolucao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ nome: servidor.nome });
    if (servidor.siape) params.set("siape", servidor.siape);

    setCarregando(true);
    setErro(null);
    fetch(assetUrl(`/api/portarias/evolucao?${params.toString()}`))
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar a linha do tempo.");
        return res.json() as Promise<RespostaEvolucao>;
      })
      .then(setResposta)
      .catch(() => setErro("Não foi possível carregar a linha do tempo. Tente novamente."))
      .finally(() => setCarregando(false));
  }, [servidor.nome, servidor.siape]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-neutral-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Linha do tempo de função</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {servidor.nome}
              {servidor.siape && ` (SIAPE ${servidor.siape})`}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Fechar
          </button>
        </div>

        {carregando && <p className="text-sm text-neutral-500 dark:text-neutral-400">Carregando…</p>}
        {erro && <p className="text-sm text-if-red">{erro}</p>}

        {resposta && resposta.sequencias.length === 0 && !carregando && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma portaria de designação, gratificação, nomeação, substituição ou exoneração encontrada para este
            servidor.
          </p>
        )}

        {resposta &&
          resposta.sequencias.map((sequencia, indice) => (
            <div key={indice} className="mb-6 last:mb-0">
              {resposta.sequencias.length > 1 && (
                <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Sequência {indice + 1}
                </h3>
              )}
              <ul className="flex flex-col gap-3">
                {sequencia.entradas.map((entrada) => (
                  <li
                    key={entrada.portaria.id}
                    className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                  >
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      📄 Portaria n.º {entrada.portaria.numero}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      ▫️ Período: {formatarDataBr(entrada.inicio)} a{" "}
                      {entrada.emAndamento ? "hoje" : formatarDataBr(entrada.fim!)}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      ▫️ Vigência: {formatarDuracao(entrada.duracao)} ({entrada.dias} dias)
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg bg-if-green/10 p-3 text-sm">
                <p className="font-medium text-if-green">📌 Total acumulado</p>
                <p className="text-neutral-700 dark:text-neutral-300">
                  {formatarDuracao(sequencia.duracaoTotal)} ({sequencia.diasTotal} dias)
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Período: {formatarDataBr(sequencia.periodoTotal.inicio)} a{" "}
                  {sequencia.emAndamento ? "hoje" : formatarDataBr(sequencia.periodoTotal.fim!)}
                  {sequencia.encerradaPor && ` · Encerrada pela Portaria n.º ${sequencia.encerradaPor.numero}`}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
