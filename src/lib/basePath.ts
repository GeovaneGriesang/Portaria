const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Arquivos estáticos em /public (os PDFs das portarias) não passam pelo
 * roteador do Next, então não recebem o basePath automaticamente como
 * next/link e next/image recebem — precisamos prefixar manualmente para o
 * link funcionar quando o app roda sob um subpath (ex.: /portaria em produção).
 */
export function assetUrl(caminhoRelativo: string): string {
  const normalizado = caminhoRelativo.startsWith("/") ? caminhoRelativo : `/${caminhoRelativo}`;
  return `${BASE_PATH}${normalizado}`;
}
