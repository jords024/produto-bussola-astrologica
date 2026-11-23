import re
import asyncio
import logging
from pathlib import Path
from openai import AsyncOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

def get_client() -> AsyncOpenAI:
    load_dotenv(override=True)
    api_k = os.getenv("OPENAI_API_KEY")
    return AsyncOpenAI(api_key=api_k or "sk-dummy-key-for-test-environments")


client = get_client()


def calcular_custo_openai(model_name: str, prompt_tokens: int, completion_tokens: int) -> dict:
    """Calcula o custo exato em USD e BRL de acordo com o consumo real de tokens e tabela do modelo."""
    from services.ai_model_config_service import get_model_pricing_per_million

    in_per_m, out_per_m = get_model_pricing_per_million(model_name)
    rate_in = in_per_m / 1_000_000
    rate_out = out_per_m / 1_000_000

    cost_usd = (prompt_tokens * rate_in) + (completion_tokens * rate_out)
    cost_brl = cost_usd * 5.60
    return {
        "model": model_name,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "cost_usd": round(cost_usd, 6),
        "cost_brl": round(cost_brl, 4),
        "cost_usd_formatted": f"${cost_usd:.4f}",
        "cost_brl_formatted": f"R$ {cost_brl:.3f}",
    }

SECTION_KEYS = [
    "portal",
    "essencia",
    "ferida_e_dom",
    "dons_esquecidos",
    "luz_e_sombra",
    "reencontro",
    "rituais",
    "afirmagias",
]

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "mapa_mestre.txt"


def _load_master_prompt() -> str:
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"Arquivo de prompt não encontrado: {_PROMPT_PATH}\n"
            "Coloque o arquivo 'mapa_mestre.txt' na pasta 'backend/prompts/'."
        )
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _build_prompt(chart_data: dict, form_answers: dict, focus_areas: list, name: str) -> str:
    master = _load_master_prompt()

    cd = chart_data
    fa = form_answers

    sun = cd.get("sun", {})
    moon = cd.get("moon", {})
    rising = cd.get("rising", {})
    mercury = cd.get("mercury", {})
    venus = cd.get("venus", {})
    mars = cd.get("mars", {})
    jupiter = cd.get("jupiter", {})
    saturn = cd.get("saturn", {})
    chiron = cd.get("chiron", {})
    pluto = cd.get("pluto", {})
    lilith = cd.get("lilith", {})
    north_node = cd.get("north_node", {})
    south_node = cd.get("south_node", {})
    mc = cd.get("mc", {})
    elements = cd.get("elements", {})

    focus_str = ", ".join(focus_areas) if focus_areas else "não especificadas"

    prompt = f"""{master}

---

AGORA GERE O MAPA COMPLETO COM ESSES DADOS:

CLIENTE:
- Nome: {name}
- Áreas de foco: {focus_str}

RESPOSTAS DO FORMULÁRIO:
1. O que está acontecendo na sua vida agora?
   "{fa.get('vida_agora', '')}"
2. Se você pudesse mudar uma coisa na sua vida hoje, o que seria?
   "{fa.get('carrega_tempo', '')}"
3. O que você espera descobrir através do seu Mapa Astral?
   "{fa.get('espera_descobrir', '')}"

DADOS ASTROLÓGICOS:
- Sol: {sun.get('sign', '')} na Casa {sun.get('house', '')}
- Lua: {moon.get('sign', '')} na Casa {moon.get('house', '')}
- Ascendente: {rising.get('sign', '')}
- Mercúrio: {mercury.get('sign', '')} na Casa {mercury.get('house', '')} | Retrógrado: {mercury.get('retrograde', False)}
- Vênus: {venus.get('sign', '')} na Casa {venus.get('house', '')}
- Marte: {mars.get('sign', '')} na Casa {mars.get('house', '')}
- Júpiter: {jupiter.get('sign', '')} na Casa {jupiter.get('house', '')}
- Saturno: {saturn.get('sign', '')} na Casa {saturn.get('house', '')} | Retrógrado: {saturn.get('retrograde', False)}
- Quíron: {chiron.get('sign', '')} na Casa {chiron.get('house', '')}
- Plutão: {pluto.get('sign', '')} na Casa {pluto.get('house', '')} | Retrógrado: {pluto.get('retrograde', False)}
- Lilith: {lilith.get('sign', '')} na Casa {lilith.get('house', '')}
- Nodo Norte: {north_node.get('sign', '')} na Casa {north_node.get('house', '')}
- Nodo Sul: {south_node.get('sign', '')}
- Meio do Céu: {mc.get('sign', '')}
- Fase Lunar: {cd.get('lunar_phase', '')}
- Elementos: Fogo {elements.get('fire', 0)}% | Terra {elements.get('earth', 0)}% | Ar {elements.get('air', 0)}% | Água {elements.get('water', 0)}%

INSTRUÇÃO DE FORMATO:
Gere cada seção separada por este marcador exato:
===SECAO: nome_da_secao===

Use exatamente estes nomes nessa ordem:
portal
essencia
ferida_e_dom
dons_esquecidos
luz_e_sombra
reencontro
rituais
afirmagias

Mapeamento das seções com os portais do prompt mestre:
- portal        → Introdução (Carta Sagrada)
- essencia      → Primeiro Portal (A Tríade Sagrada: Sol, Lua, Ascendente)
- ferida_e_dom  → Segundo Portal (A Ferida que É Porta: Quíron, Nodos)
- dons_esquecidos → Terceiro Portal (Os Dons Esquecidos: Vênus, Marte, Júpiter)
- luz_e_sombra  → Quarto Portal (As Sombras que Ensinam: Plutão, Lilith)
- reencontro    → Quinto Portal (O Chamado: síntese e próximo passo)
- rituais       → Rituais de Integração (siga as instruções completas do prompt)
- afirmagias    → Afirmagias (siga as instruções completas do prompt — cada afirmagia com origem em itálico)"""

    return prompt


def _parse_sections(raw: str) -> dict:
    sections = {}
    pattern = r"===SECAO:\s*(\w+)===(.*?)(?====SECAO:|\Z)"
    matches = re.findall(pattern, raw, re.DOTALL)
    for key, content in matches:
        key = key.strip()
        content = content.strip()
        if key in SECTION_KEYS:
            sections[key] = content
        else:
            logger.warning(f"Seção desconhecida ignorada: '{key}'")

    for key in SECTION_KEYS:
        if key not in sections or not sections[key]:
            logger.warning(f"Seção '{key}' veio vazia ou ausente no retorno da IA")
            sections.setdefault(key, "")

    return sections


_SYSTEM_PROMPT = (
    "Você é Crassus Gobbi, astrólogo e estrategista brasileiro, especialista em leitura da Bússola Astrológica "
    "e orientação de vida de alta precisão. Escreva sempre em português brasileiro, com clareza tática, "
    "profundidade e linguagem direta e acolhedora."
)


async def generate_sections(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
    return_cost: bool = False,
):
    """
    Gera as 8 seções completas do mapa astral via OpenAI.
    """
    prompt = _build_prompt(chart_data, form_answers, focus_areas, name)

    _MODELS = ["gpt-4o", "gpt-4o-mini"]
    last_exc = None
    response = None
    chosen_model = "gpt-4o"

    c = get_client()
    for model_name in _MODELS:
        try:
            logger.info("🤖 Gerando seções do mapa com modelo '%s'", model_name)
            response = await c.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_completion_tokens=8192,
                temperature=0.85,
            )
            chosen_model = model_name
            break
        except Exception as exc:
            logger.warning("Modelo '%s' falhou para geração de seções: %s", model_name, exc)
            last_exc = exc
    else:
        raise RuntimeError(f"Falha ao gerar seções em todos os modelos: {last_exc}") from last_exc

    raw_text = response.choices[0].message.content or ""
    sections = _parse_sections(raw_text)

    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0
    custo_info = calcular_custo_openai(chosen_model, prompt_tokens, completion_tokens)

    logger.info(
        "Seções geradas para '%s': %s | Custo OpenAI: %s (%s) | Tokens: %d",
        name, list(sections.keys()), custo_info["cost_usd_formatted"],
        custo_info["cost_brl_formatted"], custo_info["total_tokens"]
    )
    if return_cost:
        return sections, custo_info
    return sections


def _build_partial_prompt(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
    existing_sections: dict,
    missing_keys: list,
) -> str:
    """
    Prompt para gerar APENAS as seções faltantes, usando o conteúdo já
    existente como contexto de coerência narrativa.
    """
    master = _load_master_prompt()

    cd = chart_data
    fa = form_answers

    sun           = cd.get("sun", {})
    moon          = cd.get("moon", {})
    rising        = cd.get("rising", {})
    mercury       = cd.get("mercury", {})
    venus         = cd.get("venus", {})
    mars          = cd.get("mars", {})
    jupiter       = cd.get("jupiter", {})
    saturn        = cd.get("saturn", {})
    chiron        = cd.get("chiron", {})
    pluto         = cd.get("pluto", {})
    lilith        = cd.get("lilith", {})
    north_node    = cd.get("north_node", {})
    south_node    = cd.get("south_node", {})
    mc            = cd.get("mc", {})
    elements      = cd.get("elements", {})

    focus_str = ", ".join(focus_areas) if focus_areas else "não especificadas"

    # Resumo do mapa já gerado (até 800 caracteres por seção)
    section_labels = {
        "portal":          "Portal — Introdução",
        "essencia":        "Essência (Portal I)",
        "ferida_e_dom":    "A Ferida e o Dom (Portal II)",
        "dons_esquecidos": "Dons Esquecidos (Portal III)",
        "luz_e_sombra":    "Luz e Sombra (Portal IV)",
        "reencontro":      "O Reencontro (Portal V)",
    }
    context_parts = []
    for key in ["portal","essencia","ferida_e_dom","dons_esquecidos","luz_e_sombra","reencontro"]:
        content = existing_sections.get(key, "").strip()
        if content:
            label = section_labels.get(key, key)
            context_parts.append(f"--- {label} ---\n{content[:800]}")
    context_str = "\n\n".join(context_parts) or "(Sem seções anteriores disponíveis)"

    missing_human = {
        "rituais":    "rituais       → Rituais de Integração (Portal VI — siga as instruções do prompt mestre)",
        "afirmagias": "afirmagias    → Afirmagias (Portal VII — cada afirmagia com origem em itálico)",
    }
    missing_str         = "\n".join(missing_human.get(k, k) for k in missing_keys)
    section_names_str   = "\n".join(missing_keys)

    return f"""{master}

---

CONTEXTO — SEÇÕES JÁ GERADAS PARA ESTA CLIENTE:
{context_str}

---

COMPLETE O MAPA GERANDO APENAS AS SEÇÕES FALTANTES:

CLIENTE:
- Nome: {name}
- Áreas de foco: {focus_str}

RESPOSTAS DO FORMULÁRIO:
1. O que está acontecendo na sua vida agora?
   "{fa.get('vida_agora', '')}"
2. Se você pudesse mudar uma coisa na sua vida hoje, o que seria?
   "{fa.get('carrega_tempo', '')}"
3. O que você espera descobrir através do seu Mapa Astral?
   "{fa.get('espera_descobrir', '')}"

DADOS ASTROLÓGICOS:
- Sol: {sun.get('sign', '')} na Casa {sun.get('house', '')}
- Lua: {moon.get('sign', '')} na Casa {moon.get('house', '')}
- Ascendente: {rising.get('sign', '')}
- Mercúrio: {mercury.get('sign', '')} na Casa {mercury.get('house', '')} | Retrógrado: {mercury.get('retrograde', False)}
- Vênus: {venus.get('sign', '')} na Casa {venus.get('house', '')}
- Marte: {mars.get('sign', '')} na Casa {mars.get('house', '')}
- Júpiter: {jupiter.get('sign', '')} na Casa {jupiter.get('house', '')}
- Saturno: {saturn.get('sign', '')} na Casa {saturn.get('house', '')} | Retrógrado: {saturn.get('retrograde', False)}
- Quíron: {chiron.get('sign', '')} na Casa {chiron.get('house', '')}
- Plutão: {pluto.get('sign', '')} na Casa {pluto.get('house', '')} | Retrógrado: {pluto.get('retrograde', False)}
- Lilith: {lilith.get('sign', '')} na Casa {lilith.get('house', '')}
- Nodo Norte: {north_node.get('sign', '')} na Casa {north_node.get('house', '')}
- Nodo Sul: {south_node.get('sign', '')}
- Meio do Céu: {mc.get('sign', '')}
- Fase Lunar: {cd.get('lunar_phase', '')}
- Elementos: Fogo {elements.get('fire', 0)}% | Terra {elements.get('earth', 0)}% | Ar {elements.get('air', 0)}% | Água {elements.get('water', 0)}%

INSTRUÇÃO: Gere SOMENTE as seções listadas abaixo. Use as seções acima como contexto para criar
rituais e afirmações que sejam coerentes e contínuos com a leitura já realizada.

Seções a gerar:
{missing_str}

INSTRUÇÃO DE FORMATO — use o marcador exato abaixo para cada seção:
===SECAO: nome_da_secao===

Nomes das seções (exatamente assim):
{section_names_str}"""


async def generate_missing_sections(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
    existing_sections: dict,
    missing_keys: list,
) -> dict:
    """
    Gera apenas as seções faltantes (ex.: rituais, afirmagias) para um
    cliente antigo, usando o mapa já gerado como contexto.
    """
    prompt = _build_partial_prompt(
        chart_data, form_answers, focus_areas, name, existing_sections, missing_keys
    )

    _MODELS = ["gpt-4o", "gpt-4o-mini"]
    last_exc = None
    response = None

    for model_name in _MODELS:
        try:
            logger.info("🤖 Gerando seções faltantes com modelo '%s'", model_name)
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_completion_tokens=8192,
                temperature=0.85,
            )
            break
        except Exception as exc:
            logger.warning("Modelo '%s' falhou para seções faltantes: %s", model_name, exc)
            last_exc = exc
    else:
        raise RuntimeError(f"Falha ao gerar seções faltantes em todos os modelos: {last_exc}") from last_exc

    raw_text = response.choices[0].message.content or ""
    sections = _parse_sections(raw_text)
    logger.info(
        f"Seções complementares geradas para '{name}': "
        f"solicitadas={missing_keys} | recebidas={[k for k,v in sections.items() if v]}"
    )
    return sections


# =============================================================================
# SÍNTESE DIÁRIA DE TRÂNSITOS
#
# Separada da geração do mapa natal de propósito. São dois produtos: o natal
# responde "quem você é" e é entregue uma vez; a síntese responde "como está o
# seu dia" e é pedida quantas vezes a pessoa quiser, para qualquer data.
#
# Os cinco textos de posição NÃO são escritos aqui: vêm prontos de
# services/interpretacoes.py, que é material do Crassus. A IA só costura.
# =============================================================================

_PROMPT_TRANSITO = Path(__file__).parent.parent / "prompts" / "transito_diario.txt"

# =============================================================================
# O AUDITOR DA SINTESE
#
# Pedir bonito no prompt nao basta: o modelo concorda com as regras e quebra
# metade delas. A licao veio do quiz, onde a correcao que funcionou nao foi
# reescrever o prompt, foi conferir o texto em codigo e devolver os erros.
#
# Divide em duas classes, de proposito:
#   DURO  - erro que nao pode chegar no leitor (termo tecnico, nome na abertura)
#   ESTILO- erro que estraga o registro mas nao invalida (sem expressao popular)
#
# Erro duro manda refazer. Erro so de estilo tambem manda refazer UMA vez, mas
# se a segunda tentativa tambem falhar o texto escrito vale mais que um
# fallback enlatado - isso ja mordeu a gente uma vez.
# =============================================================================

_TERMOS_TECNICOS = (
    "trânsito", "transito", "retrógrado", "retrogrado", "mapa astral", "signo",
    "zodíaco", "ascendente", "conjunção", "quadratura", "trígono", "sextil",
    "oposição", "orbe", "efeméride", "casa 1", "casa 2", "casa 3", "casa 4",
    "casa 5", "casa 6", "casa 7", "casa 8", "casa 9", "casa 10", "casa 11",
    "casa 12", "mercúrio", "vênus", "marte", "júpiter", "saturno", "plutão",
    "áries", "touro", "gêmeos", "câncer", "leão", "virgem", "libra",
    "escorpião", "sagitário", "capricórnio", "aquário", "peixes",
)

_COACHES = (
    "a dica é", "sua melhor versão", "mindset", "desperte", "potencial",
    "vibre", "o universo", "lei da atração", "confie no processo",
    "permita-se", "ressignific", "dar nome ao", "abrace",
)

# Fechos vazios: terminam a leitura sem dizer o que fazer.
_FECHOS_VAZIOS = (
    "com clareza", "com sabedoria", "com confiança", "com calma", "com leveza",
    "mova-se", "siga em frente", "confie", "esteja presente", "respire",
)

# A ultima frase tem que mandar fazer alguma coisa. Um verbo no imperativo,
# concreto, que a pessoa execute hoje sem depender de ninguem. Sem isso a
# leitura termina em previsao, e previsao nao muda o dia de ninguem.
_VERBOS_ACAO = (
    "marque", "mande", "manda", "escreva", "escreve", "ligue", "liga", "peça",
    "pede", "abra", "abre", "feche", "fecha", "comece", "começa", "pare",
    "para de", "anote", "anota", "cobre", "diga", "fala", "pergunte",
    "pergunta", "resolva", "resolve", "agende", "agenda", "chame", "chama",
    "escolha", "escolhe", "decida", "decide", "avisa", "avise", "procura",
    "procure", "separe", "separa", "guarde", "guarda", "tire", "tira",
    "coloque", "coloca", "faça", "faz", "manda ver", "deixa", "deixe",
    "aproveite", "aproveita", "evite", "evita", "espere", "espera",
    "revise", "revisa", "corte", "corta", "ajuste", "ajusta", "organize",
    "organiza", "foque", "foca", "monte", "monta", "defina", "define",
    "teste", "testa", "apresente", "apresenta", "negocie", "negocia",
    "envie", "envia", "liste", "lista", "priorize", "prioriza", "assuma",
)

_EXPRESSOES = (
    "empurrando com a barriga", "empurrar com a barriga", "segurar a barra",
    "tiro no escuro", "chutar o balde", "virar a página", "fazer corpo mole",
    "dar um jeito", "aguentar o tranco", "em cima do muro", "pôr na mesa",
    "botar na mesa", "cair a ficha", "de bandeja", "na marra",
    "bola rolando", "deixar rolar", "abrir o jogo", "jogar limpo",
    "pingos nos is", "arregaçar as mangas", "meter a cara", "pisar no freio",
    "fazer vista grossa", "debaixo do tapete", "dar o braço a torcer",
    "de peito aberto", "sem rodeios", "cara a cara", "pôr para fora",
    "botar para fora", "tirar a limpo", "deixar para lá", "dar o primeiro passo",
    "bater o martelo", "colocar na ponta do lápis", "ponta do lápis", "dar a cara a tapa",
    "engolir sapo", "cortar o mal pela raiz", "jogo aberto", "cartas na mesa",
)


def _tirar_vocativo(texto: str, nome: str) -> str:
    """Remove o "Fulano," que abre o texto."""
    primeiro = (nome or "").strip().split(" ")[0]
    if not primeiro or not texto:
        return texto
    padrao = re.compile(rf"^\s*{re.escape(primeiro)}\s*,\s*", re.IGNORECASE)
    novo = padrao.sub("", texto, count=1)
    if novo != texto and novo:
        novo = novo[0].upper() + novo[1:]
    return novo


def auditar_sintese(texto: str, nome: str) -> tuple:
    """Devolve (erros_duros, erros_de_estilo). Listas vazias = texto aprovado."""
    duros, estilo = [], []
    if not texto or not texto.strip():
        return ["veio vazia"], []

    baixo = texto.lower()

    for termo in _TERMOS_TECNICOS:
        if re.search(rf"\b{re.escape(termo)}\b", baixo):
            duros.append(f"usou o termo técnico '{termo}' — a pessoa lê sobre a vida dela, não sobre o céu")
            break

    primeiro_nome = (nome or "").split(" ")[0].strip().lower()
    primeira_frase = re.split(r"[.!?]", baixo, 1)[0]
    if primeiro_nome and len(primeiro_nome) > 2 and primeiro_nome in primeira_frase:
        duros.append("colocou o nome da pessoa na primeira frase")
    if primeiro_nome and len(primeiro_nome) > 2 and baixo.count(primeiro_nome) > 2:
        duros.append("repetiu o nome da pessoa vezes demais")

    for c in _COACHES:
        if c in baixo:
            duros.append(f"usou linguagem de coach: '{c}'")
            break

    palavras = len(texto.split())
    if palavras < 160:
        duros.append(f"ficou rasa e curta demais ({palavras} palavras, escreva entre 220 e 420 palavras em 3 a 4 parágrafos profundos)")
    elif palavras > 550:
        duros.append(f"ficou longa demais ({palavras} palavras, o máximo é 480)")

    ultima = [f for f in re.split(r"(?<=[.!?])\s+", texto.strip()) if f.strip()]
    ultima = ultima[-1].lower() if ultima else ""
    if any(f in ultima for f in _FECHOS_VAZIOS):
        duros.append("terminou em frase vazia, sem dizer o que dá para fazer hoje")
    elif not any(v in ultima for v in _VERBOS_ACAO):
        estilo.append(
            "a última frase precisa terminar num verbo concreto de ação "
            "que a pessoa execute hoje sozinha (marque, mande, escreva, cobre, corte, pare de)"
        )

    if not any(e in baixo for e in _EXPRESSOES):
        estilo.append("não usou nenhuma expressão popular que brasileiro fala de verdade")
    if "—" in texto or "–" in texto:
        duros.append("usou traço ou travessão (— ou –) no texto: use vírgula ou ponto final no lugar")

    return duros, estilo


def _load_transit_prompt() -> str:
    if not _PROMPT_TRANSITO.exists():
        raise FileNotFoundError(f"Prompt de trânsito não encontrado: {_PROMPT_TRANSITO}")
    return _PROMPT_TRANSITO.read_text(encoding="utf-8")


def _formatar_data_curta(iso_str: str) -> str:
    try:
        a, m, d = str(iso_str).split("-")
        return f"{d}/{m}/{a}"
    except ValueError:
        return str(iso_str)


def _build_transit_prompt(
    nome: str,
    data_alvo: str,
    posicoes: list,
    textos: dict,
    contexto: dict | None = None,
    movimentos_periodo: list | None = None,
    perfil_usuario: dict | None = None,
) -> str:
    ctx = contexto or {}
    data_fim = ctx.get("data_fim")

    if data_fim:
        linhas = [
            f"NOME DA PESSOA: {nome}",
            f"MODALIDADE: PREVISÃO DE PERÍODO COMPLETO ({data_alvo} até {_formatar_data_curta(data_fim)})",
            "",
        ]
    else:
        linhas = [
            f"NOME DA PESSOA: {nome}",
            f"MODALIDADE: LEITURA PROFUNDA DO DIA ({data_alvo})",
            "",
        ]

    # Contexto de vida da pessoa cadastrado no perfil (para personalizar ainda mais)
    perf = perfil_usuario or {}
    dados_vida = [
        f"- Momento de vida relatado antes: \"{perf['vida_agora']}\"" if perf.get("vida_agora") else "",
        f"- O que ela carrega há tempo e quer mudar: \"{perf['carrega_tempo']}\"" if perf.get("carrega_tempo") else "",
        f"- O que ela busca descobrir: \"{perf['espera_descobrir']}\"" if perf.get("espera_descobrir") else "",
    ]
    dados_vida = [d for d in dados_vida if d]
    if dados_vida:
        linhas.append("======== QUEM É ESTA PESSOA (HISTÓRICO DE VIDA) ========")
        linhas.extend(dados_vida)
        linhas.append("")

    # A pergunta que a pessoa trouxe entra com prioridade total
    if ctx.get("pergunta") or ctx.get("area"):
        linhas.append("======== O QUE ESTÁ EM JOGO AGORA (PRIORIDADE MÁXIMA) ========")
        if ctx.get("area"):
            linhas.append(f"Área em foco escolhida por ela: {ctx['area']}")
        if ctx.get("pergunta"):
            linhas.append(f"Pergunta / Situação específica que ela escreveu: \"{ctx['pergunta']}\"")
        linhas.append(
            "ATENÇÃO: A leitura INTEIRA deve ser construída para responder a esta situação "
            "específica com profundidade cirúrgica. Fale diretamente do trabalho, negócio, "
            "decisão ou relação que ela mencionou, conectando com o que o mapa mostra abaixo."
        )
        linhas.append("")

    if data_fim and movimentos_periodo:
        linhas.append("======== MARCOS E VIRADAS CRONOLÓGICAS DESTE PERÍODO ========")
        linhas.append(
            "Use estas datas reais no 3º parágrafo para dar uma previsão concreta de quando "
            "cada mudança ou pico acontece dentro do período:"
        )
        for ev in movimentos_periodo:
            dt_fmt = _formatar_data_curta(ev.get("data", ""))[:5]
            if ev.get("tipo") == "mudanca_casa":
                linhas.append(
                    f"- Em {dt_fmt}: mudança de foco importante: sai de '{ev.get('area_anterior')}' "
                    f"e entra em '{ev.get('area_nova')}'."
                )
            else:
                linhas.append(
                    f"- Pico em {dt_fmt}: {ev.get('ponto_significa')} ({ev.get('faz')})."
                )
        linhas.append("")

    linhas.append("======== AS CINCO FORÇAS ATIVAS NO MAPA DELA ========")
    for p in posicoes:
        pl = p.get("planeta")
        texto = (textos or {}).get(pl, "")
        if not texto:
            continue
        cabecalho = f"--- {p.get('planeta_pt', pl)} ---"
        if p.get("destaque"):
            cabecalho += "  [O MAIS FORTE: fio condutor principal]"
        if p.get("responde_a_pergunta"):
            cabecalho += "  [MEXE DIRETO NA ÁREA ESCOLHIDA POR ELA]"
        linhas.append(cabecalho)
        linhas.append(texto)

        for a in (p.get("aspectos") or [])[:3]:
            quando = "no pico exato agora" if a.get("exato") else ("apertando nos próximos dias" if a.get("aplicando") else "já começando a afrouxar")
            linhas.append(
                f"(Toca ponto único do mapa de nascimento dela: {a['ponto_significa']} -> "
                f"{a['faz']}; status: {quando})"
            )
        if p.get("ate"):
            ate = p["ate"]
            try:
                a_y, m_m, d_d = str(ate).split("-")
                ate = f"{d_d}/{m_m}"
            except ValueError:
                pass
            linhas.append(f"(Janela: essa força fica ativa nessa área até {ate})")
        if p.get("retrogrado"):
            linhas.append("(Movimento de revisão: momento de corrigir rota, renegociar e lapidar o que já existe, não de dar tiro no escuro)")
        linhas.append("")

    linhas.append(
        "Escreva agora a entrega completa dividida estritamente com os delimitadores:\n"
        "=== SINTESE ===\n"
        "(3 a 4 parágrafos densos, populares e 100% personalizados para a vida e pergunta desta pessoa, sem termos técnicos de astrologia)\n\n"
        "=== CARTOES ===\n"
        "Para cada planeta ativo (Moon, Sun, Mercury, Venus, Mars), escreva de 2 a 3 frases cirúrgicas, táticas e 100% personalizadas que apliquem a energia daquele astro DIRETO no problema, reunião, negociação, cliente ou pergunta que a pessoa trouxe.\n"
        "SEJA MENOS POÉTICO E MUITO MAIS PRÁTICO: nada de astrologia contemplativa; conecte cada planeta aos elementos concretos da causa dela (ex: 'nessa reunião...', 'ao precificar essa oferta...', 'com clientes em dúvida...'), trazendo oportunidade tática e ação imediata:\n"
        "[Moon]\n...\n"
        "[Sun]\n...\n"
        "[Mercury]\n...\n"
        "[Venus]\n...\n"
        "[Mars]\n...\n"
    )
    return "\n".join(linhas)


def _remover_tracos(texto: str) -> str:
    """Remove traços e travessões de estilo (— ou – ou - isolado) substituindo por vírgula ou dois-pontos."""
    if not texto:
        return ""
    t = re.sub(r"\s*[—–]\s*", ", ", texto)
    t = re.sub(r"\s+-\s+", ", ", t)
    t = t.replace("—", ", ").replace("–", ", ")
    t = re.sub(r",\s*,+", ",", t)
    t = re.sub(r":\s*,+", ":", t)
    return t.strip()


def _parse_transit_output(raw_text: str) -> tuple[str, dict[str, str]]:
    """Extrai a síntese e os textos personalizados dos cartões individuais de forma robusta e sem traços."""
    if not raw_text:
        return "", {}

    raw_clean = raw_text.strip()
    cartoes: dict[str, str] = {}

    padroes_split = [
        r"(?:===|---|###|\*\*|\[)\s*CARTO[EẼ]S(?:_INDIVIDUAIS)?\s*(?:===|---|###|\*\*|\]|:)?",
        r"(?:===|---|###|\*\*|\[)\s*CART[OÕÓ]ES(?:_INDIVIDUAIS)?\s*(?:===|---|###|\*\*|\]|:)?",
        r"(?:===|---|###|\*\*|\[)\s*POSIC[OÕÓ]ES\s*(?:===|---|###|\*\*|\]|:)?",
        r"(?:^|\n)\s*CARTO[EẼ]S\s*:\s*(?:\n|$)",
        r"(?:^|\n)\s*CART[OÕÓ]ES\s*:\s*(?:\n|$)",
    ]

    partes = None
    for p in padroes_split:
        if re.search(p, raw_clean, re.IGNORECASE):
            partes = re.split(p, raw_clean, flags=re.IGNORECASE, maxsplit=1)
            break

    if not partes:
        m_start = re.search(r"(?:^|\n)\s*\[(?:Moon|Lua|Sun|Sol|Mercury|Mercúrio|Venus|Vênus|Mars|Marte)\]", raw_clean, re.IGNORECASE)
        if m_start:
            idx = m_start.start()
            partes = [raw_clean[:idx], raw_clean[idx:]]

    if partes and len(partes) == 2:
        bloco_sintese, bloco_cartoes = partes[0], partes[1]
    else:
        bloco_sintese, bloco_cartoes = raw_clean, ""

    bloco_sintese = re.sub(
        r"(?:===|---|###|\*\*|\[)?\s*S[ÍI]NTESE\s*(?:===|---|###|\*\*|\]|:)?",
        "",
        bloco_sintese,
        flags=re.IGNORECASE,
    ).strip()

    mapa_planetas = {
        "Moon": ["Moon", "Lua"],
        "Sun": ["Sun", "Sol"],
        "Mercury": ["Mercury", "Mercúrio", "Mercurio"],
        "Venus": ["Venus", "Vênus"],
        "Mars": ["Mars", "Marte"],
    }

    if bloco_cartoes:
        todos_aliases = []
        for aliases in mapa_planetas.values():
            todos_aliases.extend(aliases)
        pattern_next = "|".join(re.escape(a) for a in todos_aliases)

        for canonical, aliases in mapa_planetas.items():
            pattern_aliases = "|".join(re.escape(a) for a in aliases)
            padrao = rf"(?:\[(?:{pattern_aliases})\]|(?:\*\*|#+)?\s*(?:{pattern_aliases})\s*(?:\*\*|:)\s*:?)\s*(.*?)(?=(?:\[(?:{pattern_next})\]|(?:\*\*|#+)?\s*(?:{pattern_next})\s*(?:\*\*|:)\s*:?|$))"
            m = re.search(padrao, bloco_cartoes, re.IGNORECASE | re.DOTALL)
            if m:
                txt = m.group(1).strip()
                txt = re.sub(r"^[^\w]+", "", txt).strip()
                if txt and len(txt) > 10:
                    cartoes[canonical] = _remover_tracos(txt)

    sintese = _remover_tracos(bloco_sintese)
    return sintese, cartoes


MODELO_TRANSITO_PRINCIPAL = os.getenv("MODELO_LEITURA", "gpt-5.6-sol").strip() or "gpt-5.6-sol"
ESFORCO_RACIOCINIO_TRANSITO = os.getenv("RACIOCINIO_LEITURA", "medium").strip() or "medium"


async def generate_transit_synthesis(
    nome: str,
    data_alvo: str,
    posicoes: list,
    textos: dict,
    contexto: dict | None = None,
    movimentos_periodo: list | None = None,
    perfil_usuario: dict | None = None,
    preferred_model: str | None = None,
    fallback_model: str | None = None,
) -> tuple[str, dict[str, str], dict]:
    """A costura profunda dos cinco blocos, dos cartões personalizados e do período numa leitura completa."""
    if not posicoes or not textos:
        return "", {}, {}

    prompt = _build_transit_prompt(
        nome, data_alvo, posicoes, textos,
        contexto=contexto,
        movimentos_periodo=movimentos_periodo,
        perfil_usuario=perfil_usuario,
    )
    sistema = _load_transit_prompt()

    melhor = ""
    melhor_cartoes: dict[str, str] = {}
    melhor_custo = {}
    menos_erros = 999

    for tentativa in (1, 2):
        raw_output, custo = await _tentar_sintese(
            sistema,
            prompt,
            nome,
            data_alvo,
            tentativa=tentativa,
            preferred_model=preferred_model,
            fallback_model=fallback_model,
        )
        if not raw_output:
            break

        sintese_parsed, cartoes_parsed = _parse_transit_output(raw_output)
        texto = _tirar_vocativo(sintese_parsed, nome)
        duros, estilo = auditar_sintese(texto, nome)
        if not duros and not estilo:
            logger.info("Síntese e cartões aprovados na tentativa %d para '%s' | Cartões gerados: %d | Custo: %s (%s)",
                        tentativa, nome, len(cartoes_parsed), custo.get("cost_usd_formatted"), custo.get("cost_brl_formatted"))
            return texto, cartoes_parsed, custo

        total = len(duros) + len(estilo)
        if total < menos_erros:
            melhor, melhor_cartoes, melhor_custo, menos_erros = texto, cartoes_parsed, custo, total

        # Se não houve erro duro (apenas detalhe leve de estilo), evita gastar mais 20s numa 2ª chamada
        if not duros:
            logger.info("Síntese aprovada sem erros duros na tentativa %d para '%s' | Cartões gerados: %d | Custo: %s",
                        tentativa, nome, len(cartoes_parsed), custo.get("cost_usd_formatted"))
            return texto, cartoes_parsed, custo

        if tentativa == 2:
            break

        logger.warning("Síntese reprovada para '%s': %s", nome, duros + estilo)
        prompt += (
            "\n\n======== A SUA RESPOSTA ANTERIOR FOI REPROVADA ========\n"
            "Problemas encontrados na síntese:\n"
            + "\n".join(f"- {e}" for e in duros + estilo)
            + "\n\nReescreva corrigindo TODOS eles, mantendo a estrutura === SINTESE === e === CARTOES ===."
        )

    if melhor:
        logger.warning("Entregando síntese com %d ressalva(s) para '%s' | Custo: %s",
                       menos_erros, nome, melhor_custo.get("cost_usd_formatted"))
        return melhor, melhor_cartoes, melhor_custo

    logger.error("Síntese de trânsito falhou em todos os modelos para '%s'", nome)
    return "", {}, {}


async def _tentar_sintese(
    sistema: str,
    prompt: str,
    nome: str,
    data_alvo: str,
    tentativa: int = 1,
    preferred_model: str | None = None,
    fallback_model: str | None = None,
) -> tuple[str, dict]:
    """Geração no modelo configurado com fallback dedicado por fase e fallback seguro."""
    primary = (preferred_model or "").strip() or MODELO_TRANSITO_PRINCIPAL
    configured_fb = (fallback_model or "").strip()
    modelos = [
        m
        for m in [primary, configured_fb, MODELO_TRANSITO_PRINCIPAL, "gpt-5.6-luna", "gpt-5.4", "gpt-4o", "gpt-4o-mini"]
        if m
    ]
    # Remove duplicatas mantendo a ordem
    modelos_unicos = list(dict.fromkeys(modelos))

    c = get_client()
    for model_name in modelos_unicos:
        try:
            kwargs = dict(
                model=model_name,
                messages=[
                    {"role": "system", "content": sistema},
                    {"role": "user", "content": prompt},
                ],
                max_completion_tokens=16000,
            )
            logger.info("🤖 Gerando leitura profunda com '%s' (raciocínio=%s) para '%s'",
                        model_name, ESFORCO_RACIOCINIO_TRANSITO, nome)
            try:
                resp = await c.chat.completions.create(
                    reasoning_effort=ESFORCO_RACIOCINIO_TRANSITO,
                    **kwargs,
                )
            except TypeError:
                resp = await c.chat.completions.create(temperature=0.8, **kwargs)
            except Exception as inner_exc:
                if "reasoning" in str(inner_exc).lower():
                    resp = await c.chat.completions.create(temperature=0.8, **kwargs)
                else:
                    raise

            texto = (resp.choices[0].message.content or "").strip()
            if texto:
                usage = getattr(resp, "usage", None)
                p_tok = getattr(usage, "prompt_tokens", 0) if usage else 0
                c_tok = getattr(usage, "completion_tokens", 0) if usage else 0
                custo = calcular_custo_openai(model_name, p_tok, c_tok)
                logger.info("Tokens: prompt=%d, completion=%d, total=%d | Custo: %s (%s)",
                            p_tok, c_tok, custo["total_tokens"],
                            custo["cost_usd_formatted"], custo["cost_brl_formatted"])
                return texto, custo
        except Exception as exc:
            logger.warning("Modelo '%s' falhou na síntese de trânsito: %s", model_name, exc)
    return "", {}

