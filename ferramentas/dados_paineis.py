"""
Gera src/js/paineis.js a partir das tabelas de cargas dos painéis sandwich de cobertura (docs/catalogos/, fora do git):
- O Feliz, catálogo OFPA-Sandwich-Panel.pdf: Topcover 3, 5, Cap e Tile, tabelas de cálculo direto por espessura das
  chapas, apoio simples e múltiplo, cargas ascendentes e descendentes (kN/m², valores característicos além do peso
  próprio e das variações diferenciais de temperatura; ELU e flecha de serviço ≤ L/200);
- Panel Sandwich Group, fichas painel-sandwich-cinco-ondas.pdf e painel-sandwich-tres-ondas.pdf: "tabela de cargas
  admissíveis" a 2 vãos, em kg/m² (5 ondas: pressão/sucção; 3 ondas: um só valor), sem indicação da chapa nem do
  critério. Ficam marcadas como indicativas.

Onde a tabela do fabricante sobe com o vão (gralha), usa-se o menor valor dos vãos anteriores e regista-se a correção.

Não corre no CI: precisa dos catálogos e do pdftotext (poppler). Correr com: python3 ferramentas/dados_paineis.py
"""
import json
import os
import re
import subprocess

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGOS = os.path.join(RAIZ, "docs", "catalogos")
SAIDA = os.path.join(RAIZ, "src", "js", "paineis.js")
OFELIZ = ["Topcover® 3", "Topcover® 5", "Topcover® Cap", "Topcover® Tile"]   # painéis de cobertura
KGF = 9.81 / 1000   # kg/m² → kN/m²


def texto(nome):
    return subprocess.run(["pdftotext", "-layout", os.path.join(CATALOGOS, nome), "-"],
                          capture_output=True, text=True, check=True).stdout.splitlines()


def numeros(txt):
    return [float(x.replace(",", ".")) for x in re.findall(r"\d+,\d+", txt)]


def fmt(x):
    return ("%.2f" % x).replace(".", ",")


def envolvente(valores, vaos, rotulo, correcoes):
    """Torna a lista não crescente com o vão, registando cada valor que o catálogo dá acima do de um vão menor."""
    saida = []
    for i, v in enumerate(valores):
        if saida and v > saida[-1]:
            correcoes.append("%s, vão %s m: o catálogo dá %s, mais do que nos vãos menores; usa-se %s." % (rotulo, fmt(vaos[i]), fmt(v), fmt(saida[-1])))
            v = saida[-1]
        saida.append(v)
    return saida


def ofeliz():
    dados, produto, faces, apoio, vaos = {}, None, None, None, None
    pendente_asc, rotulo, peso_pendente = None, None, None
    for ln in texto("OFPA-Sandwich-Panel.pdf"):
        cab = ln.strip()
        if cab in OFELIZ:
            produto = cab.replace("®", "")
            dados.setdefault(produto, {"fabricante": "O Feliz", "faces": {}})
            continue
        if produto is None:
            continue
        if cab.startswith("Indwall") or cab.startswith("Topcover® Deck"):
            produto = None
            continue
        # O expoente de "Kg/m²" às vezes parte a linha: os pesos ficam então na linha seguinte.
        if peso_pendente and numeros(cab):
            dados[produto]["faces"].setdefault(peso_pendente, {})["pesos"] = numeros(cab)
            peso_pendente = None
            continue
        m = re.match(r"Peso \((?:Chapa Aço \| Espessura )?(\d,\d/\d,\d)\)\s+Kg/m\s*2?\s*(.*)", cab)
        if m:
            if numeros(m.group(2)):
                dados[produto]["faces"].setdefault(m.group(1), {})["pesos"] = numeros(m.group(2))
            else:
                peso_pendente = m.group(1)
            continue
        m = re.match(r"Espessura\s+mm\s+(.*)", cab)
        if m and "W/m" not in cab:
            dados[produto]["espessuras"] = [int(x) for x in m.group(1).split()]
            continue
        m = re.search(r"Chapa Aço \| Espessuras (\d,\d/\d,\d)", ln)
        if m:
            faces = m.group(1)
        if "Condição de apoio simples" in ln:
            apoio = "simples"
        if "Condição de apoio múltiplo" in ln:
            apoio = "multiplo"
        if re.match(r"mm\s+▲▼", cab):
            vaos = numeros(cab)
            continue
        # Linhas da tabela: ▲ (ascendente) e ▼ (descendente); a espessura pode estar em qualquer uma ou entre as duas.
        so_esp = re.fullmatch(r"(\d{2,3})", cab)
        if so_esp:
            rotulo = int(so_esp.group(1))
            continue
        if "▲" in ln and "▼" not in ln and vaos:
            antes = ln.split("▲")[0].strip()
            rotulo = int(antes) if antes.isdigit() else rotulo
            pendente_asc = numeros(ln.split("▲")[1])
            continue
        if "▼" in ln and "▲" not in ln and vaos and pendente_asc is not None:
            antes = ln.split("▼")[0].strip()
            esp = int(antes) if antes.isdigit() else rotulo
            tab = dados[produto]["faces"].setdefault(faces, {}).setdefault(apoio, {"vaos": vaos, "cargas": {}})
            tab["cargas"][str(esp)] = {"asc": pendente_asc, "desc": numeros(ln.split("▼")[1])}
            pendente_asc, rotulo = None, None
    for p in dados.values():
        p.update({"largura": 1000, "fonte": "catálogo OFPA (O Feliz), tabelas de cálculo direto", "indicativo": False})
    return dados


def psg(ficheiro, nome, dois_valores):
    linhas = texto(ficheiro)
    i = next(k for k, ln in enumerate(linhas) if "TABELA DE CARGAS ADMISS" in ln)
    vaos = [float(x.replace(",", ".")) for x in linhas[i + 2].split(")")[1].split()]
    cargas, pesos, espessuras = {}, [], []
    for ln in linhas[i + 3:]:
        partes = ln.split()
        if not partes:
            continue
        if not partes[0].isdigit():
            break
        esp = partes[0]
        if dois_valores:
            pares = [x.split("/") for x in partes[1:]]
            cargas[esp] = {"desc": [round(int(a) * KGF, 3) for a, b in pares], "asc": [round(int(b) * KGF, 3) for a, b in pares]}
        else:
            v = [round(int(x) * KGF, 3) for x in partes[1:]]
            cargas[esp] = {"desc": v, "asc": list(v)}
        espessuras.append(int(esp))
    j = next(k for k, ln in enumerate(linhas) if re.match(r"\s*ESPESSURA\s+TRANSMISS", ln))
    for ln in linhas[j + 2:j + 2 + len(espessuras)]:
        pesos.append(numeros(ln)[-1])
    return {"fabricante": "Panel Sandwich Group", "largura": 1000, "espessuras": espessuras, "indicativo": True,
            "fonte": "ficha técnica " + ficheiro + " (tabela de cargas admissíveis a 2 vãos, em kg/m²" +
                     (", pressão/sucção" if dois_valores else ", um só valor para os dois sentidos") + ")",
            "faces": {"não indicada": {"pesos": pesos, "multiplo": {"vaos": vaos, "cargas": cargas}}}}


def main():
    dados = ofeliz()
    dados["PSG 5 ondas"] = psg("painel-sandwich-cinco-ondas.pdf", "5 ondas", True)
    dados["PSG 3 ondas"] = psg("painel-sandwich-tres-ondas.pdf", "3 ondas", False)
    for nome, p in dados.items():
        p["correcoes"] = []
        for faces, f in p["faces"].items():
            for apoio in ("simples", "multiplo"):
                if apoio not in f:
                    continue
                t = f[apoio]
                for esp, c in t["cargas"].items():
                    for sentido, nome_s in (("desc", "descendente"), ("asc", "ascendente")):
                        chapas = "" if faces == "não indicada" else ", chapas " + faces
                        rot = "%s %s mm%s, apoio %s, carga %s" % (nome, esp, chapas, "simples" if apoio == "simples" else "múltiplo", nome_s)
                        c[sentido] = envolvente(c[sentido], t["vaos"], rot, p["correcoes"])
    js = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("""/*
 * Painéis sandwich de cobertura: tabelas de cargas dos fabricantes. Ficheiro gerado por ferramentas/dados_paineis.py
 * a partir dos catálogos em docs/catalogos/ (fora do git). Não editar à mão.
 * Por produto: fabricante, largura útil (mm), espessuras do painel (mm), indicativo (true quando a ficha não diz a
 * chapa nem o critério), correções (gralhas do catálogo tornadas não crescentes com o vão) e, por espessura das
 * chapas exterior/interior (mm): pesos (kg/m², pela ordem das espessuras); simples e multiplo: vãos (m) e, por
 * espessura do painel, as cargas uniformes admissíveis (kN/m²) ascendentes (asc) e descendentes (desc), pela ordem
 * dos vãos. Uma lista mais curta do que a dos vãos quer dizer que o fabricante não admite os vãos seguintes.
 * O Feliz: valores característicos além do peso próprio e da temperatura (ELU e flecha ≤ L/200).
 */
var PAINEIS = """ + js + ";\n\nif (typeof module !== \"undefined\") module.exports = PAINEIS;\n")
    for p, v in dados.items():
        print(p, v["espessuras"], {k: {a: len(t[a]["cargas"]) for a in ("simples", "multiplo") if a in t} for k, t in v["faces"].items()})
        for c in v["correcoes"]:
            print("   ", c)


if __name__ == "__main__":
    main()
