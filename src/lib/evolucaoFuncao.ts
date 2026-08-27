import { normalizar } from "./normalize";
import { calcularDuracao, type Duracao } from "./status";
import type { Portaria, TipoPortaria } from "./types";

/** Tipos cuja portaria estabelece/renova o exercício de uma função. */
const TIPOS_QUE_DEFINEM_FUNCAO: TipoPortaria[] = ["designacao", "gratificacao", "nomeacao", "substituicao"];

/** Tipos cuja portaria encerra o exercício em curso (sem redesignação junto). */
const TIPOS_QUE_ENCERRAM_FUNCAO: TipoPortaria[] = ["exoneracao", "cancelamento"];

export interface IdentidadeServidor {
  siape?: string;
  nome: string;
}

export interface EntradaSequencia {
  portaria: Portaria;
  inicio: string;
  /** ISO; ausente quando a entrada está em andamento (sem sucessora, sem encerramento, sem dataFim). */
  fim?: string;
  emAndamento: boolean;
  duracao: Duracao;
  dias: number;
}

export interface Sequencia {
  entradas: EntradaSequencia[];
  encerradaPor?: Portaria;
  emAndamento: boolean;
  periodoTotal: { inicio: string; fim?: string };
  duracaoTotal: Duracao;
  diasTotal: number;
}

/**
 * Palavras que aparecem na ementa de quase qualquer designação/gratificação
 * (verbos-padrão, conectivos, jargão de abertura de tabela), sem relação com
 * qual função está sendo exercida — ignoradas na comparação de assunto para
 * não inflar a sobreposição entre ementas de funções diferentes.
 */
const PALAVRAS_IGNORADAS_EMENTA = new Set([
  "designar",
  "nomear",
  "exonerar",
  "dispensar",
  "substituir",
  "cancelar",
  "sob",
  "conforme",
  "segue",
  "abaixo",
  "relacionada",
  "relacionado",
  "relacionados",
  "relacionadas",
  "equipe",
  "grupo",
  "servidor",
  "servidora",
  "servidores",
  "servidoras",
  "primeiro",
  "primeira",
  "presidencia",
  "coordenacao",
  "responsabilidade",
  "constituir",
  "exercer",
  "funcao",
  "respectivamente",
  "campus",
  "como",
]);

function palavrasSignificativas(ementa: string): Set<string> {
  return new Set(
    normalizar(ementa)
      .split(/[^a-z0-9]+/)
      .filter((palavra) => palavra.length >= 4 && !/^\d+$/.test(palavra) && !PALAVRAS_IGNORADAS_EMENTA.has(palavra)),
  );
}

/**
 * Tipos de órgão/colegiado comuns nas ementas de designação. O nome do
 * curso/campus costuma ser um trecho longo e idêntico entre órgãos bem
 * diferentes do mesmo curso (ex.: "constituir o Colegiado do Curso Superior
 * de Tecnologia..." vs "constituir o Núcleo Docente Estruturante (NDE) do
 * curso...") — sozinha, a contagem de palavras em comum acha esse trecho
 * repetido e concluiria (errado) que são o mesmo assunto. Checar o tipo de
 * órgão primeiro evita essa falsa correspondência.
 */
const TIPOS_DE_ORGAO = ["colegiado", "nucleo docente estruturante", "comissao", "grupo de trabalho", "comite", "conselho"];

function tipoDeOrgao(ementa: string): string | undefined {
  const normalizada = normalizar(ementa);
  return TIPOS_DE_ORGAO.find((tipo) => normalizada.includes(tipo));
}

/**
 * Duas portarias do mesmo servidor/tipo tratam do mesmo assunto? Primeiro
 * checa o tipo de órgão citado na ementa (colegiado, núcleo docente
 * estruturante, comissão etc.) — tipos diferentes nunca são o mesmo
 * assunto, mesmo com outras palavras em comum. Sem esse sinal (ou com o
 * mesmo tipo dos dois lados), cai para a sobreposição de palavras
 * significativas das ementas. Sem ementa em algum dos dois lados não há
 * como comparar — não penaliza nesse caso, para não fragmentar sequências
 * só por falta de dado.
 */
function mesmoAssunto(ementaA?: string, ementaB?: string): boolean {
  if (!ementaA || !ementaB) return true;

  const orgaoA = tipoDeOrgao(ementaA);
  const orgaoB = tipoDeOrgao(ementaB);
  if (orgaoA && orgaoB && orgaoA !== orgaoB) return false;

  const palavrasA = palavrasSignificativas(ementaA);
  const palavrasB = palavrasSignificativas(ementaB);
  if (palavrasA.size === 0 || palavrasB.size === 0) return true;

  let comuns = 0;
  for (const palavra of palavrasA) if (palavrasB.has(palavra)) comuns += 1;
  return comuns >= 2;
}

function parseData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number) as [number, number, number];
  return new Date(ano, mes - 1, dia);
}

/** Conta dias entre duas datas ISO, incluindo o dia final (mesma convenção de `calcularDuracao`). */
function contarDias(inicioIso: string, fimIso?: string, hoje: Date = new Date()): number {
  const inicio = parseData(inicioIso);
  const fim = fimIso ? parseData(fimIso) : hoje;
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA) + 1;
}

/**
 * Reúne as portarias de um servidor específico (identidade exata — por
 * SIAPE quando disponível, senão nome normalizado exato; diferente do campo
 * `busca` da listagem geral, que casa por substring) restritas aos tipos
 * relevantes para a linha do tempo de função.
 */
export function identificarPortariasDoServidor(portarias: Portaria[], identidade: IdentidadeServidor): Portaria[] {
  const alvoNome = normalizar(identidade.nome);
  const tiposRelevantes = new Set([...TIPOS_QUE_DEFINEM_FUNCAO, ...TIPOS_QUE_ENCERRAM_FUNCAO]);

  return portarias.filter((portaria) => {
    const bateServidor = portaria.servidores.some((servidor) =>
      identidade.siape ? servidor.siape === identidade.siape : normalizar(servidor.nome) === alvoNome,
    );
    if (!bateServidor) return false;
    return portaria.tipos.some((tipo) => tiposRelevantes.has(tipo));
  });
}

interface SequenciaBruta {
  membros: Portaria[];
  encerradaPor?: Portaria;
}

/**
 * Agrupa portarias (já filtradas para um único servidor) em sequências de
 * exercício contínuo de função. Um servidor ativo costuma ter vários papéis
 * concorrentes/intercalados (ex.: coordena um colegiado E integra um núcleo
 * docente estruturante, com portarias de ambos intercaladas no tempo) — por
 * isso mantém-se uma lista de sequências ainda ABERTAS em paralelo, em vez
 * de uma só: cada portaria de tipo "que define função" entra na sequência
 * aberta cujo último membro tem o mesmo assunto (`mesmoAssunto`, via
 * ementa); se nenhuma bater, abre uma sequência nova. Uma portaria de tipo
 * "que encerra função" fecha a sequência aberta de mesmo assunto (ou, se só
 * houver uma aberta, fecha essa mesmo sem bater a ementa — ambíguo demais
 * pra travar sem fechar nada) e vira o marcador de encerramento dela (não
 * gera período próprio). Sequências que sobram abertas no fim da lista
 * ficam em andamento.
 */
export function construirSequencias(portariasDoServidor: Portaria[]): Sequencia[] {
  const ordenadas = [...portariasDoServidor].sort((a, b) => {
    const porData = a.dataInicio.localeCompare(b.dataInicio);
    if (porData !== 0) return porData;
    return a.numero.localeCompare(b.numero, "pt-BR", { numeric: true });
  });

  const abertas: SequenciaBruta[] = [];
  const fechadas: SequenciaBruta[] = [];

  for (const portaria of ordenadas) {
    const definidora = portaria.tipos.some((tipo) => TIPOS_QUE_DEFINEM_FUNCAO.includes(tipo));
    const encerra = portaria.tipos.some((tipo) => TIPOS_QUE_ENCERRAM_FUNCAO.includes(tipo));

    if (encerra) {
      const indice = escolherSequenciaParaFechar(abertas, portaria);
      if (indice !== -1) {
        const [sequencia] = abertas.splice(indice, 1);
        sequencia!.encerradaPor = portaria;
        fechadas.push(sequencia!);
      }
      continue;
    }

    if (!definidora) continue;

    const alvo = abertas.find((sequencia) => {
      const ultimaEntrada = sequencia.membros[sequencia.membros.length - 1]!;
      return mesmoAssunto(ultimaEntrada.ementa, portaria.ementa);
    });

    if (alvo) {
      alvo.membros.push(portaria);
    } else {
      abertas.push({ membros: [portaria], encerradaPor: undefined });
    }
  }

  return [...fechadas, ...abertas]
    .map(calcularResumoSequencia)
    .sort((a, b) => a.periodoTotal.inicio.localeCompare(b.periodoTotal.inicio));
}

/** -1 quando não há o que fechar (nenhuma sequência aberta). */
function escolherSequenciaParaFechar(abertas: SequenciaBruta[], portariaDeEncerramento: Portaria): number {
  if (abertas.length === 0) return -1;
  if (abertas.length === 1) return 0;

  return abertas.findIndex((sequencia) => {
    const ultimaEntrada = sequencia.membros[sequencia.membros.length - 1]!;
    return mesmoAssunto(ultimaEntrada.ementa, portariaDeEncerramento.ementa);
  });
}

function calcularResumoSequencia({ membros, encerradaPor }: SequenciaBruta): Sequencia {
  const entradas: EntradaSequencia[] = membros.map((portaria, indice) => {
    const proxima = membros[indice + 1];
    // `?? portaria.dataFim` sozinho não basta: no JSON gerado pela ingestão
    // uma portaria sem data de fim tem `dataFim: null` explícito (não
    // ausente) — `??` não normaliza o ÚLTIMO elo da cadeia, então esse
    // `null` vazaria para `fim` e quebraria `formatarDataBr` no componente
    // (`null.split(...)`). O `?? undefined` final converte esse null.
    const fim = proxima?.dataInicio ?? encerradaPor?.dataInicio ?? portaria.dataFim ?? undefined;
    const emAndamento = fim === undefined;

    return {
      portaria,
      inicio: portaria.dataInicio,
      fim,
      emAndamento,
      duracao: calcularDuracao(portaria.dataInicio, fim),
      dias: contarDias(portaria.dataInicio, fim),
    };
  });

  const primeira = entradas[0]!;
  const ultima = entradas[entradas.length - 1]!;

  return {
    entradas,
    encerradaPor,
    emAndamento: ultima.emAndamento,
    periodoTotal: { inicio: primeira.inicio, fim: ultima.fim },
    duracaoTotal: calcularDuracao(primeira.inicio, ultima.fim),
    diasTotal: contarDias(primeira.inicio, ultima.fim),
  };
}
