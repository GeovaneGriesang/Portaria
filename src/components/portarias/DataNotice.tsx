import { periodoCobertura } from "@/lib/cobertura";
import type { Portaria } from "@/lib/types";

interface DataNoticeProps {
  portarias: Portaria[];
}

export function DataNotice({ portarias }: DataNoticeProps) {
  const periodo = periodoCobertura(portarias);

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
