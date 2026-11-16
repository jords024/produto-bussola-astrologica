"""Constantes, fontes, paleta e sanitização de texto/SVG para o PDF."""
import re
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Font registration ──────────────────────────────────────────────────────────
_FONTS_DIR = Path(__file__).parent.parent / "fonts"

_FONT_DEFS = [
    ("Garamond",        "EBGaramond-Regular"),
    ("Garamond-Bold",   "EBGaramond-Bold"),
    ("Garamond-Italic", "EBGaramond-Italic"),
    ("Cinzel",          "Cinzel-Regular"),
    ("Cinzel-Bold",     "Cinzel-Bold"),
    ("Poppins",         "Poppins-Regular"),
    ("Poppins-Light",   "Poppins-Light"),
]

_FALLBACK = {
    "Garamond":        "Helvetica",
    "Garamond-Bold":   "Helvetica-Bold",
    "Garamond-Italic": "Helvetica-Oblique",
    "Cinzel":          "Helvetica-Bold",
    "Cinzel-Bold":     "Helvetica-Bold",
    "Poppins":         "Helvetica",
    "Poppins-Light":   "Helvetica",
}

_loaded: set = set()

def _reg():
    for alias, fname in _FONT_DEFS:
        if alias in _loaded:
            continue
        path = _FONTS_DIR / f"{fname}.ttf"
        if path.exists():
            try:
                pdfmetrics.registerFont(TTFont(alias, str(path)))
                _loaded.add(alias)
            except Exception:
                pass

_reg()


def F(name: str) -> str:
    """Return font alias if registered, else safe fallback."""
    if name in _loaded:
        return name
    return _FALLBACK.get(name, "Helvetica")


# ── Palette — alinhada exatamente com o sistema ───────────────────────────────
BG         = colors.HexColor("#0f0b1e")   # sistema: bg
BG_CARD    = colors.HexColor("#1a1535")   # sistema: card
PRI        = colors.HexColor("#7F77DD")   # sistema: primary
LIGHT      = colors.HexColor("#AFA9EC")   # sistema: light
DARK_PUR   = colors.HexColor("#3C3489")   # sistema: dark
GOLD       = colors.HexColor("#EF9F27")   # sistema: gold (apenas badges Sol/Lua/Asc)
ACCENT     = LIGHT                         # acento principal → roxo claro
TEXT       = colors.HexColor("#f0eeff")   # sistema: text
BODY       = colors.HexColor("#cdc9ef")
MUTED      = colors.HexColor("#8b87b8")   # sistema: muted
WHITE      = colors.white

def _c(hex_color, a=1.0):
    """HexColor with alpha."""
    c = hex_color
    return colors.Color(c.red, c.green, c.blue, a)


# ── Section metadata ──────────────────────────────────────────────────────────
SECTION_ORDER = [
    "portal",
    "essencia",
    "ferida_e_dom",
    "dons_esquecidos",
    "luz_e_sombra",
    "reencontro",
    "rituais",
    "afirmagias",
]

# Altura UTILIZÁVEL do frame (A4 menos margens e padding interno do Frame)
# topMargin=2.5cm  bottomMargin=2.0cm  Frame._topPadding=6pt  Frame._bottomPadding=6pt
_FRAME_H = A4[1] - 2.5 * cm - 2.0 * cm - 12   # ≈ 702 pt  (12 = 2×6pt padding)

SECTION_META = {
    "portal":          {"roman": "",     "label": "ABERTURA",      "title": "O Inicio da Jornada", "symbol": "flower"},
    "essencia":        {"roman": "I",    "label": "PORTAL  I",     "title": "Essencia",             "symbol": "moon"},
    "ferida_e_dom":    {"roman": "II",   "label": "PORTAL  II",    "title": "A Ferida e o Dom",     "symbol": "star5"},
    "dons_esquecidos": {"roman": "III",  "label": "PORTAL  III",   "title": "Dons Esquecidos",      "symbol": "arrow"},
    "luz_e_sombra":    {"roman": "IV",   "label": "PORTAL  IV",    "title": "Luz e Sombra",         "symbol": "halfmoon"},
    "reencontro":      {"roman": "V",    "label": "PORTAL  V",     "title": "O Reencontro",         "symbol": "spiral"},
    "rituais":         {"roman": "VI",   "label": "PORTAL  VI",    "title": "Rituais de Integracao","symbol": "flower"},
    "afirmagias":      {"roman": "VII",  "label": "PORTAL  VII",   "title": "Afirmagias",           "symbol": "star5"},
}


# ── SVG pre-processing ───────────────────────────────────────────────────────

# Cores base para variáveis DaisyUI / kerykeion-theme que podem não estar
# definidas dentro do próprio SVG (dependem do CSS da página host).
_KERYKEION_COLOR_DEFAULTS: dict[str, str] = {
    "--kerykeion-color-primary":          "#7F77DD",
    "--kerykeion-color-secondary":        "#AFA9EC",
    "--kerykeion-color-accent":           "#EF9F27",
    "--kerykeion-color-neutral":          "#3C3489",
    "--kerykeion-color-neutral-content":  "#f0eeff",
    "--kerykeion-color-base-100":         "#0f0b1e",
    "--kerykeion-color-base-200":         "#1a1535",
    "--kerykeion-color-base-300":         "#3C3489",
    "--kerykeion-color-base-content":     "#f0eeff",
    "--kerykeion-color-info":             "#60a5fa",
    "--kerykeion-color-success":          "#4ade80",
    "--kerykeion-color-warning":          "#EF9F27",
    "--kerykeion-color-error":            "#f87171",
    "--kerykeion-color-info-content":     "#f0eeff",
    "--kerykeion-color-success-content":  "#f0eeff",
    "--kerykeion-color-warning-content":  "#0f0b1e",
    "--kerykeion-color-error-content":    "#f0eeff",
}


def _preprocess_svg(svg: str) -> str:
    """
    Substitui CSS custom properties (var(--xxx)) por valores reais antes de
    passar ao svglib. O kerykeion usa variáveis que se encadeiam em múltiplos
    níveis (DaisyUI theming), então é necessário iterar até convergência.
    """
    if "var(--" not in svg:
        return svg

    # Extrai TODAS as definições de variáveis CSS dos blocos <style>
    css_vars: dict = dict(_KERYKEION_COLOR_DEFAULTS)   # começamos com os defaults
    for style_m in re.finditer(r"<style[^>]*>(.*?)</style>", svg, re.DOTALL | re.IGNORECASE):
        for var_m in re.finditer(r"--([a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)", style_m.group(1)):
            key = f"--{var_m.group(1).strip()}"
            val = var_m.group(2).strip()
            css_vars[key] = val   # sobrescreve defaults com valores reais do SVG

    def _replace(m: re.Match) -> str:
        inner = m.group(1).strip()
        if "," in inner:
            name, fallback = inner.split(",", 1)
            return css_vars.get(name.strip(), fallback.strip())
        return css_vars.get(inner, "#888888")

    # Itera até convergência (resolve cadeias var→var→valor concreto)
    for _ in range(6):
        if "var(--" not in svg:
            break
        new_svg = re.sub(r"var\(([^)]+)\)", _replace, svg)
        if new_svg == svg:
            break
        svg = new_svg

    return svg


# ── Text helpers ──────────────────────────────────────────────────────────────

# Padrões de linhas "meta" que a IA às vezes injeta no conteúdo
# (cabeçalhos repetidos, subtítulos, separadores) — devem ser ignorados no PDF
_META_PATTERNS = re.compile(
    r"""
    ^\s*(
        # "✦ NOME DA SEÇÃO ✦" — cabeçalho repetido com ✦
        [✦★•◆]\s*[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{4,}\s*[✦★•◆]
        |
        # "Subtítulo:" ou "Título:" seguido de qualquer texto
        (Sub)?[Tt][íi]tulo\s*:
        |
        # "Seção N:" ou "Portal N:" ou "PORTAL VI:"
        (Seção|Portal|PORTAL|SEÇÃO)\s*[\w\s]*\s*:
        |
        # Linhas de separação puras: "---", "===", "***"
        [-=*]{3,}
    )
    """,
    re.VERBOSE | re.UNICODE,
)


def _is_meta_line(para: str) -> bool:
    """Retorna True se o parágrafo é um cabeçalho/subtítulo injetado pela IA."""
    stripped = para.strip()
    if not stripped:
        return True
    # Linha curta (≤ 120 chars) que bate em algum padrão meta
    if len(stripped) <= 120 and _META_PATTERNS.match(stripped):
        return True
    return False


def _clean(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.+?)\*",     r"<i>\1</i>", text)
    text = re.sub(r"  +", " ", text)
    return text.strip()


# ── Sacred geometry helpers ───────────────────────────────────────────────────
