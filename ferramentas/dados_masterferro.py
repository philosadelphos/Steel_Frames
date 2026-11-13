"""
Gera src/js/perfis-lt.js a partir das tabelas técnicas da Masterferro (Braga) em docs/catalogos/ (fora do git):
- TT2.4, cantoneiras de abas iguais (massa por aba e espessura);
- TT2.5, cantoneiras de abas desiguais (massa por secção e espessura);
- TT2.6, barras T de abas iguais (B = H, massa por secção).

Os catálogos só dão as dimensões e a massa por metro (aço S275JR). Os raios de concordância (r1 na raiz, r2 nas
pontas das abas e, nos T, r3 na ponta da alma) vêm da EN 10056-1 (cantoneiras) e da EN 10055 (T). Nas secções que
a Masterferro vende fora das listas da norma, usa-se o raio da mesma aba ou do mesmo par de abas da norma; quando
nem isso existe, um raio estimado pela série vizinha, assinalado. A massa do catálogo só serve para conferir o
cálculo (testes/verificar.js); as propriedades calculam-se em src/js/seccao.js.

Não corre no CI: precisa dos catálogos e do pdftotext (poppler). Correr com: python3 ferramentas/dados_masterferro.py
"""
import json
import os
import re
import subprocess

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGOS = os.path.join(RAIZ, "docs", "catalogos")
SAIDA = os.path.join(RAIZ, "src", "js", "perfis-lt.js")
IGUAIS = "1626027485_4032_TT2.4_cant.ab.iguais.pdf"
DESIGUAIS = "1626027514_2769_TT2.5_cant.ab.desiguais.pdf"
BARRAS_T = "1626027530_5621_TT2.6_barrat.pdf"

# Origem dos raios: "EN" (secção da norma), "aba" (secção fora da lista da norma, raio da mesma aba ou do mesmo par
# de abas, que na norma não depende da espessura) e "estimado" (aba ou par que a norma não tem).
#
# EN 10056-1, cantoneiras de abas iguais: r1 por aba (r2 = r1/2).
R_IGUAIS = {20: 3.5, 25: 3.5, 30: 5, 35: 5, 40: 6, 45: 7, 50: 7, 60: 8, 65: 9, 70: 9, 75: 9, 80: 10, 90: 11,
            100: 12, 120: 13, 130: 14, 150: 16, 160: 17, 180: 18, 200: 18, 250: 18}
R_IGUAIS_ESTIMADO = {12: 3.5, 16: 3.5, 55: 8}
# Secções de abas iguais da EN 10056-1 (aba, espessura).
EN_IGUAIS = {(20, 3), (25, 3), (25, 4), (25, 5), (30, 3), (30, 4), (30, 5), (35, 4), (40, 3), (40, 4), (40, 5),
             (40, 6), (45, 3), (45, 4), (45, 4.5), (45, 5), (45, 6), (50, 3), (50, 4), (50, 5), (50, 6), (50, 8),
             (60, 5), (60, 6), (60, 8), (60, 10), (65, 7), (70, 6), (70, 7), (70, 8), (70, 10), (75, 6), (75, 8),
             (80, 6), (80, 8), (80, 10), (90, 6), (90, 7), (90, 8), (90, 9), (90, 10), (90, 12), (100, 8), (100, 10),
             (100, 12), (100, 15), (120, 8), (120, 10), (120, 12), (120, 15), (130, 12), (150, 10), (150, 12),
             (150, 15), (150, 18), (160, 15), (180, 16), (180, 18), (200, 16), (200, 18), (200, 20), (200, 24)}
# EN 10056-1, cantoneiras de abas desiguais: r1 por par de abas (r2 = r1/2) e secções da norma.
R_DESIGUAIS = {(30, 20): 4, (40, 20): 4, (40, 25): 4, (45, 30): 4.5, (50, 30): 5, (60, 30): 5, (60, 40): 6,
               (65, 50): 6, (70, 50): 7, (75, 50): 7, (80, 40): 7, (80, 60): 8, (100, 50): 8, (100, 65): 10,
               (100, 75): 10, (120, 80): 11, (125, 75): 11, (135, 65): 11, (150, 75): 12, (150, 90): 12,
               (150, 100): 12, (200, 100): 15, (200, 150): 15}
R_DESIGUAIS_ESTIMADO = {(50, 40): 5, (90, 60): 8, (120, 60): 11, (130, 65): 11}
EN_DESIGUAIS = {(30, 20, 3), (30, 20, 4), (40, 20, 4), (40, 25, 4), (45, 30, 4), (50, 30, 5), (60, 30, 5),
                (60, 40, 5), (60, 40, 6), (65, 50, 5), (70, 50, 6), (75, 50, 6), (75, 50, 8), (80, 40, 6),
                (80, 40, 8), (80, 60, 7), (100, 50, 6), (100, 50, 8), (100, 65, 7), (100, 65, 8), (100, 65, 10),
                (100, 75, 8), (100, 75, 10), (100, 75, 12), (120, 80, 8), (120, 80, 10), (120, 80, 12),
                (125, 75, 8), (125, 75, 10), (125, 75, 12), (135, 65, 8), (135, 65, 10), (150, 75, 9),
                (150, 75, 10), (150, 75, 12), (150, 75, 15), (150, 90, 10), (150, 90, 12), (150, 90, 15),
                (150, 100, 10), (150, 100, 12), (200, 100, 10), (200, 100, 12), (200, 100, 15), (200, 150, 12),
                (200, 150, 15), (200, 150, 18)}
# EN 10055, T de abas iguais: h = b, t, r1, r2, r3 (mm).
EN_T = {20: (3, 3, 1.5, 1), 25: (3.5, 3.5, 2, 1), 30: (4, 4, 2, 1), 35: (4.5, 4.5, 2.5, 1), 40: (5, 5, 2.5, 1),
        45: (5.5, 5.5, 3, 1.5), 50: (6, 6, 3, 1.5), 60: (7, 7, 3.5, 2), 70: (8, 8, 4, 2), 80: (9, 9, 4.5, 2),
        90: (10, 10, 5, 2.5), 100: (11, 11, 5.5, 3), 120: (13, 13, 6.5, 3), 140: (15, 15, 7.5, 4)}
T_ESTIMADO = {12: (2, 1, 0.5), 16: (3, 1.5, 1)}


def num(txt):
    v = float(str(txt).replace(",", "."))
    return int(v) if v == int(v) else v


def palavras(nome):
    """Palavras do PDF com o centro (x) e o topo (y), pela saída -bbox do pdftotext."""
    html = subprocess.run(["pdftotext", "-bbox", os.path.join(CATALOGOS, nome), "-"],
                          capture_output=True, text=True, check=True).stdout
    out = []
    for x0, y0, x1, _, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', html):
        out.append(((float(x0) + float(x1)) / 2, float(y0), w))
    return out


def texto(nome):
    return subprocess.run(["pdftotext", "-layout", os.path.join(CATALOGOS, nome), "-"],
                          capture_output=True, text=True, check=True).stdout


def linhas_por_y(ws, tol=2.5):
    grupos = []
    for x, y, w in sorted(ws, key=lambda p: p[1]):
        if grupos and abs(grupos[-1][0] - y) <= tol:
            grupos[-1][1].append((x, w))
        else:
            grupos.append([y, [(x, w)]])
    return [sorted(g[1]) for g in grupos]


def nome_l(a, b, t):
    f = lambda v: str(v).replace(".", ",")
    return "L %s×%s×%s" % (f(a), f(b), f(t))


def iguais():
    """Quadro de dupla entrada: linhas = aba, colunas = espessura (pela posição x do cabeçalho)."""
    linhas = linhas_por_y(palavras(IGUAIS))
    cab = next(l for l in linhas if len(l) > 10 and all(re.fullmatch(r"\d+", w) for _, w in l))
    colunas = [(x, int(w)) for x, w in cab]
    txt = texto(IGUAIS)
    # Nota do catálogo: "L35x35x3=35x35x3.5 (mm)".
    nota = re.search(r"L(\d+)x\1x(\d+)\s*=\s*\1x\1x(\d+[.,]\d+)", txt)
    troca = (int(nota.group(1)), int(nota.group(2)), num(nota.group(3))) if nota else None
    saida = []
    for l in linhas:
        if l is cab or not re.fullmatch(r"\d+", l[0][1]) or len(l) < 2 or not all(re.fullmatch(r"\d+,\d+", w) for _, w in l[1:]):
            continue
        a = int(l[0][1])
        for x, w in l[1:]:
            t = min(colunas, key=lambda c: abs(c[0] - x))
            assert abs(t[0] - x) < 6, (a, x, w)
            t = t[1]
            if troca and (a, t) == troca[:2]:
                t = troca[2]
            if (a, t) in EN_IGUAIS:
                r1, origem = R_IGUAIS[a], "EN"
            elif a in R_IGUAIS:
                r1, origem = R_IGUAIS[a], "aba"
            else:
                r1, origem = R_IGUAIS_ESTIMADO[a], "estimado"
            saida.append([nome_l(a, a, t), a, t, r1, num(r1 / 2), num(w), origem])
    return saida


def desiguais():
    saida = []
    for a, b, t, m in re.findall(r"(\d+)x(\d+)\s+(\d+(?:,\d+)?)\s+(\d+,\d+)", texto(DESIGUAIS)):
        a, b, t = int(a), int(b), num(t)
        if (a, b, t) in EN_DESIGUAIS:
            r1, origem = R_DESIGUAIS[(a, b)], "EN"
        elif (a, b) in R_DESIGUAIS:
            r1, origem = R_DESIGUAIS[(a, b)], "aba"
        else:
            r1, origem = R_DESIGUAIS_ESTIMADO[(a, b)], "estimado"
        saida.append([nome_l(a, b, t), a, b, t, r1, num(r1 / 2), num(m), origem])
    return sorted(saida, key=lambda l: (l[1], l[2], l[3]))


def barras_t():
    saida = []
    for h, t, m in re.findall(r"^\s+(\d+)\s+(\d+(?:,\d+)?)\s+(\d+,\d+)\s*$", texto(BARRAS_T), re.M):
        h, t = int(h), num(t)
        if h in EN_T and EN_T[h][0] == t:
            r1, r2, r3 = EN_T[h][1:]
            origem = "EN"
        else:
            r1, r2, r3 = T_ESTIMADO[h]
            origem = "estimado"
        saida.append(["T " + str(h), h, h, t, r1, r2, r3, num(m), origem])
    return saida


def main():
    dados = {
        "fornecedor": "Masterferro (Braga), tabelas técnicas TT2.4, TT2.5 e TT2.6",
        "aco": "S275JR",
        "Liguais": {"descricao": "Cantoneiras de abas iguais", "norma": "EN 10056-1", "linhas": iguais()},
        "Ldesiguais": {"descricao": "Cantoneiras de abas desiguais", "norma": "EN 10056-1", "linhas": desiguais()},
        "T": {"descricao": "Perfis T de abas iguais, banzo e alma inclinados", "norma": "EN 10055", "linhas": barras_t()},
    }
    corpo = ",\n".join(
        '  %s: {\n    descricao: %s, norma: %s,\n    linhas: [\n%s\n    ]\n  }' % (
            fam, json.dumps(d["descricao"], ensure_ascii=False), json.dumps(d["norma"]),
            ",\n".join("      " + json.dumps(l, ensure_ascii=False) for l in d["linhas"]))
        for fam, d in dados.items() if isinstance(d, dict))
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("""/*
 * Cantoneiras e perfis T laminados a quente: gama da %s, aço %s.
 * Ficheiro gerado por ferramentas/dados_masterferro.py a partir dos catálogos em docs/catalogos/ (fora do git).
 * Não editar à mão.
 *
 * Os catálogos só dão as dimensões e a massa por metro; os raios de concordância são os da EN 10056-1
 * (cantoneiras: r1 na raiz, r2 = r1/2 nas pontas) e da EN 10055 (T: r1 na raiz, r2 nas pontas do banzo, r3 na
 * ponta da alma). Origem dos raios: "EN" secção da norma; "aba" secção fora da lista da norma, com o raio da mesma
 * aba (ou par de abas), que na norma não depende da espessura; "estimado" aba que a norma não tem.
 * A massa do fornecedor (kg/m) serve só para conferir o cálculo (testes/verificar.js).
 *   Liguais:    [designação, a, t, r1, r2, massa, origem]
 *   Ldesiguais: [designação, a (aba maior), b (aba menor), t, r1, r2, massa, origem]
 *   T:          [designação, h, b, t, r1, r2, r3, massa, origem]
 * Dimensões em mm.
 */
var PERFIS_LT = {
  fornecedor: %s,
  aco: %s,
%s
};

if (typeof module !== "undefined") module.exports = PERFIS_LT;
""" % (dados["fornecedor"], dados["aco"], json.dumps(dados["fornecedor"], ensure_ascii=False), json.dumps(dados["aco"]), corpo))
    for fam in ("Liguais", "Ldesiguais", "T"):
        ls = dados[fam]["linhas"]
        origem = {o: sum(1 for l in ls if l[-1] == o) for o in ("EN", "aba", "estimado")}
        print(fam, len(ls), "secções", origem)
        for l in ls:
            if l[-1] != "EN":
                print("   ", l[0], l[-1])


if __name__ == "__main__":
    main()
