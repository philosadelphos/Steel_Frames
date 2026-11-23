"""
Gera src/js/madremax.js a partir do catálogo Madremax® da Constálica em docs/catalogos/ (fora do git):
stVNwIicK-catalogo_madremax.pdf (MKC002_0219), madres em ómega de aço S350GD + Z275 (EN 10346).

O catálogo dá, para cada uma das 9 secções, três disposições (simples, duas encaixadas e duas costas com costas)
com as dimensões e as propriedades da SECÇÃO BRUTA. A app usa as Madremax só no Identificar e no Catálogo; não entram
no dimensionamento das madres (falta a secção efetiva, EN 1993-1-3).

Não corre no CI: precisa do catálogo e do pdftotext (poppler). Correr com: python3 ferramentas/dados_madremax.py
"""
import json
import os
import re
import subprocess

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGO = os.path.join(RAIZ, "docs", "catalogos", "stVNwIicK-catalogo_madremax.pdf")
SAIDA = os.path.join(RAIZ, "src", "js", "madremax.js")
DISPOSICOES = ["simples", "encaixada", "costas"]


def num(txt):
    v = float(txt.replace(",", "."))
    return int(v) if v == int(v) else v


def main():
    txt = subprocess.run(["pdftotext", "-layout", CATALOGO, "-"], capture_output=True, text=True, check=True).stdout
    # Designações, pela ordem do catálogo, na lista do texto descritivo em português (texto corrido, sem -layout):
    # «Nove (9) tipos de secções Madremax®: 50x1.5, 100x1.5, …, 300x3.0;».
    corrido = subprocess.run(["pdftotext", CATALOGO, "-"], capture_output=True, text=True, check=True).stdout.replace("\n", " ")
    lista = re.search(r"Nove \(9\) tipos de secções Madremax®:([^;]*);", corrido)
    nomes = re.findall(r"(\d+)x(\d\.\d)", lista.group(1))
    assert len(nomes) == 9, nomes
    n = r"(\d+(?:,\d+)?)"
    # Linha da tabela: H, h1 (ou -), b1 (ou -), b2, b3, t, y1, G, A, desenvolvimento (ou -), Iy, Wy,min, iy, Iz, Wz,min, iz, furação, parafuso.
    padrao = re.compile(r"^\s*" + n + r"\s+(-|" + n[1:-1] + r")\s+(-|" + n[1:-1] + r")\s+" + r"\s+".join([n] * 6) +
                        r"\s+(-|\d+)\s+" + r"\s+".join([n] * 6) + r"\s+(Ø\S+)\s+(M\S+)")
    linhas = []
    for l in txt.splitlines():
        m = padrao.match(l)
        if m:
            g = m.groups()
            v = lambda x: None if x == "-" else num(x)
            linhas.append({"H": v(g[0]), "h1": v(g[1]), "b1": v(g[2]), "b2": v(g[3]), "b3": v(g[4]), "t": v(g[5]), "y1": v(g[6]),
                           "G": v(g[7]), "A": v(g[8]), "desenv": v(g[9]), "Iy": v(g[10]), "Wy": v(g[11]), "iy": v(g[12]),
                           "Iz": v(g[13]), "Wz": v(g[14]), "iz": v(g[15]), "furo": g[16], "parafuso": g[17]})
    assert len(linhas) == 27, len(linhas)
    seccoes = []
    for k, (nom, t) in enumerate(nomes):
        trio = linhas[3 * k:3 * k + 3]
        s = trio[0]
        assert abs(s["t"] - float(t)) < 1e-9, (nom, t, s["t"])
        seccoes.append({
            "nome": "Madremax %s×%s" % (nom, t.replace(".", ",")), "serie": int(nom),
            "H": s["H"], "h1": s["h1"], "b1": s["b1"], "b2": s["b2"], "b3": s["b3"], "t": s["t"], "y1": s["y1"],
            "G": s["G"], "A": s["A"] / 100, "desenv": s["desenv"],
            "Iy": s["Iy"], "Wy": s["Wy"], "iy": s["iy"], "Iz": s["Iz"], "Wz": s["Wz"], "iz": s["iz"],
            "furo": s["furo"], "parafuso": s["parafuso"],
            "duplas": {d: {"H": r["H"], "t": r["t"], "y1": r["y1"], "G": r["G"], "A": r["A"] / 100, "Iy": r["Iy"], "Wy": r["Wy"],
                           "iy": r["iy"], "Iz": r["Iz"], "Wz": r["Wz"], "iz": r["iz"]}
                       for d, r in zip(DISPOSICOES[1:], trio[1:])}
        })
    corpo = ",\n".join("    " + json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in seccoes)
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("""/*
 * Madres Madremax® da Constálica (ómega com abas dobradas em V), aço S350GD + Z275 (EN 10346).
 * Ficheiro gerado por ferramentas/dados_madremax.py a partir do catálogo MKC002_0219 (docs/catalogos/, fora do git).
 * Não editar à mão.
 *
 * Propriedades da SECÇÃO BRUTA, tal como o catálogo as dá (sem efeitos de encurvadura local): por isso as Madremax
 * entram só no Identificar e no Catálogo, e não no dimensionamento das madres.
 * Dimensões (mm): H altura total, h1 altura dos furos da alma, b1 largura do topo, b2 entre as linhas de furação das
 * abas, b3 largura total nas pontas das abas, t espessura nominal (com o zinco), y1 centro de gravidade à base.
 * G (kg/m), A (cm²), desenv (desenvolvimento, mm), Iy, Iz (cm⁴), Wy, Wz (mínimos, cm³), iy, iz (cm).
 * Eixo y-y horizontal (flexão sob a carga da cobertura), z-z vertical.
 * duplas: disposições do catálogo com duas madres, encaixadas (zona de sobreposição) e costas com costas.
 */
var MADREMAX = {
  fabricante: "Constálica",
  aco: "S350GD",
  seccoes: [
%s
  ]
};

if (typeof module !== "undefined") module.exports = MADREMAX;
""" % corpo)
    for s in seccoes:
        print(s["nome"], "H", s["H"], "b3", s["b3"], "t", s["t"], "A", s["A"], "Iy", s["Iy"])


if __name__ == "__main__":
    main()
