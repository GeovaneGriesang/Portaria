"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/basePath";
import type { Portaria } from "@/lib/types";

interface BulkDownloadBarProps {
  totalFiltrado: number;
  portariasSelecionadas: Portaria[];
  onSelecionarTodas: () => void;
  onLimparSelecao: () => void;
}

function nomeArquivoZip(arquivo: string): string {
  const partes = arquivo.split("/");
  return partes[partes.length - 1] ?? arquivo;
}

export function BulkDownloadBar({
  totalFiltrado,
  portariasSelecionadas,
  onSelecionarTodas,
  onLimparSelecao,
}: BulkDownloadBarProps) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixarSelecionadas() {
    setErro(null);
    setBaixando(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      const arquivos = await Promise.all(
        portariasSelecionadas.map(async (portaria) => {
          const resposta = await fetch(assetUrl(portaria.arquivo));
          if (!resposta.ok) {
            throw new Error(`Falha ao baixar a portaria ${portaria.numero}`);
          }
          return { nome: nomeArquivoZip(portaria.arquivo), bytes: await resposta.arrayBuffer() };
        }),
      );

      for (const arquivo of arquivos) {
        zip.file(arquivo.nome, arquivo.bytes);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "portarias.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : "Não foi possível gerar o zip.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-lg border-2 border-if-green bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900/95">
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
        <span>
          {portariasSelecionadas.length} de {totalFiltrado} selecionada{portariasSelecionadas.length === 1 ? "" : "s"}
        </span>
        <button type="button" onClick={onSelecionarTodas} className="text-if-green hover:underline">
          Selecionar todas desta página
        </button>
        <button type="button" onClick={onLimparSelecao} className="text-neutral-500 hover:underline dark:text-neutral-400">
          Limpar seleção
        </button>
      </div>

      <div className="flex items-center gap-3">
        {erro && <span className="text-xs text-if-red">{erro}</span>}
        <button
          type="button"
          onClick={baixarSelecionadas}
          disabled={portariasSelecionadas.length === 0 || baixando}
          className="rounded-md bg-if-green px-4 py-2 text-sm font-medium text-white hover:bg-if-green/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {baixando ? "Gerando zip…" : `Baixar selecionadas (${portariasSelecionadas.length})`}
        </button>
      </div>
    </div>
  );
}
