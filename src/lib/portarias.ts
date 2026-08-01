import fs from "node:fs";
import path from "node:path";
import type { Portaria } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "portarias");

/**
 * Lê todos os `data/portarias/<ano>.json` (um arquivo por ano, ver plano do
 * projeto) e devolve a lista completa, ordenada da portaria mais recente
 * para a mais antiga. Sem cache entre requisições: o volume de dados é
 * pequeno o bastante (algumas centenas a poucos milhares de registros) para
 * que reler do disco a cada request seja imperceptível, e evita servir dados
 * desatualizados depois que eu atualizar um JSON via ingestão de boletim novo.
 */
export function getPortarias(): Portaria[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  const arquivos = fs.readdirSync(DATA_DIR).filter((nome) => nome.endsWith(".json"));

  const portarias = arquivos.flatMap((nome) => {
    const conteudo = fs.readFileSync(path.join(DATA_DIR, nome), "utf-8");
    return JSON.parse(conteudo) as Portaria[];
  });

  return portarias.sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    if (a.mes !== b.mes) return b.mes - a.mes;
    return b.numero.localeCompare(a.numero, "pt-BR", { numeric: true });
  });
}
