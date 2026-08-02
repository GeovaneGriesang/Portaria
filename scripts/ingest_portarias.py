# -*- coding: utf-8 -*-
"""Gera data/portarias/<ano>.json a partir dos PDFs ja separados em
public/portarias/<ano>/<mes> - <NomeDoMes>/*.pdf.

Uso:
    python scripts/ingest_portarias.py 2021
    python scripts/ingest_portarias.py 2021 --revisao   # tambem grava um
        relatorio de baixa confianca (data/portarias/<ano>.revisao.txt)

Extracao por melhor esforco, nao por leitura individual de cada PDF:
numero/data/serie vem do nome do arquivo (100% confiavel); tipo, servidor(es)
e unidade vem de expressoes regulares sobre o texto extraido via pypdf.
Cobertura esperada (validada em amostra de 2021): SIAPE explicito em ~3% dos
casos, campus explicito em ~64%, vigencia com data-fim explicita em ~1-2%
(a maioria das portarias de pessoal e um ato pontual, sem prazo).

Este script NAO deve ser tratado como fonte de verdade absoluta: revise a
amostra sinalizada no relatorio antes de publicar os dados.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_PORTARIAS = ROOT / "public" / "portarias"
DATA_PORTARIAS = ROOT / "data" / "portarias"

FILENAME_RE = re.compile(
    r"^(Portaria_de_pessoal|Portaria_IFSul|Portaria)_(\d+)_(\d{4})-(\d{2})-(\d{2})(?:_v(\d+))?\.pdf$",
    re.IGNORECASE,
)


def fuzzy(frase: str) -> str:
    """Constroi um padrao regex tolerante a um espaco extra inserido no meio
    de palavras — artefato comum do texto extraido destes PDFs (kerning do
    layout original), que atinge palavras aleatorias em qualquer parte do
    documento (ex.: "segue" vira "s egue", "servidores" vira "servid ores",
    "Codigo Verificador" vira "Codi go Ver i fi c a dor"). So `\\s*` entre
    caracteres literais fixos, sem grupos repetidos aninhados — nao sofre o
    catastrophic backtracking que motivou a reescrita do regex de nomes."""
    palavras_fuzzy = [r"\s*".join(re.escape(c) for c in palavra) for palavra in frase.split(" ")]
    return r"\s+".join(palavras_fuzzy)


# Fronteira do corpo operativo: comeca em "resolve:" e termina no rodape de
# assinatura eletronica do SUAP. "Documento assinado eletronicamente" e uma
# ancora textualmente estavel (o problema e so a insercao de espacos, coberta
# pelo fuzzy() acima).
INICIO_CORPO_RE = re.compile(fuzzy("resolve") + r"\s*:", re.IGNORECASE)
RODAPE_RE = re.compile(fuzzy("Documento assinado eletronicamente"), re.IGNORECASE)

TIPO_KEYWORDS: dict[str, list[str]] = {
    "comissao": [r"comiss[aã]o"],
    "grupo_trabalho": [r"grupo de trabalho"],
    "nucleo": [r"n[uú]cleo"],
    "rsc": [r"reconhecimento de saberes e compet[eê]ncias", r"\bRSC\b"],
    "gratificacao": [r"fun[cç][aã]o gratificada", r"\bFG-?\d", r"\bCD-?\d", r"cargo em comiss[aã]o"],
    "exoneracao": [r"\bexonerar\b", r"\bdispensar\b", r"\bexonera[cç][aã]o\b"],
    "nomeacao": [r"\bnomear\b", r"\bnomea[cç][aã]o\b"],
    "cessao": [r"\bcess[aã]o\b", r"\bceder\b"],
    "afastamento": [r"afastamento"],
    "licenca": [r"licen[cç]a"],
    "diaria": [r"di[aá]rias?\b"],
    "abono_permanencia": [r"abono de perman[eê]ncia"],
    "aceleracao_promocao": [r"acelera[cç][aã]o da promo[cç][aã]o"],
    "progressao": [r"progress[aã]o funcional", r"promo[cç][aã]o por titula[cç][aã]o"],
    "pensao": [r"pens[aã]o civil", r"pens[aã]o por morte"],
    "remocao": [r"\bremo[cç][aã]o\b", r"redistribui[cç][aã]o"],
    "substituicao": [r"\bsubstituir\b", r"substitui[cç][aã]o"],
    "cancelamento": [r"\bcancelar\b", r"cancelamento"],
    "retificacao": [r"\bretificar\b", r"retifica[cç][aã]o"],
    # designacao por ultimo: e o verbo mais generico, varios outros tipos
    # tambem "designam" (uma comissao, um GT etc.) entao nao deve suprimir
    # os demais — mantemos tudo em uma lista e uma portaria pode ter N tipos.
    "designacao": [r"\bdesignar\b", r"\bdesigna\b", r"designa[çc][ãa]o"],
}

SIAPE_RE = re.compile(r"SIAPE\s*n?[ºo°.]?\s*[:\-]?\s*(\d{5,7})", re.IGNORECASE)

CAMPUS_RE = re.compile(r"c[aâ]mpus\s+([A-ZÀ-Ú][\wÀ-ÿ\-\.]*(?:\s+[A-ZÀ-Üa-zà-ÿ\-\.]+){0,4})", re.IGNORECASE)

DATA_FIM_RE = re.compile(r"\bat[ée]\s+(\d{2}/\d{2}/\d{4})")
DATA_INICIO_EXPLICITA_RE = re.compile(
    r"a partir de\s+(\d{2}/\d{2}/\d{4})|com efeitos? (?:financeiros? )?a partir de\s+(\d{2}/\d{2}/\d{4})",
    re.IGNORECASE,
)

# Lista de nomes candidatos: captura apos "servidor(a)(s)/docente/discente/
# equipe formada por" ate um terminador tipico. Best-effort — nomes com
# hifen/apostrofo (D'Avila) e acentos sao aceitos; espacos duplos de
# artefatos do pdf sao tratados por parece_nome_valido (so exige que a
# PRIMEIRA palavra comece maiuscula, nao todas — um fragmento tipo "Pena
# lvade Farias" nao pode reprovar o nome inteiro por causa de um artefato
# de espacamento do pdf).
# "\bpara\b" generico (nao so "para exercer/desempenhar") cobre tanto "NOME
# para exercer a funcao..." quanto "NOME,para D III-01..." (sem espaco apos
# a virgula, outro artefato comum do layout).
# Janela limitada (nao aninhada) apos a ancora, pra evitar catastrophic
# backtracking que o regex anterior sofria quando o terminador nao aparecia.
_ANCORAS_NOME = [
    fuzzy(p) for p in ("servidoras", "servidores", "servidora", "servidor", "docente", "discente", "equipe formada por")
]
BLOCO_NOMES_RE = re.compile(
    r"(?:" + "|".join(_ANCORAS_NOME) + r")[,\s]+"
    r"(.{1,400}?)"
    r"(?=,?\s*(?:ocupante|matr[ií]cula|\bpara\b|do quadro|respectivamente|conforme|\.))",
    re.IGNORECASE | re.DOTALL,
)

# Gatilho de listas tabulares (ex.: "conforme segue:\nNOME DE PARA VIGENCIA\n
# Fulano de Tal\nI IV 03/12/2020"), onde nao ha um substantivo-ancora do tipo
# "servidor" antes de cada nome — sao vistos em portarias de progressao,
# aceleracao da promocao e incentivo a qualificacao com varios beneficiarios.
GATILHO_TABELA_RE = re.compile(
    fuzzy("conforme segue") + r"|" + fuzzy("abaixo relacionad") + r"\w*" + r"|" + fuzzy("quadro abaixo"),
    re.IGNORECASE,
)

HEADER_TABELA_PALAVRAS = {
    "nome", "de", "para", "vigencia", "relacao", "classe", "padrao", "nivel",
    "referencia", "%", "cargo", "unidade", "campus", "situacao",
    "segmento", "siape", "n", "no", "n.o", "matricula",
}
CODIGO_LINHA_RE = re.compile(r"^[\sIVX%\d/\.\-]+$")

PARTICULAS = {"de", "da", "do", "dos", "das", "e", "junior", "júnior", "neto", "filho", "j."}

# Descritores que aparecem ENTRE a ancora e o nome de verdade em construcoes
# como "ex-servidor falecido NOME" (pensao por morte) — removidos antes de
# validar o nome, senao "falecido" reprova o candidato inteiro.
DESCRITORES_LIDERANTES = {"falecido", "falecida", "aposentado", "aposentada", "exservidor", "ex-servidor"}

# Palavras de referencia documental ou de coluna de tabela que, capitalizadas,
# tem cara de nome mas nao sao — cortam a captura do prefixo antes de virar
# "Fulano da Portaria", "Fulano Direta" (coluna "Relacao") ou "Fulano TAE"
# (coluna "Segmento": as duas categorias de servidor do IFSul, TAE e Docente).
PALAVRAS_NAO_NOME = {
    "portaria", "processo", "lei", "decreto", "edital", "instrucao",
    "resolucao", "art", "artigo", "quadro", "banca", "comissao", "portarias",
    "direta", "indireta", "tae", "docente", "segmento", "siape",
}


def normalizar_espacos(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parece_nome_valido(candidato: str) -> bool:
    palavras = candidato.split()
    if len(palavras) < 2 or len(palavras) > 8:
        return False
    if any(ch.isdigit() for ch in candidato):
        return False
    return palavras[0][0].isalpha() and palavras[0][0].isupper()


def prefixo_nome_provavel(bloco: str) -> str | None:
    """Fallback quando o bloco capturado nao separa em fragmentos validos por
    virgula (ex.: terminador do BLOCO_NOMES_RE so bateu bem mais adiante,
    trazendo uma frase inteira junto) — pega so a sequencia inicial de
    palavras com cara de nome (maiusculas ou particulas), como
    extrai_nome_de_linha_tabela faz para linhas de tabela."""
    palavras = bloco.split()
    nome_palavras: list[str] = []
    for p in palavras:
        if any(ch.isdigit() for ch in p):
            break
        if remover_acentos(p).lower().rstrip(",.;:") in PALAVRAS_NAO_NOME:
            break
        if p.lower() not in PARTICULAS and not (p[0].isalpha() and p[0].isupper()):
            break
        nome_palavras.append(p)
    if 2 <= len(nome_palavras) <= 8:
        return " ".join(nome_palavras)
    return None


def dividir_lista_nomes(bloco: str) -> list[str]:
    """Divide um bloco de texto em nomes, parando no primeiro fragmento que
    nao parece nome (a lista de nomes e sempre contigua; uma vez que a lista
    acaba, o resto da frase nao deve ser tratado como mais um nome)."""
    bloco = normalizar_espacos(bloco)

    # Remove descritores antes do nome de verdade (ex.: "falecido NOME...").
    palavras_bloco = bloco.split()
    while palavras_bloco and remover_acentos(palavras_bloco[0]).lower().replace("-", "") in DESCRITORES_LIDERANTES:
        palavras_bloco.pop(0)
    bloco = " ".join(palavras_bloco)

    partes = re.split(r"\s*,\s*|\s+e\s+", bloco)
    nomes = []
    for parte in partes:
        parte = normalizar_espacos(parte)
        if not parte:
            continue
        if not parece_nome_valido(parte):
            break
        nomes.append(parte)

    # Nenhuma virgula separou nada (bloco inteiro virou 1 fragmento longo
    # demais, ex.: terminador so bateu no fim da frase) — tenta so o prefixo.
    if not nomes:
        prefixo = prefixo_nome_provavel(bloco)
        if prefixo:
            nomes.append(prefixo)

    return nomes


def eh_linha_cabecalho_tabela(linha: str) -> bool:
    palavras = [remover_acentos(p).lower().strip(".º°,;:") for p in linha.split()]
    return bool(palavras) and all(p in HEADER_TABELA_PALAVRAS for p in palavras)


def eh_linha_apenas_codigo(linha: str) -> bool:
    linha = linha.strip()
    return bool(linha) and bool(CODIGO_LINHA_RE.fullmatch(linha)) and any(ch.isdigit() for ch in linha)


# Quem assina a portaria aparece logo apos a tabela, no formato "Nome Completo
# \nCargo" (ex.: "Rodrigo Nascimento da Silva\nPro-reitor de Ensino"). Sem
# checar isso, o nome de quem assina vaza pra dentro da lista de
# beneficiarios da tabela. Cargos tipicos observados nas assinaturas do
# IFSul — se a linha SEGUINTE a um nome bate com um destes, o nome atual e a
# assinatura, nao um beneficiario, e a varredura da tabela para ali.
CARGO_ASSINATURA_RE = re.compile(
    r"^(reitor|reitora|vice[\s\-]?reitor|vice[\s\-]?reitora|pr[oó][\s\-]?reitor|pr[oó][\s\-]?reitora|"
    r"diretor|diretora|diretor[\s\-]geral|diretora[\s\-]geral|coordenador|coordenadora|chefe de gabinete)\b",
    re.IGNORECASE,
)


def extrair_nome_de_linha_tabela(linha: str) -> tuple[str, str | None] | None:
    """Extrai o nome no inicio da linha, parando no primeiro codigo de
    classe/padrao (numeral romano isolado), data ou percentual. Quando a
    linha e do formato "Nome Segmento SIAPE" (ex.: 2022 em diante), o token
    que causou a parada costuma ser o proprio numero do SIAPE — devolvido
    junto, ja que aqui a confianca e alta (um numero por linha, ao lado do
    nome, sem ambiguidade de quem e de quem)."""
    palavras = linha.split()
    nome_palavras: list[str] = []
    parou_em = len(palavras)
    for i, p in enumerate(palavras):
        if re.fullmatch(r"[IVX]{1,4}", p) or any(ch.isdigit() for ch in p) or p in {"%", "-"}:
            parou_em = i
            break
        if remover_acentos(p).lower().rstrip(",.;:") in PALAVRAS_NAO_NOME:
            parou_em = i
            break
        if p.lower() not in PARTICULAS and not (p[0].isalpha() and p[0].isupper()):
            parou_em = i
            break
        nome_palavras.append(p)

    if len(nome_palavras) < 2:
        return None

    # O SIAPE pode estar logo depois de onde o nome parou, mesmo que a parada
    # tenha sido por uma palavra de coluna (ex.: "TAE"/"Docente") antes dele —
    # ex.: "Natalia Dias TAE 1599919" para em "TAE", mas o SIAPE vem em seguida.
    siape = next((p for p in palavras[parou_em : parou_em + 2] if re.fullmatch(r"\d{5,7}", p)), None)
    return " ".join(nome_palavras), siape


def extrair_nomes_tabela(corpo: str) -> list[tuple[str, str | None]]:
    gatilho = GATILHO_TABELA_RE.search(corpo)
    if not gatilho:
        return []

    linhas = [l.strip() for l in corpo[gatilho.end() :].split("\n")]
    encontrados: list[tuple[str, str | None]] = []
    nomes_vistos: set[str] = set()
    for i, linha in enumerate(linhas):
        # linha vazia ou so pontuacao residual (ex.: ":" sobrando de "segue:")
        # nao conta como sinal de fim de tabela — so pula.
        if not linha or not any(ch.isalpha() for ch in linha):
            continue
        if eh_linha_cabecalho_tabela(linha) or eh_linha_apenas_codigo(linha):
            continue

        resultado = extrair_nome_de_linha_tabela(linha)
        if resultado is None:
            # Antes do primeiro nome valido, ainda pode ser so a continuacao
            # da frase que introduz a tabela (ex.: "...que,\nsob a
            # presidencia da primeira, constitui a Comissao..."); so trata
            # como fim da tabela depois de ja ter achado pelo menos 1 nome.
            if encontrados:
                break
            continue

        nome, siape = resultado

        # Quem assina a portaria aparece logo apos a tabela como "Nome\nCargo"
        # — se a PROXIMA linha com conteudo for um cargo de assinatura, este
        # nome e o signatario, nao um beneficiario: para aqui sem inclui-lo.
        proxima_com_conteudo = next((l for l in linhas[i + 1 :] if l), "")
        if CARGO_ASSINATURA_RE.search(remover_acentos(proxima_com_conteudo)):
            break

        if nome not in nomes_vistos:
            nomes_vistos.add(nome)
            encontrados.append((nome, siape))
    return encontrados


def corpo_operativo(texto: str) -> str:
    inicio = INICIO_CORPO_RE.search(texto)
    fim = RODAPE_RE.search(texto)
    if inicio and fim and fim.start() > inicio.end():
        return texto[inicio.end() : fim.start()]
    if inicio:
        return texto[inicio.end() :]
    return texto


def classificar_tipos(corpo: str) -> list[str]:
    tipos = [tipo for tipo, padroes in TIPO_KEYWORDS.items() if any(re.search(p, corpo, re.IGNORECASE) for p in padroes)]
    return tipos or ["outros"]


def extrair_unidade(corpo: str, unidades_canonicas: list[str]) -> tuple[str, bool]:
    """Retorna (unidade, baixa_confianca)."""
    m = CAMPUS_RE.search(corpo)
    if not m:
        return "Não especificado", False

    bruto = normalizar_espacos(m.group(1))
    # Sem espacos nos dois lados na hora de comparar: o mesmo artefato de
    # espaco-fantasma no meio de palavras que atinge nomes de servidor tambem
    # atinge nomes de campus (ex.: "Pelotas" vira "Pel otas"), e um "in"
    # simples nao bate mais com o nome canonico se isso acontecer.
    alvo = remover_acentos(bruto).lower().replace(" ", "")
    for unidade in unidades_canonicas:
        nome_unidade = remover_acentos(unidade.replace("Câmpus ", "").replace("Avançado ", "")).lower().replace(" ", "")
        if nome_unidade and nome_unidade in alvo:
            return unidade, False

    return f"Câmpus {bruto} (não conferido)", True


def remover_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def extrair_servidores(corpo: str) -> tuple[list[dict], bool]:
    """Percorre TODAS as ocorrencias de 'servidor(es)/docente/equipe' no
    corpo — uma portaria pode designar um titular e, na mesma frase ou em
    frase seguinte, uma lista de substitutos (ex.:
    Portaria_de_pessoal_0001_2021), e so olhar a primeira ocorrencia perderia
    esses nomes. Tambem tenta o padrao tabular ("conforme segue: NOME ...
    VIGENCIA ...") usado em portarias de progressao/incentivo com varios
    beneficiarios, que nao tem um substantivo-ancora antes de cada nome."""
    nomes: list[str] = []
    for m in BLOCO_NOMES_RE.finditer(corpo):
        for nome in dividir_lista_nomes(m.group(1)):
            if nome not in nomes:
                nomes.append(nome)

    # SIAPE por pessoa quando a propria linha da tabela traz o numero ao lado
    # do nome (formato usado a partir de 2022: "Nome Segmento SIAPE").
    siape_por_nome: dict[str, str] = {}
    for nome, siape in extrair_nomes_tabela(corpo):
        if nome not in nomes:
            nomes.append(nome)
        if siape:
            siape_por_nome[nome] = siape

    if not nomes:
        return [], True

    siapes_do_corpo = SIAPE_RE.findall(corpo)
    servidores = [{"nome": nome} for nome in nomes]
    if len(nomes) == 1 and len(siapes_do_corpo) == 1:
        servidores[0]["siape"] = siapes_do_corpo[0]
    for servidor in servidores:
        if servidor["nome"] in siape_por_nome:
            servidor["siape"] = siape_por_nome[servidor["nome"]]

    baixa_confianca = any(len(w) <= 2 and w.lower() not in PARTICULAS for nome in nomes for w in nome.split())
    return servidores, baixa_confianca


def extrair_ementa(corpo: str) -> str:
    m = re.search(r"Art\.?\s*1[ºo°.]?\s*(.{0,220})", corpo, re.IGNORECASE | re.DOTALL)
    if not m:
        return ""
    trecho = normalizar_espacos(m.group(1))
    ultimo_ponto = trecho.rfind(".")
    if ultimo_ponto > 40:
        trecho = trecho[: ultimo_ponto + 1]
    return trecho


def extrair_vigencia(corpo: str, data_assinatura: str) -> tuple[str, str | None]:
    m_inicio = DATA_INICIO_EXPLICITA_RE.search(corpo)
    data_inicio = data_assinatura
    if m_inicio:
        bruta = m_inicio.group(1) or m_inicio.group(2)
        data_inicio = data_br_para_iso(bruta)

    m_fim = DATA_FIM_RE.search(corpo)
    data_fim = data_br_para_iso(m_fim.group(1)) if m_fim else None

    return data_inicio, data_fim


def data_br_para_iso(data_br: str) -> str:
    dia, mes, ano = data_br.split("/")
    return f"{ano}-{mes}-{dia}"


def processar_arquivo(caminho: Path, unidades_canonicas: list[str]) -> dict | None:
    m = FILENAME_RE.match(caminho.name)
    if not m:
        print(f"AVISO: nome fora do padrao, ignorado: {caminho.name}", file=sys.stderr)
        return None

    prefixo, numero, ano, mes, dia, versao = m.groups()
    versao_num = int(versao) if versao else 1
    data_assinatura_iso = f"{ano}-{mes}-{dia}"

    reader = PdfReader(str(caminho))
    texto = "\n".join(p.extract_text() or "" for p in reader.pages)
    corpo = corpo_operativo(texto)

    tipos = classificar_tipos(corpo)
    unidade, unidade_baixa_confianca = extrair_unidade(corpo, unidades_canonicas)
    servidores, servidores_baixa_confianca = extrair_servidores(corpo)
    ementa = extrair_ementa(corpo)
    data_inicio, data_fim = extrair_vigencia(corpo, data_assinatura_iso)

    # A partir de 2022 a serie "de pessoal" passou a ser nomeada so
    # "Portaria_NNNN_..." (sem o "_de_pessoal"), mantendo o mesmo teor —
    # so "Portaria_IFSul" continua sendo a serie institucional separada.
    serie = "ifsul" if prefixo.lower() == "portaria_ifsul" else "pessoal"
    relativo = caminho.relative_to(PUBLIC_PORTARIAS.parent).as_posix()

    entrada = {
        "id": f"{ano}-{serie}-{numero}",
        "numero": f"{numero}/{ano}",
        "ano": int(ano),
        "mes": int(mes),
        "arquivo": relativo,
        "unidade": unidade,
        "tipos": tipos,
        "ementa": ementa,
        "servidores": servidores,
        "dataInicio": data_inicio,
        "dataFim": data_fim,
    }

    baixa_confianca = unidade_baixa_confianca or servidores_baixa_confianca or tipos == ["outros"] or not servidores
    return {"entrada": entrada, "baixa_confianca": baixa_confianca, "motivo_revisao": [], "versao": versao_num}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ano", type=int)
    parser.add_argument("--revisao", action="store_true", help="grava relatorio de entradas de baixa confianca")
    args = parser.parse_args()

    origem = PUBLIC_PORTARIAS / str(args.ano)
    if not origem.exists():
        print(f"ERRO: {origem} nao existe", file=sys.stderr)
        sys.exit(1)

    unidades_canonicas = [
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
    ]

    arquivos = sorted(origem.rglob("*.pdf"))
    print(f"Processando {len(arquivos)} arquivos de {args.ano}...", file=sys.stderr)

    # Algumas portarias sao reemitidas com sufixo "_vN" no nome do arquivo
    # (mesma serie/numero/ano, PDF corrigido). Mantemos so a versao mais
    # alta por id — a reemissao substitui a original, nao coexiste com ela.
    por_id: dict[str, dict] = {}
    baixa_confianca_por_id: dict[str, bool] = {}
    nome_arquivo_por_id: dict[str, str] = {}
    for i, caminho in enumerate(arquivos):
        resultado = processar_arquivo(caminho, unidades_canonicas)
        if resultado is None:
            continue
        entrada = resultado["entrada"]
        id_ = entrada["id"]
        existente = por_id.get(id_)
        if existente is None or resultado["versao"] >= existente["versao"]:
            por_id[id_] = resultado
            baixa_confianca_por_id[id_] = resultado["baixa_confianca"]
            nome_arquivo_por_id[id_] = caminho.name
        if i % 500 == 0:
            print(f"  ...{i}/{len(arquivos)}", file=sys.stderr)

    resultados = [r["entrada"] for r in por_id.values()]
    baixa_confianca_lista = [nome_arquivo_por_id[id_] for id_, sinalizada in baixa_confianca_por_id.items() if sinalizada]

    DATA_PORTARIAS.mkdir(parents=True, exist_ok=True)
    destino = DATA_PORTARIAS / f"{args.ano}.json"
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    print(f"\nGravado {destino} com {len(resultados)} portarias.", file=sys.stderr)
    print(
        f"Sinalizadas para revisao (unidade/servidor de baixa confianca ou tipo=outros): "
        f"{len(baixa_confianca_lista)} ({100*len(baixa_confianca_lista)/len(resultados):.1f}%)",
        file=sys.stderr,
    )

    if args.revisao:
        relatorio = DATA_PORTARIAS / f"{args.ano}.revisao.txt"
        with open(relatorio, "w", encoding="utf-8") as f:
            f.write("\n".join(baixa_confianca_lista))
        print(f"Relatorio de revisao gravado em {relatorio}", file=sys.stderr)


if __name__ == "__main__":
    main()
