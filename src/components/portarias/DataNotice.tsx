import type { PeriodoCobertura } from "@/lib/cobertura";

interface DataNoticeProps {
  periodo: PeriodoCobertura | null;
}

export function DataNotice({ periodo }: DataNoticeProps) {
  return (
    <p className="text-xs text-neutral-500 dark:text-neutral-400">
      {periodo && (
        <>
          Boletins de {periodo.inicio} a {periodo.fim} publicados pelo IFSul.{" "}
        </>
      )}
      Atenção: o boletim mensal regular de outubro/2023 não foi disponibilizado pelo IFSul — está publicado
      apenas o boletim extra desse mês (uma portaria).
    </p>
  );
}
