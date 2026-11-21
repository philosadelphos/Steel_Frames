"""
Gera src/js/perfis-tubulares.js (dimensões dos perfis ocos estruturais, EN 10219) e testes/referencias-tubulares.json
(massa, área e propriedades dos fabricantes, só para conferência) a partir dos catálogos em docs/catalogos/ (fora do git):
- Ferpinta, «Tubo estrutural EN 10219-1/2» (ferpinta_tubo_estrutural_EN10219.pdf): redondos (CHS), quadrados (SHS) e
  retangulares (RHS), com massa, área, I, W e i. É a base da gama.
- HIASA (Grupo Gonvarri), «Tubos cuadrados» (hiasa_tubos_cuadrados.pdf): quadrados de 16 a 100 mm, só com o peso por
  metro. Entram as secções que a Ferpinta não tem (por exemplo, 52, 55, 65 e 75 mm).
- Nordesfer, «Tabela técnica de tubos» (nordesfer_tabela_tecnica_de_tubos.pdf): só as tabelas «Estrutural», com o peso
  por metro. Entram as secções que nem a Ferpinta nem a HIASA têm, e só quando o peso publicado bate com o calculado
  (a tabela tem colunas desalinhadas; as que não batem são registadas e ficam de fora).

Série normalizada: tamanhos e espessuras do Anexo C da EN 10219-2:2006 («limited range of standard sizes»), guardados
abaixo só como designações. Cada secção leva o código 2 (tamanho e espessura do Anexo C), 1 (só o tamanho) ou 0 (gama
de fabricante).

A área para filtrar as linhas da Nordesfer e da HIASA calcula-se pelo Anexo B da EN 10219-2 (cantos com ro = 2,0 / 2,5 /
3,0 T e ri = 1,0 / 1,5 / 2,0 T), como em src/js/seccao.js.

Não corre no CI: precisa dos catálogos e do pdftotext (poppler). Correr com: python3 ferramentas/dados_tubulares.py
"""
import json
import math
import os
import re
import subprocess

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGOS = os.path.join(RAIZ, "docs", "catalogos")
SAIDA = os.path.join(RAIZ, "src", "js", "perfis-tubulares.js")
REFERENCIAS = os.path.join(RAIZ, "testes", "referencias-tubulares.json")
FERPINTA = "ferpinta_tubo_estrutural_EN10219.pdf"
HIASA = "hiasa_tubos_cuadrados.pdf"
NORDESFER = "nordesfer_tabela_tecnica_de_tubos.pdf"

# EN 10219-2:2006, Anexo C (Quadros C.1 a C.3): tamanhos e espessuras da gama normalizada (só as designações),
# lidos de ferramentas/en10219-2_anexo_c.json.
EN_CHS = {}
EN_SHS = {}
EN_RHS = {}


def num(txt):
    v = float(str(txt).replace(",", "."))
    return int(v) if v == int(v) else round(v, 3)


def texto(nome):
    return subprocess.run(["pdftotext", "-layout", os.path.join(CATALOGOS, nome), "-"],
                          capture_output=True, text=True, check=True).stdout


def palavras(nome):
    """Palavras do PDF por página: (página, x do centro, y do topo, texto)."""
    html = subprocess.run(["pdftotext", "-bbox", os.path.join(CATALOGOS, nome), "-"],
                          capture_output=True, text=True, check=True).stdout
    out = []
    for np, pg in enumerate(html.split("<page ")[1:], 1):
        for x0, y0, x1, _, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg):
            out.append((np, (float(x0) + float(x1)) / 2, float(y0), w))
    return out


def linhas(ws, tol=3.0):
    """Agrupa as palavras de cada página em linhas (tolerância vertical), ordenadas por x."""
    grupos = []
    for p, x, y, w in sorted(ws, key=lambda q: (q[0], q[2])):
        if grupos and grupos[-1][0] == p and abs(grupos[-1][1] - y) <= tol:
            grupos[-1][2].append((x, w))
        else:
            grupos.append([p, y, [(x, w)]])
    return [(g[0], sorted(g[2])) for g in grupos]


# ----- Anexo B da EN 10219-2: área -----
def raios(t):
    return (2.0 * t, 1.0 * t) if t <= 6 else (2.5 * t, 1.5 * t) if t <= 10 else (3.0 * t, 2.0 * t)


def area(forma, d1, d2, t):
    """Área em cm² (Anexo B)."""
    if forma == "CHS":
        return math.pi * (d1 ** 2 - (d1 - 2 * t) ** 2) / 4 / 100
    ro, ri = raios(t)
    return (2 * t * (d1 + d2 - 2 * t) - (4 - math.pi) * (ro ** 2 - ri ** 2)) / 100


# ----- Ferpinta -----
def ferpinta():
    """Linhas das três tabelas: (forma, D/H, B, t, massa, A, I/Iyy, W/Wyy, i/iyy, Izz, Wzz, izz)."""
    secao, out = None, []
    n = r"(\d+(?:,\d+)?)"
    re_ch = re.compile(r"^\s*" + r"\s+".join([n] * 9) + r"\s*$")
    re_rhs = re.compile(r"^\s*" + n + r"\s+x\s+" + n + r"\s+" + r"\s+".join([n] * 11) + r"\s*$")
    for l in texto(FERPINTA).splitlines():
        if "Perfis Ocos Circulares" in l:
            secao = "CHS"
        elif "Perfis Ocos Quadrados" in l:
            secao = "SHS"
        elif "Perfis Ocos Rectangulares" in l:
            secao = "RHS"
        elif "CLASSES DO AÇO" in l:
            secao = None
        if secao == "RHS":
            m = re_rhs.match(l)
            if m:
                g = [num(x) for x in m.groups()]
                out.append(("RHS", g[0], g[1], g[2], g[3], g[6], g[7], g[8], g[9], g[10], g[11], g[12]))
        elif secao in ("CHS", "SHS"):
            m = re_ch.match(l)
            if m:
                g = [num(x) for x in m.groups()]
                out.append((secao, g[0], g[0] if secao == "SHS" else None, g[1], g[2], g[5], g[6], g[7], g[8], None, None, None))
    return out


# ----- HIASA: quadrados, peso por espessura (colunas pela posição) -----
def hiasa():
    ls = linhas(palavras(HIASA))
    # Cabeçalho: espessuras (1,0 … 5,0) e, por baixo, «(mm)» ao centro de cada coluna; a coluna da medida fica à esquerda.
    cab = next(l for p, l in ls if p == 1 and sum(1 for _, w in l if w == "(mm)") >= 9)
    xs = [x for x, w in cab if w == "(mm)" and x > 110]
    esp = next([num(w) for _, w in l] for p, l in ls if p == 1 and len(l) >= 9 and all(re.fullmatch(r"\d+,\d", w) for _, w in l))
    assert esp and len(esp) == len(xs), (esp, xs)
    out = []
    for p, l in ls:
        if p != 1 or len(l) < 4 or l[1][1] != "x" or not re.fullmatch(r"\d+", l[0][1]):
            continue
        a = num(l[0][1])
        for x, w in l[3:]:
            if not re.fullmatch(r"\d+,\d+", w):
                continue                                  # unidades por pacote
            k = min(range(len(xs)), key=lambda i: abs(xs[i] - 12.8 - x))
            assert abs(xs[k] - 12.8 - x) < 8, (a, x, w)
            out.append(("SHS", a, a, esp[k], num(w)))
    return out


# ----- Nordesfer: tabelas «Estrutural» -----
def nordesfer():
    ls = linhas(palavras(NORDESFER))
    out, secao, xs, esp = [], None, None, None
    for p, l in ls:
        frase = " ".join(w for _, w in l)
        if frase.startswith("ESTRUTURAL"):
            secao = {"REDONDO": "CHS", "QUADRADO": "SHS", "RETANGULAR": "RHS"}[l[1][1]]
            continue
        if re.match(r"^(GALVANIZADO|AÇO|CONDUÇÃO|CALHA)", frase):
            secao = None
            continue
        if secao and sum(1 for _, w in l if re.fullmatch(r"\d+,00", w)) >= 6:
            xs = [x for x, w in l]
            esp = [num(w) for _, w in l]
            continue
        if not secao or not xs:
            continue
        if secao == "CHS" and re.fullmatch(r"\d+(?:\.\d+)?", l[0][1]) and len(l) > 1:
            d1, d2, vals = float(l[0][1]), None, l[1:]
        elif secao != "CHS" and len(l) > 3 and l[1][1] == "x":
            d1, d2, vals = float(l[0][1]), float(l[2][1]), l[3:]
        else:
            continue
        for x, w in vals:
            if not re.fullmatch(r"\d+(?:\.\d+)?", w):
                continue
            k = min(range(len(xs)), key=lambda i: abs(xs[i] - x))
            assert abs(xs[k] - x) < 10, (d1, d2, x, w)
            out.append((secao, num(d1), num(d2) if d2 else None, esp[k], num(w)))
    return out


def chave(forma, d1, d2, t):
    if forma == "RHS":
        d1, d2 = max(d1, d2), min(d1, d2)
    return (forma, float(d1), float(d2) if d2 is not None else None, float(t))


def en_codigo(forma, d1, d2, t):
    tabela = {"CHS": EN_CHS, "SHS": EN_SHS, "RHS": EN_RHS}[forma]
    k = float(d1) if forma != "RHS" else (float(max(d1, d2)), float(min(d1, d2)))
    if k not in tabela:
        return 0
    return 2 if float(t) in tabela[k] else 1


def carregar_en():
    """Preenche as tabelas do Anexo C a partir de EN_ANEXO_C."""
    for f, tab in EN_ANEXO_C.items():
        alvo = {"CHS": EN_CHS, "SHS": EN_SHS, "RHS": EN_RHS}[f]
        alvo.clear()
        for k, ts in tab.items():
            kk = tuple(float(v) for v in k.split("x")) if f == "RHS" else float(k)
            alvo[kk] = [float(t) for t in ts]


# EN 10219-2:2006, Anexo C: tamanho → espessuras (mm). Só designações (sem as propriedades da norma).
EN_ANEXO_C = json.loads(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "en10219-2_anexo_c.json"), encoding="utf-8").read())


def main():
    carregar_en()
    base = ferpinta()
    vistos, linhas_js, refs, divergencias = {}, {"CHS": [], "SHS": [], "RHS": []}, [], []
    for r in base:
        k = chave(r[0], r[1], r[2], r[3])
        vistos[k] = "F"
        d1, d2 = (max(r[1], r[2]), min(r[1], r[2])) if r[0] == "RHS" else (r[1], r[2])
        refs.append({"forma": r[0], "d1": d1, "d2": d2, "t": r[3], "fonte": "Ferpinta", "massa": r[4], "A": r[5],
                     "I": r[6], "W": r[7], "i": r[8], "Iz": r[9], "Wz": r[10], "iz": r[11]})
    for fonte, nome, lista in (("H", "HIASA", hiasa()), ("N", "Nordesfer", nordesfer())):
        for forma, d1, d2, t, massa in lista:
            k = chave(forma, d1, d2, t)
            calc = area(forma, k[1], k[2], k[3]) * 0.785
            desvio = massa / calc - 1
            if k in vistos:
                if fonte not in vistos[k]:
                    vistos[k] += fonte
                refs.append({"forma": forma, "d1": k[1], "d2": k[2], "t": t, "fonte": nome, "massa": massa, "comum": True})
                continue
            if abs(desvio) > 0.03:
                divergencias.append("%s %s %s×%s×%s: %s kg/m publicado, %.2f kg/m calculado (%+.0f %%) — fica de fora"
                                    % (nome, forma, d1, d2 if d2 else "", t, massa, calc, desvio * 100))
                continue
            vistos[k] = fonte
            refs.append({"forma": forma, "d1": k[1], "d2": k[2], "t": t, "fonte": nome, "massa": massa})
    for (forma, d1, d2, t), fontes in sorted(vistos.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2] or 0, kv[0][3])):
        en = en_codigo(forma, d1, d2, t)
        fontes = "".join(c for c in "FHN" if c in fontes)
        linha = [num(d1)] + ([num(d2)] if forma == "RHS" else []) + [num(t), fontes, en]
        linhas_js[forma].append(linha)

    def bloco(l):
        return ",".join(json.dumps(x, separators=(",", ":")) for x in l)
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("""/*
 * Perfis ocos estruturais enformados a frio (EN 10219): redondos (CHS), quadrados (SHS) e retangulares (RHS).
 * Ficheiro gerado por ferramentas/dados_tubulares.py a partir dos catálogos da Ferpinta, da HIASA e da Nordesfer
 * (docs/catalogos/, fora do git). Não editar à mão.
 *
 * Cada linha: CHS [D, t, fontes, EN]; SHS [B, t, fontes, EN]; RHS [H, B, t, fontes, EN] (H ≥ B), em mm.
 *   fontes: F Ferpinta, H HIASA, N Nordesfer (fabricantes que a têm na gama);
 *   EN: 2 tamanho e espessura da gama normalizada (EN 10219-2, Anexo C), 1 só o tamanho, 0 gama de fabricante.
 * Cantos dos SHS e RHS para o cálculo: os do Anexo B da EN 10219-2 (em seccao.js). A massa e as propriedades dos
 * fabricantes ficam em testes/referencias-tubulares.json, só para conferência.
 */
var PERFIS_TUBULARES = {
  CHS: { descricao: "Perfis ocos circulares", linhas: [%s] },
  SHS: { descricao: "Perfis ocos quadrados", linhas: [%s] },
  RHS: { descricao: "Perfis ocos retangulares", linhas: [%s] }
};

if (typeof module !== "undefined") module.exports = PERFIS_TUBULARES;
""" % (bloco(linhas_js["CHS"]), bloco(linhas_js["SHS"]), bloco(linhas_js["RHS"])))
    with open(REFERENCIAS, "w", encoding="utf-8") as f:
        json.dump({"fonte": "gerado por ferramentas/dados_tubulares.py; só para testes/verificar.js",
                   "divergencias": divergencias, "linhas": refs}, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    for forma in ("CHS", "SHS", "RHS"):
        ls = linhas_js[forma]
        print(forma, len(ls), "secções;", "Ferpinta", sum(1 for l in ls if "F" in l[-2]),
              "· só HIASA", sum(1 for l in ls if l[-2] == "H"), "· só Nordesfer", sum(1 for l in ls if l[-2] == "N"),
              "· EN 2/1/0:", [sum(1 for l in ls if l[-1] == e) for e in (2, 1, 0)])
    print(len(divergencias), "linhas da HIASA/Nordesfer fora por divergência de massa:")
    for d in divergencias:
        print("   ", d)


if __name__ == "__main__":
    main()
