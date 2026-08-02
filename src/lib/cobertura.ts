import type { Portaria } from "./types";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export interface PeriodoCobertura {
  inicio: string;
  fim: string;
}

export function periodoCobertura(portarias: Portaria[]): PeriodoCobertura | null {
  const primeira = portarias[0];
  if (!primeira) return null;

  let min = primeira.ano * 12 + (primeira.mes - 1);
  let max = min;
  for (const portaria of portarias) {
    const chave = portaria.ano * 12 + (portaria.mes - 1);
    if (chave < min) min = chave;
    if (chave > max) max = chave;
  }

  const formatar = (chave: number) => `${MESES[chave % 12]}/${Math.floor(chave / 12)}`;
  return { inicio: formatar(min), fim: formatar(max) };
}
