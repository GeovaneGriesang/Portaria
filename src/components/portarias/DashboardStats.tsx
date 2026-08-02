import { isAtiva } from "@/lib/status";
import { TIPO_LABELS, type Portaria, type TipoPortaria } from "@/lib/types";

interface DashboardStatsProps {
  portarias: Portaria[];
}

function contarPor<T extends string>(portarias: Portaria[], obter: (p: Portaria) => T[]): Map<T, number> {
  const contagem = new Map<T, number>();
  for (const portaria of portarias) {
    for (const chave of obter(portaria)) {
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }
  return contagem;
}

function StatTile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{valor}</span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}

function Breakdown<T extends string>({ titulo, contagem, formatarChave }: { titulo: string; contagem: Map<T, number>; formatarChave: (chave: T) => string }) {
  const linhas = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]);

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

export function DashboardStats({ portarias }: DashboardStatsProps) {
  const ativas = portarias.filter((p) => isAtiva(p)).length;
  const expiradas = portarias.length - ativas;
  const porTipo = contarPor<TipoPortaria>(portarias, (p) => p.tipos);
  const porUnidade = contarPor<string>(portarias, (p) => [p.unidade]);

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Portarias encontradas" valor={portarias.length} />
        <StatTile label="Ativas" valor={ativas} />
        <StatTile label="Expiradas" valor={expiradas} />
      </div>
      <details className="group rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-neutral-700 marker:content-none dark:text-neutral-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▸</span>
            Detalhamento por tipo e unidade
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
          <Breakdown titulo="Por tipo" contagem={porTipo} formatarChave={(tipo) => TIPO_LABELS[tipo]} />
          <Breakdown titulo="Por unidade" contagem={porUnidade} formatarChave={(unidade) => unidade} />
        </div>
      </details>
    </section>
  );
}
