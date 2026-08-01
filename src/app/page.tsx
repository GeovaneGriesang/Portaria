import { PortariasExplorer } from "@/components/portarias/PortariasExplorer";
import { getPortarias } from "@/lib/portarias";

export default function HomePage() {
  const portarias = getPortarias();

  return <PortariasExplorer portarias={portarias} />;
}
