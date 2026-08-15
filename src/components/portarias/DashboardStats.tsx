import type { Estatisticas } from "@/lib/estatisticas";
import { TIPO_LABELS, type TipoPortaria } from "@/lib/types";

interface DashboardStatsProps {
  estatisticas: Estatisticas;
}

function StatTile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{valor}</span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}

function Breakdown({
  titulo,
  contagem,
  formatarChave,
}: {
  titulo: string;
  contagem: Record<string, number | undefined>;
  formatarChave: (chave: string) => string;
}) {
  const linhas = Object.entries(contagem)
    .filter((entrada): entrada is [string, number] => entrada[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{titulo}</h3>
      <ul className="flex flex-col gap-1.5">
        {linhas.map(([chave, total]) => (
          <li key={chave} className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-300">
            <span>{formatarChave(chave)}</span>
            <span className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{total}</span>
          </li>
        ))}
        {linhas.length === 0 && <li className="text-sm text-neutral-400">Nenhum resultado.</li>}
      </ul>
    </div>
  );
}

export function DashboardStats({ estatisticas }: DashboardStatsProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Portarias encontradas" valor={estatisticas.total} />
        <StatTile label="Ativas" valor={estatisticas.ativas} />
        <StatTile label="Expiradas" valor={estatisticas.expiradas} />
      </div>
      <details className="group rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-neutral-700 marker:content-none dark:text-neutral-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▸</span>
            Detalhamento por tipo e unidade
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
          <Breakdown
            titulo="Por tipo"
            contagem={estatisticas.porTipo}
            formatarChave={(tipo) => TIPO_LABELS[tipo as TipoPortaria]}
          />
          <Breakdown titulo="Por unidade" contagem={estatisticas.porUnidade} formatarChave={(unidade) => unidade} />
        </div>
      </details>
    </section>
  );
}
