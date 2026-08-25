import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "portarias");

/**
 * Lê todos os `<ano>.texto.json` (id → texto integral do corpo operativo,
 * gerado por `scripts/ingest_portarias.py`) e devolve um único mapa. Só deve
 * ser chamado quando a busca por conteúdo é de fato usada — ao contrário de
 * `getPortarias()`, aqui os arquivos somam dezenas de MB.
 */
export function getTextosPortarias(dir: string = DATA_DIR): Map<string, string> {
  const textos = new Map<string, string>();
  if (!fs.existsSync(dir)) return textos;

  const arquivos = fs.readdirSync(dir).filter((nome) => nome.endsWith(".texto.json"));
  for (const nome of arquivos) {
    const conteudo = fs.readFileSync(path.join(dir, nome), "utf-8");
    const porId = JSON.parse(conteudo) as Record<string, string>;
    for (const [id, texto] of Object.entries(porId)) textos.set(id, texto);
  }

  return textos;
}
