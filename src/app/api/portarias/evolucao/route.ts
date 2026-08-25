import { NextResponse, type NextRequest } from "next/server";
import { construirSequencias, identificarPortariasDoServidor, type Sequencia } from "@/lib/evolucaoFuncao";
import { getPortarias } from "@/lib/portarias";

export interface RespostaEvolucao {
  servidor: { nome: string; siape?: string };
  sequencias: Sequencia[];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nome = params.get("nome") ?? "";
  const siape = params.get("siape") ?? undefined;

  if (!nome.trim()) {
    return NextResponse.json({ erro: "Parâmetro 'nome' é obrigatório." }, { status: 400 });
  }

  const portariasDoServidor = identificarPortariasDoServidor(getPortarias(), { nome, siape });
  const sequencias = construirSequencias(portariasDoServidor);

  const resposta: RespostaEvolucao = { servidor: { nome, siape }, sequencias };
  return NextResponse.json(resposta);
}
