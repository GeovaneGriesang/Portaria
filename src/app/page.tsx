import { periodoCobertura } from "@/lib/cobertura";
import { calcularEstatisticas } from "@/lib/estatisticas";
import { getPortarias } from "@/lib/portarias";
import { construirNumerosRevogados } from "@/lib/status";
import { PortariasExplorer } from "@/components/portarias/PortariasExplorer";

export default function HomePage() {
  const portarias = getPortarias();
  const estatisticasIniciais = calcularEstatisticas(portarias, construirNumerosRevogados(portarias));
  const periodoInicial = periodoCobertura(portarias);

  return <PortariasExplorer estatisticasIniciais={estatisticasIniciais} periodoInicial={periodoInicial} />;
}
