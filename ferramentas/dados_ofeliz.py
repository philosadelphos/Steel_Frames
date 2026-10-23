"""
Gera src/js/ofeliz.js a partir dos ficheiros da O Feliz em docs/catalogos/ (fora do git):
folhas de cálculo das propriedades (Superomega, C e Z) e o desenho SUPEROMEGA_pormenores.dxf.

Não corre no CI: precisa dos catálogos e dos módulos openpyxl e ezdxf (por exemplo, num venv).
Correr com: python ferramentas/dados_ofeliz.py
"""
import json
import math
import os
import re

import ezdxf
import openpyxl
from ezdxf import bbox

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(RAIZ, "docs", "catalogos")
SAIDA = os.path.join(RAIZ, "src", "js", "ofeliz.js")

# Erros das folhas de cálculo do Superomega: valem os do catálogo em PDF, coerentes com a geometria.
CORRECOES_SO = {
    "Superomega 120 x 1.5": {"Iz": 156.18},
    "Superomega 120 x 2.0": {"Iz": 209.68},
    "Superomega 250 x 3.0": {"It": 5660.41},
}


def folhas(nome):
    wb = openpyxl.load_workbook(os.path.join(CAT, nome), data_only=True)
    out = {}
    for ws in wb.worksheets:
        out[ws.title] = [[row[0].strip()] + list(row[1:]) for row in ws.iter_rows(values_only=True)
                         if row and isinstance(row[0], str) and re.match(r"^(Superomega|C |Z )", row[0].strip())]
    return out


def r(v, casas=5):
    """Arredonda a 5 algarismos significativos (os valores do fabricante têm 4 a 5)."""
    return float(f"{v:.{casas}g}") if abs(v) >= 1 else round(v, casas + 1)


# ----- Geometria do Superomega (linha média do contorno desenhado) -----
def arco(p1, p2, b, n=16):
    if abs(b) < 1e-9:
        return [], None
    (x1, y1), (x2, y2) = p1, p2
    th = 4 * math.atan(b)
    c = math.hypot(x2 - x1, y2 - y1)
    rr = c / (2 * math.sin(abs(th) / 2))
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    d = math.sqrt(max(rr * rr - c * c / 4, 0))
    ux, uy = (x2 - x1) / c, (y2 - y1) / c
    s = 1 if (b > 0) == (abs(th) < math.pi) else -1
    cx, cy = mx - s * uy * d, my + s * ux * d
    a1 = math.atan2(y1 - cy, x1 - cx)
    return [(cx + rr * math.cos(a1 + th * k / n), cy + rr * math.sin(a1 + th * k / n)) for k in range(1, n)], rr


def discretizar(v):
    pts = []
    for i in range(len(v) - 1):
        pts.append(v[i][:2])
        pts += arco(v[i][:2], v[i + 1][:2], v[i][2])[0]
    pts.append(v[-1][:2])
    return pts


def comprimento(pts):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))


def props(pts):
    """Propriedades por unidade de espessura de uma linha média (A em mm, I em mm³)."""
    A = Sx = Sy = Ixx = Iyy = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, y2 - y1)
        xm, ym = (x1 + x2) / 2, (y1 + y2) / 2
        A += L; Sx += L * xm; Sy += L * ym
        Iyy += L * (ym * ym + (y2 - y1) ** 2 / 12); Ixx += L * (xm * xm + (x2 - x1) ** 2 / 12)
    xc, yc = Sx / A, Sy / A
    return A, xc, yc, Iyy - A * yc * yc, Ixx - A * xc * xc


def geometria_superomega():
    doc = ezdxf.readfile(os.path.join(CAT, "SUPEROMEGA_pormenores.dxf"))
    geo = {}
    for e in doc.modelspace().query("LWPOLYLINE"):
        if not e.closed or e.dxf.layer != "aço":
            continue
        b = bbox.extents([e])
        # Primeira coluna de secções do desenho (Produtos 1 a 5, sem furação)
        if b.extmin.x > 4000 or b.extmax.x - b.extmin.x < 150:
            continue
        v = [(x - b.extmin.x, y - b.extmin.y, bl) for x, y, bl in e.get_points("xyb")]
        m = len(v) // 2
        ext, inn = v[:m], v[m:][::-1]
        med = [((ext[i][0] + inn[i][0]) / 2, (ext[i][1] + inn[i][1]) / 2, ext[i][2]) for i in range(m)]
        td = math.hypot(ext[0][0] - inn[0][0], ext[0][1] - inn[0][1])
        h = b.extmax.y - b.extmin.y
        H = min((80, 120, 160, 200, 250), key=lambda x: abs(x - h))
        pts = discretizar(med)
        ys = [p[1] for p in med]
        ybot, ytop = min(ys), max(ys)
        cantos = []
        for i in range(m - 1):
            if abs(med[i][2]) > 1e-9:
                ap, _ = arco(med[i][:2], med[i + 1][:2], med[i][2])
                r_ext = arco(ext[i][:2], ext[i + 1][:2], ext[i][2])[1]
                r_inn = arco(inn[i][:2], inn[i + 1][:2], -inn[i][2])[1] if abs(inn[i][2]) > 1e-9 else r_ext
                cantos.append(dict(i=i, pm=ap[len(ap) // 2], ini=med[i][:2], fim=med[i + 1][:2], r=min(r_ext, r_inn)))

        def toca(c, y):
            return abs(c["ini"][1] - y) < 0.6 * td or abs(c["fim"][1] - y) < 0.6 * td

        cs = [c for c in cantos if toca(c, ytop)][0]
        c_inf = [c for c in cantos if toca(c, ybot) and c["i"] < cs["i"]]
        c_lab, ci = c_inf[0], c_inf[-1]

        def perto(p):
            return min(range(len(pts)), key=lambda k: (pts[k][0] - p[0]) ** 2 + (pts[k][1] - p[1]) ** 2)

        k0, k1 = perto(ci["pm"]), perto(cs["pm"])
        alma = pts[k0:k1 + 1]
        (ax, ay), (bx, by) = alma[0], alma[-1]
        # Banzo livre: aba, reforço e 1/5 da altura da alma a partir da interseção com a aba (10.1.4.1(2))
        hw = ytop - ybot
        ylim = ybot + hw / 5
        livre = [p for p in pts[:k1 + 1] if p[1] <= ylim]
        k = len(livre)
        (x1, y1), (x2, y2) = pts[k - 1], pts[k]
        f = (ylim - y1) / (y2 - y1)
        livre.append((x1 + f * (x2 - x1), ylim))
        Af, xf, _, _, Izf = props(livre)
        xs_l = [p[0] for p in livre]
        xs_c = (min(p[0] for p in med) + max(p[0] for p in med)) / 2
        geo[H] = dict(
            sd=r(comprimento(alma)),                                        # altura desenvolvida da alma
            phi=round(math.degrees(math.atan2(abs(by - ay), abs(bx - ax))), 1),  # inclinação da linha do sistema
            r=round(ci["r"], 2),                                            # raio interior aba/alma
            bTopo=round(2 * abs(cs["pm"][0] - xs_c), 1),                    # banzo superior entre cantos
            livre=[r(Af), r(Izf), r(max(xf - min(xs_l), max(xs_l) - xf) + td / 2)],
        )
    return geo


def main():
    so, c, z = folhas("SUPEROMEGA_propr geometr.xlsx"), folhas("C_propr geometr.xlsx"), folhas("Z_propr geometr.xlsx")
    geo = geometria_superomega()

    seccoes_so = []
    for x in so["Propr Bruta"]:
        nome, G, h, b, _, tn, te, A, Iy, Iz, Iw, It, ycg, zcg, zcc = x[:15]
        corr = CORRECOES_SO.get(nome, {})
        Iz, It = corr.get("Iz", Iz), corr.get("It", It)
        ef = {}
        for aco, folha in (("S280GD", "S280GD"), ("S350GD", "S350GD")):
            e = [y for y in so[folha] if y[0] == nome][0]
            # [Aeff compressão, Iy,eff+, Wy,eff+, Iy,eff−, Wy,eff−, Iz,eff, Wz,eff]
            ef[aco] = [r(e[1]), r(e[5]), r(e[6]), r(e[10]), r(e[11]), r(e[15]), r(e[16])]
        seccoes_so.append(dict(nome="Ω" + nome.split()[1] + "×" + f"{tn:.1f}".replace(".", ","), h=int(h), b=round(b), t=tn, teff=te,
                               G=r(G), A=r(A), Iy=r(Iy), Iz=r(Iz), Iw=r(Iw), It=r(It * 1e-4), zcg=r(zcg), zcc=r(zcc), ef=ef))

    def cz(fonte, tipo):
        lista = []
        for x in fonte["Propr Brutas"]:
            nome, G, h, b, a, rr, _, tn, te, A, Iy, Wy, Iz, Wz, Iw, It = x[:16]
            ycc = x[18] if tipo == "C" else 0
            ef = {}
            for aco in ("S220", "S250", "S280", "S320", "S350"):
                e = [y for y in fonte[aco] if y[0] == nome][0]
                if tipo == "C":   # [Aeff, Iy,eff, Wy,eff, Iz,eff+, Wz,eff+, Iz,eff−, Wz,eff−]
                    ef[aco + "GD"] = [r(e[1]), r(e[5]), r(e[6]), r(e[9]), r(e[10]), r(e[13]), r(e[14])]
                else:             # [Aeff, Iy,eff, Wy,eff, Iz,eff, Wz,eff]
                    ef[aco + "GD"] = [r(e[1]), r(e[5]), r(e[6]), r(e[9]), r(e[10])]
            lista.append(dict(nome=nome.replace(" ", "").replace("x", "×").replace(".", ","), h=int(h), b=int(b), a=int(a), r=rr,
                              t=tn, teff=te, G=r(G), A=r(A), Iy=r(Iy), Iz=r(Iz), Iw=r(Iw), It=r(It * 1e-4), ycc=r(ycc), ef=ef))
        return lista

    dados = dict(superomega=dict(geo=geo, seccoes=seccoes_so), C=cz(c, "C"), Z=cz(z, "Z"))
    js = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    js = js.replace('{"nome"', '\n    {"nome"')
    cabecalho = """/*
 * Madres O Feliz em aço enformado a frio: Superomega®, C e Z. Ficheiro gerado por
 * ferramentas/dados_ofeliz.py a partir das folhas de cálculo e do desenho SUPEROMEGA_pormenores.dxf
 * do fabricante (docs/catalogos/, fora do git). Não editar à mão.
 *
 * Unidades: dimensões em mm; G em kg/m; A em cm²; I em cm⁴; W em cm³; Iw em cm⁶; It em cm⁴.
 * Propriedades brutas e efetivas (EN 1993-1-3 e EN 1993-1-5) com a espessura de cálculo teff,
 * por classe de aço:
 *   Superomega: [Aeff, Iy,eff+, Wy,eff+, Iy,eff−, Wy,eff−, Iz,eff, Wz,eff]  (+: banzo superior comprimido)
 *   C:          [Aeff, Iy,eff, Wy,eff, Iz,eff+, Wz,eff+, Iz,eff−, Wz,eff−]
 *   Z:          [Aeff, Iy,eff, Wy,eff, Iz,eff, Wz,eff]  (eixos horizontal e vertical, como no catálogo)
 * Superomega, geometria da linha média por altura (desenho): sd (altura desenvolvida da alma), phi
 * (inclinação da alma, graus), r (raio interior aba/alma), bTopo (largura do banzo superior) e o banzo
 * livre por unidade de espessura [A/t (mm), Iz/t (mm³), distância à fibra extrema (mm)].
 * Corrigidos com o catálogo em PDF: Iz do 120×1,5 e do 120×2,0 e It do 250×3,0.
 * As propriedades das C e Z foram calculadas pelo fabricante com cantos vivos (ver enformados.js).
 */
var OFELIZ = """
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write(cabecalho + js + ";\n\nif (typeof module !== \"undefined\") module.exports = OFELIZ;\n")
    print("escrito", SAIDA, os.path.getsize(SAIDA), "bytes;", len(seccoes_so), "Superomega,", len(dados["C"]), "C,", len(dados["Z"]), "Z")


if __name__ == "__main__":
    main()
