import Image from "next/image";
import { InstitutoFederalMark } from "./InstitutoFederalMark";
import { GitHubIcon } from "@/components/icons/GitHubIcon";

const ICON_LINK_CLASS =
  "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100";

/**
 * Crédito institucional exigido pelo IFSul - Câmpus Venâncio Aires: mesmo
 * sendo uma ferramenta de uso geral (qualquer servidor do IFSul pode usá-la),
 * a autoria do desenvolvimento deve ficar sempre visível. Respeita a reserva
 * de integridade (padding ao redor da marca) e a redução mínima (símbolo
 * nunca abaixo de ~30px) do Manual de Aplicação da Marca IF.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white px-6 py-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/GeovaneGriesang/Portaria"
            target="_blank"
            rel="noreferrer"
            title="Repositório no GitHub"
            aria-label="Repositório no GitHub"
            className={ICON_LINK_CLASS}
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          <a
            href="https://www.ifsul.edu.br"
            target="_blank"
            rel="noreferrer"
            title="Instituto Federal Sul-rio-grandense"
            aria-label="Instituto Federal Sul-rio-grandense"
            className={ICON_LINK_CLASS}
          >
            <InstitutoFederalMark size={20} />
          </a>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <a
            href="https://www.venancio.ifsul.edu.br/"
            target="_blank"
            rel="noreferrer"
            title="Instituto Federal Sul-rio-grandense - Câmpus Venâncio Aires - 15 anos"
            className="rounded-md bg-white p-2 dark:bg-transparent"
          >
            <Image
              src="/branding/selo-15-anos-venancio-aires.png"
              alt="Instituto Federal Sul-rio-grandense - Câmpus Venâncio Aires - 15 anos"
              width={470}
              height={143}
              className="h-14 w-auto"
            />
          </a>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Instituto Federal Sul-rio-grandense — Câmpus Venâncio Aires.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Desenvolvido por Geovane Griesang</p>
        </div>
      </div>
    </footer>
  );
}
