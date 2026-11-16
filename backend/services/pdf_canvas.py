"""Primitivas de desenho vetorial (estrelas, nebulosa, mandala, símbolos) no canvas ReportLab."""
import math
import random
from reportlab.lib import colors
from reportlab.lib.units import cm
from services.pdf_assets import BG, PRI, LIGHT, DARK_PUR, GOLD, ACCENT, WHITE, _c

def _seed(name: str) -> int:
    return sum(ord(c) * (i + 1) for i, c in enumerate(name)) % 99991


def _draw_stars(cv, W, H, seed_val, n=140):
    rng = random.Random(seed_val)
    for _ in range(n):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H)
        r = rng.uniform(0.2, 1.4)
        a = rng.uniform(0.08, 0.65)
        cv.setFillColor(_c(WHITE, a))
        cv.circle(x, y, r, fill=1, stroke=0)
    # a few bigger bright stars
    rng2 = random.Random(seed_val + 7)
    for _ in range(18):
        x = rng2.uniform(0, W)
        y = rng2.uniform(0, H)
        a = rng2.uniform(0.5, 0.9)
        cv.setFillColor(_c(WHITE, a))
        cv.circle(x, y, 1.6, fill=1, stroke=0)
    cv.setFillAlpha(1.0)


def _draw_nebula(cv, cx, cy, max_r, base_color, layers=14):
    r, g, b = base_color.red, base_color.green, base_color.blue
    for i in range(layers, 0, -1):
        rad = max_r * i / layers
        alpha = 0.018
        cv.setFillColor(colors.Color(r, g, b, alpha))
        cv.circle(cx, cy, rad, fill=1, stroke=0)
    cv.setFillAlpha(1.0)


def _draw_ring(cv, cx, cy, r, color, lw=0.5, alpha=1.0):
    cv.setStrokeColor(_c(color, alpha))
    cv.setLineWidth(lw)
    cv.circle(cx, cy, r, fill=0, stroke=1)


def _draw_star_path(cv, cx, cy, r, points, inner_ratio, color, alpha=1.0):
    """Draw a star polygon (fill only)."""
    cv.setFillColor(_c(color, alpha))
    p = cv.beginPath()
    for i in range(points * 2):
        angle = math.pi * i / points - math.pi / 2
        rad = r if i % 2 == 0 else r * inner_ratio
        x = cx + rad * math.cos(angle)
        y = cy + rad * math.sin(angle)
        if i == 0:
            p.moveTo(x, y)
        else:
            p.lineTo(x, y)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)


def _draw_mandala(cv, cx, cy, r):
    """Sacred geometry mandala: concentric rings + radial spokes."""
    # outer ring
    for fr in (1.0, 0.72, 0.50, 0.34):
        _draw_ring(cv, cx, cy, r * fr, PRI, lw=0.4, alpha=0.35)
    # 12 radial spokes
    cv.setStrokeColor(_c(PRI, 0.18))
    cv.setLineWidth(0.35)
    for i in range(12):
        angle = math.pi * 2 * i / 12
        cv.line(
            cx + r * 0.34 * math.cos(angle),
            cy + r * 0.34 * math.sin(angle),
            cx + r * 1.0 * math.cos(angle),
            cy + r * 1.0 * math.sin(angle),
        )
    # central 6-pointed star glow
    _draw_star_path(cv, cx, cy, r * 0.22, 6, 0.5, ACCENT, alpha=0.18)
    _draw_star_path(cv, cx, cy, r * 0.14, 6, 0.5, ACCENT, alpha=0.55)
    _draw_star_path(cv, cx, cy, r * 0.08, 6, 0.5, ACCENT, alpha=0.90)


# ── Section symbols (3-layer galactic glow) ───────────────────────────────────
def _glow_layers(cv, cx, cy, draw_fn, r):
    """Draw symbol with halo → glow → core layers."""
    draw_fn(cv, cx, cy, r * 2.5, alpha=0.04)
    draw_fn(cv, cx, cy, r * 1.6, alpha=0.13)
    draw_fn(cv, cx, cy, r,       alpha=0.90)


def _sym_moon(cv, cx, cy, r, alpha=0.90):
    """Crescent moon: full circle minus offset circle."""
    cv.setFillColor(_c(ACCENT, alpha))
    cv.circle(cx, cy, r, fill=1, stroke=0)
    # carve crescent
    cv.setFillColor(BG)
    cv.circle(cx + r * 0.38, cy, r * 0.80, fill=1, stroke=0)


def _sym_star5(cv, cx, cy, r, alpha=0.90):
    _draw_star_path(cv, cx, cy, r, 5, 0.38, ACCENT, alpha)


def _sym_flower(cv, cx, cy, r, alpha=0.90):
    """6-petal flower of life."""
    _draw_star_path(cv, cx, cy, r, 6, 0.6, ACCENT, alpha)
    cv.setStrokeColor(_c(ACCENT, alpha * 0.5))
    cv.setLineWidth(0.6)
    for i in range(6):
        angle = math.pi * 2 * i / 6
        px = cx + r * 0.6 * math.cos(angle)
        py = cy + r * 0.6 * math.sin(angle)
        cv.circle(px, py, r * 0.55, fill=0, stroke=1)


def _sym_arrow(cv, cx, cy, r, alpha=0.90):
    """Upward arrow / compass north."""
    cv.setFillColor(_c(ACCENT, alpha))
    p = cv.beginPath()
    p.moveTo(cx, cy + r)            # top
    p.lineTo(cx + r * 0.5, cy - r * 0.3)
    p.lineTo(cx + r * 0.18, cy - r * 0.1)
    p.lineTo(cx + r * 0.18, cy - r)
    p.lineTo(cx - r * 0.18, cy - r)
    p.lineTo(cx - r * 0.18, cy - r * 0.1)
    p.lineTo(cx - r * 0.5, cy - r * 0.3)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)


def _sym_halfmoon(cv, cx, cy, r, alpha=0.90):
    """Half circle (yin side) + ring."""
    cv.setFillColor(_c(ACCENT, alpha))
    # Right half-circle arc (filled)
    p = cv.beginPath()
    p.moveTo(cx, cy - r)
    p.arcTo(cx - r, cy - r, cx + r, cy + r, 270, 180)
    p.lineTo(cx, cy - r)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)
    # outer ring complement
    cv.setStrokeColor(_c(ACCENT, alpha * 0.5))
    cv.setLineWidth(1.0)
    cv.circle(cx, cy, r, fill=0, stroke=1)


def _sym_spiral(cv, cx, cy, r, alpha=0.90):
    """Concentric arcs forming an outward spiral (8-pointed star)."""
    _draw_star_path(cv, cx, cy, r, 8, 0.42, ACCENT, alpha)
    cv.setStrokeColor(_c(ACCENT, alpha * 0.45))
    cv.setLineWidth(0.7)
    cv.circle(cx, cy, r * 0.62, fill=0, stroke=1)


_SYMBOL_FN = {
    "moon":     _sym_moon,
    "star5":    _sym_star5,
    "flower":   _sym_flower,
    "arrow":    _sym_arrow,
    "halfmoon": _sym_halfmoon,
    "spiral":   _sym_spiral,
}

def _draw_section_symbol(cv, cx, cy, sym_key, r=1.4 * cm):
    fn = _SYMBOL_FN.get(sym_key, _sym_star5)
    _glow_layers(cv, cx, cy, fn, r)


# ── Cover page ────────────────────────────────────────────────────────────────
