export function ProgressBar() {
  return (
    <div
      role="progressbar"
      aria-label="Atualizando resultados"
      className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
    >
      <div className="h-full w-1/3 animate-[progress-slide_1s_ease-in-out_infinite] rounded-full bg-if-green" />
    </div>
  );
}
