const COMBINING_DIACRITICS_RANGE_START = 0x0300;
const COMBINING_DIACRITICS_RANGE_END = 0x036f;

function isCombiningDiacritic(codePoint: number): boolean {
  return codePoint >= COMBINING_DIACRITICS_RANGE_START && codePoint <= COMBINING_DIACRITICS_RANGE_END;
}

/** Remove acentos e caixa para permitir busca por nome tolerante a "Joao"/"João". */
export function normalizar(texto: string): string {
  const semAcento = Array.from(texto.normalize("NFD"))
    .filter((char) => !isCombiningDiacritic(char.codePointAt(0)!))
    .join("");
  return semAcento.toLowerCase().trim();
}
