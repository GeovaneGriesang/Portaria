export interface Servidor {
  nome: string;
  siape?: string;
  cargo?: string;
}

export type TipoPortaria =
  | "comissao"
  | "grupo_trabalho"
  | "nucleo"
  | "designacao"
  | "exoneracao"
  | "nomeacao"
  | "gratificacao"
  | "cessao"
  | "afastamento"
  | "licenca"
  | "diaria"
  | "rsc"
  | "outros";

export interface Portaria {
  id: string;
  numero: string;
  ano: number;
  mes: number;
  arquivo: string;
  unidade: string;
  tipos: TipoPortaria[];
  ementa?: string;
  servidores: Servidor[];
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
}

export const TIPO_LABELS: Record<TipoPortaria, string> = {
  comissao: "Comissão",
  grupo_trabalho: "Grupo de trabalho",
  nucleo: "Núcleo",
  designacao: "Designação",
  exoneracao: "Exoneração",
  nomeacao: "Nomeação",
  gratificacao: "Gratificação / função (CD-FG)",
  cessao: "Cessão",
  afastamento: "Afastamento",
  licenca: "Licença",
  diaria: "Diária",
  rsc: "RSC",
  outros: "Outros",
};

// Reitoria + 14 câmpus oficiais do IFSul (www.ifsul.edu.br/instituto).
export const UNIDADES = [
  "Reitoria",
  "Câmpus Bagé",
  "Câmpus Camaquã",
  "Câmpus Charqueadas",
  "Câmpus Gravataí",
  "Câmpus Lajeado",
  "Câmpus Passo Fundo",
  "Câmpus Pelotas",
  "Câmpus Pelotas - Visconde da Graça",
  "Câmpus Sapiranga",
  "Câmpus Sapucaia do Sul",
  "Câmpus Santana do Livramento",
  "Câmpus Venâncio Aires",
  "Câmpus Avançado Jaguarão",
  "Câmpus Avançado Novo Hamburgo",
] as const;
