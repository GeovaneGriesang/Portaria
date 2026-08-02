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
  | "abono_permanencia"
  | "aceleracao_promocao"
  | "progressao"
  | "pensao"
  | "remocao"
  | "substituicao"
  | "cancelamento"
  | "retificacao"
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
  exoneracao: "Exoneração / dispensa",
  nomeacao: "Nomeação",
  gratificacao: "Gratificação / função (CD-FG)",
  cessao: "Cessão",
  afastamento: "Afastamento",
  licenca: "Licença",
  diaria: "Diária",
  rsc: "RSC",
  abono_permanencia: "Abono de permanência",
  aceleracao_promocao: "Aceleração da promoção",
  progressao: "Progressão / promoção por titulação",
  pensao: "Pensão civil",
  remocao: "Remoção / redistribuição",
  substituicao: "Substituição em portaria anterior",
  cancelamento: "Cancelamento de ato anterior",
  retificacao: "Retificação",
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
