interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  onIrParaPagina: (pagina: number) => void;
  disabled: boolean;
}

const BUTTON_CLASS =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function Pagination({ pagina, totalPaginas, total, onIrParaPagina, disabled }: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-400">
      <button
        type="button"
        onClick={() => onIrParaPagina(pagina - 1)}
        disabled={disabled || pagina <= 1}
        className={BUTTON_CLASS}
      >
        Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas} · {total} resultado{total === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={() => onIrParaPagina(pagina + 1)}
        disabled={disabled || pagina >= totalPaginas}
        className={BUTTON_CLASS}
      >
        Próxima
      </button>
    </div>
  );
}
