import Link from "next/link";
import { InstitutoFederalMark } from "./InstitutoFederalMark";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <InstitutoFederalMark size={32} />
          <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Portarias IFSul
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
