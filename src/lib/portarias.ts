import fs from "node:fs";
import path from "node:path";
import type { Portaria } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "portarias");

/**
 * Lê todos os `<dir>/<ano>.json` (um arquivo por ano) e devolve a lista
 * completa, ordenada da portaria mais recente para a mais antiga. Sem cache
 * entre requisições: para o volume real observado (alguns milhares de
 * registros por ano), reler do disco a cada request ainda é imperceptível, e
 * evita servir dados desatualizados depois que eu atualizar um JSON via
 * ingestão de boletim novo.
 *
 * O parâmetro `dir` existe para que os testes apontem para fixtures isoladas
 * (tests/fixtures/portarias) em vez dos dados reais em data/portarias.
 */
export function getPortarias(dir: string = DATA_DIR): Portaria[] {
  if (!fs.existsSync(dir)) return [];

  const arquivos = fs.readdirSync(dir).filter((nome) => nome.endsWith(".json") && !nome.endsWith(".texto.json"));

  const portarias = arquivos.flatMap((nome) => {
    const conteudo = fs.readFileSync(path.join(dir, nome), "utf-8");
    return JSON.parse(conteudo) as Portaria[];
  });

  return portarias.sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    if (a.mes !== b.mes) return b.mes - a.mes;
    return b.numero.localeCompare(a.numero, "pt-BR", { numeric: true });
  });
}
