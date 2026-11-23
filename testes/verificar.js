/*
 * Compara as propriedades calculadas com os valores publicados nos catálogos
 * de perfis (ArcelorMittal, Sections and Merchant Bars; cantoneiras, T e tubos: ver abaixo). Correr com: node testes/verificar.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.PERFIS_U = require("../src/js/perfis-u.js");
global.PERFIS_LT = require("../src/js/perfis-lt.js");
global.PERFIS_TUBULARES = require("../src/js/perfis-tubulares.js");
var Seccao = require("../src/js/seccao.js");

var REFERENCIAS = {
  "IPE 200": { A: 28.48, G: 22.4, Iy: 1943, Wply: 220.6, Iz: 142.4, Wplz: 44.61, It: 6.98, Iw: 12.99e3, Avz: 14.00 },
  "IPE 300": { A: 53.81, G: 42.2, Iy: 8356, Wely: 557.1, Wply: 628.4, Iz: 603.8, Wplz: 125.2, It: 20.12, Iw: 125.9e3, Avz: 25.68, AL: 1.160 },
  "HEA 200": { A: 53.83, G: 42.3, Iy: 3692, Wply: 429.5, Iz: 1336, Wplz: 203.8, It: 20.98, Iw: 108.0e3, Avz: 18.08 },
  "HEB 300": { A: 149.1, G: 117, Iy: 25170, Wply: 1869, Iz: 8563, Wplz: 870.1, It: 185.0, Iw: 1688e3, Avz: 47.43 },
  "HEM 300": { A: 303.1, Iy: 59200, Wply: 4078, Iz: 19400, It: 1408, Iw: 4386e3 }
};
var TOLERANCIA = 0.015;

var falhas = 0, verificados = 0;
Seccao.todos().forEach(function (p) {
  var ref = REFERENCIAS[p.nome];
  if (!ref) return;
  var props = Seccao.propriedades(p);
  Object.keys(ref).forEach(function (k) {
    verificados++;
    var desvio = (props[k] - ref[k]) / ref[k];
    var ok = Math.abs(desvio) <= TOLERANCIA;
    if (!ok) falhas++;
    console.log((ok ? "ok   " : "FALHA") + "  " + p.nome.padEnd(8) + k.padEnd(5) +
      props[k].toPrecision(5).padStart(10) + "  ref " + String(ref[k]).padStart(8) +
      "  " + (desvio * 100).toFixed(2) + " %");
  });
});

// Classificação: IPE 300 em S355 é classe 1 à flexão; HEA 1000 em S355 tem alma de classe 4 à compressão.
var porNome = {};
Seccao.todos().forEach(function (p) { porNome[p.nome] = p; });
function esperar(desc, valor, esperado) {
  verificados++;
  var ok = valor === esperado;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + " = " + valor + " (esperado " + esperado + ")");
}
esperar("IPE 300 S355 classe flexão", Seccao.classificar(porNome["IPE 300"], 355).flexao, 1);
esperar("HEA 1000 S355 classe compressão", Seccao.classificar(porNome["HEA 1000"], 355).compressao, 4);
esperar("HEB 300 S275 classe compressão", Seccao.classificar(porNome["HEB 300"], 275).compressao, 1);

// fy e fu pela norma de produto (NA–3.2.1(1)): escalões ≤ 16, ≤ 40, ≤ 63, ≤ 80 mm da EN 10025-2/-3.
esperar("S355 fy com t = 16 mm", Seccao.tensoes("S355", 16).fy, 355);
esperar("S355 fy com t = 16,5 mm", Seccao.tensoes("S355", 16.5).fy, 345);
esperar("S355 fy com t = 40 mm", Seccao.tensoes("S355", 40).fy, 345);
esperar("S275 fy com t = 41 mm", Seccao.tensoes("S275", 41).fy, 255);
esperar("S235 fy com t = 70 mm", Seccao.tensoes("S235", 70).fy, 215);
esperar("S460 fy com t = 19 mm (EN 10025-3)", Seccao.tensoes("S460", 19).fy, 440);
esperar("S355 fu (3 ≤ t ≤ 100 mm)", Seccao.tensoes("S355", 10).fu, 470);
esperar("HEB 300 S275 (tf = 19 mm) fy", Seccao.tensoes("S275", porNome["HEB 300"].tf).fy, 265);

// Perfis U: área e peso calculados pelo contorno (banzos inclinados do UPN e concordâncias) contra o fornecedor.
var maxA = 0, maxG = 0;
Seccao.todosU().forEach(function (p) {
  var pr = Seccao.propriedadesU(p), f = PERFIS_U[p.familia].fornecedor[p.nome];
  maxA = Math.max(maxA, Math.abs(pr.A / f[0] - 1)); maxG = Math.max(maxG, Math.abs(pr.G / f[1] - 1));
});
function dentro(desc, valor, esperado, tol) {
  verificados++;
  var d = valor / esperado - 1, ok = Math.abs(d) <= tol;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + " " + valor.toFixed(2) + " ref " + esperado + " " + (d * 100).toFixed(2) + " %");
}
dentro("UPN e UPE: maior desvio de A face ao fornecedor (32 secções)", 1 + maxA, 1, 0.01);
dentro("UPN e UPE: maior desvio de G face ao fornecedor (32 secções)", 1 + maxG, 1, 0.01);
// Valores de catálogo (ArcelorMittal, Sections and Merchant Bars) para alguns perfis.
var REF_U = {
  "UPN 100": { Iy: 206, Iz: 29.3 },
  "UPN 200": { Iy: 1910, Wely: 191, Wply: 228, Iz: 148, Welz: 27.0, Wplz: 51.8, ys: 2.01 },
  "UPN 300": { Iy: 8030, Iz: 495 },
  "UPE 200": { Iy: 1910, Iz: 187, Welz: 34.45 }
};
Seccao.todosU().forEach(function (p) {
  var ref = REF_U[p.nome]; if (!ref) return;
  var pr = Seccao.propriedadesU(p);
  Object.keys(ref).forEach(function (k) { dentro(p.nome + " " + k, pr[k], ref[k], 0.015); });
});

// ----- Cantoneiras (EN 10056-1) e perfis T (EN 10055), gama da Masterferro -----
// Massa calculada pelo contorno (com as concordâncias) contra a massa do catálogo, em todas as secções.
// Divergências do catálogo (docs/pendentes.md, secção 7): a massa publicada não corresponde à secção.
var DIVERGENCIAS = {
  "L 12×12×3": "raios estimados; o catálogo dá a mesma massa que ao T 12",
  "T 12": "raios estimados; o catálogo dá a mesma massa que à L 12×12×3",
  "L 20×20×3": "coluna t = 3 desalinhada: 1,11 kg/m é a massa da L 25×25×3",
  "L 25×25×3": "coluna t = 3 desalinhada: 1,35 kg/m é a massa da L 30×30×3",
  "L 30×30×3": "coluna t = 3 desalinhada: 1,85 kg/m é a da L 35×35×3,5",
  "L 150×150×15": "31,4 kg/m em vez de 33,8 kg/m (EN 10056-1)",
  "L 90×60×6": "6,28 kg/m é menos do que a massa das abas sem concordâncias (6,78 kg/m)"
};
var TODOS_LT = Seccao.todosLT(), porNomeLT = {}, maxLT = { L: 0, T: 0 }, nLT = 0;
TODOS_LT.forEach(function (p) {
  porNomeLT[p.nome] = p;
  var d = Seccao.propriedadesLT(p).G / p.massa - 1;
  if (DIVERGENCIAS[p.nome]) {
    verificados++;
    var ok = Math.abs(d) > 0.03;
    if (!ok) falhas++;
    console.log((ok ? "ok   " : "FALHA") + "  " + p.nome + ": divergência do catálogo ainda presente (" + (d * 100).toFixed(1) + " %) — " + DIVERGENCIAS[p.nome]);
  } else {
    maxLT[p.tipo] = Math.max(maxLT[p.tipo], Math.abs(d)); nLT++;
  }
});
Object.keys(DIVERGENCIAS).forEach(function (n) { if (!porNomeLT[n]) { verificados++; falhas++; console.log("FALHA  " + n + " não existe nos dados"); } });
dentro("Cantoneiras: maior desvio de G face à Masterferro (" + TODOS_LT.filter(function (p) { return p.tipo === "L" && !DIVERGENCIAS[p.nome]; }).length + " secções)", 1 + maxLT.L, 1, 0.01);
dentro("Perfis T: maior desvio de G face à Masterferro (" + TODOS_LT.filter(function (p) { return p.tipo === "T" && !DIVERGENCIAS[p.nome]; }).length + " secções)", 1 + maxLT.T, 1, 0.01);

// Propriedades publicadas: tabela da DIN EN 10056-1 (prontuário alemão de 1998) e British Steel (BS EN 10056-1,
// 2026) nas cantoneiras; nos T, tabela de um fabricante com as dimensões da DIN 1024 / EN 10055 (T30 a T50).
// cz, cy: distâncias de G ao dorso da aba menor e da aba maior; e: de G à face do banzo do T.
var REF_LT = {
  "L 40×40×4": { A: 3.08, cz: 1.12, Iy: 4.47, iy: 1.21, Wely: 1.55, Iu: 7.09, Iv: 1.86, iv: 0.777, Welv: 1.17 },
  "L 50×50×5": { A: 4.80, cz: 1.40, Iy: 11.0, Wely: 3.05, Iu: 17.4, iu: 1.90, Iv: 4.55, Welv: 2.29 },
  "L 80×80×8": { A: 12.3, cz: 2.26, Iy: 72.2, Wely: 12.6, Iu: 115, Iv: 29.9, Welv: 9.37 },
  "L 100×100×10": { A: 19.2, cz: 2.82, Iy: 177, iy: 3.04, Wely: 24.6, Iu: 280, Iv: 73.0, iv: 1.95, Welv: 18.3 },
  "L 150×150×12": { A: 34.8, cz: 4.12, Iy: 737, iy: 4.60, Wely: 67.8, Iu: 1170, iu: 5.80, Iv: 303, iv: 2.95 },
  "L 200×200×20": { A: 76.3, cz: 5.68, Iy: 2851, Wely: 199, Iu: 4530, Iv: 1170, iv: 3.92 },
  "L 30×20×3": { A: 1.43, cz: 0.990, cy: 0.502, Iy: 1.25, Iz: 0.437, Iu: 1.43, Iv: 0.256, tanAlfa: 0.427, Wely: 0.621, Welz: 0.292 },
  "L 60×40×6": { A: 5.68, cz: 2.00, cy: 1.01, Iy: 20.1, Iz: 7.12, Iu: 23.1, Iv: 4.16, tanAlfa: 0.431, Wely: 5.03, Welz: 2.38 },
  "L 80×40×8": { A: 9.01, cz: 2.94, cy: 0.963, Iy: 57.6, Iz: 9.61, Iu: 60.9, Iv: 6.34, tanAlfa: 0.253, Wely: 11.4, Welz: 3.16 },
  "L 100×75×10": { A: 16.6, cz: 3.19, cy: 1.95, Iy: 162, Iz: 77.6, Iu: 197, Iv: 42.2, tanAlfa: 0.544, Wely: 23.8, Welz: 14.0 },
  "L 120×80×10": { A: 19.1, cz: 3.92, cy: 1.95, Iy: 276, Iz: 98.1, Iu: 317, Iv: 56.8, tanAlfa: 0.435, Wely: 34.1, Welz: 16.2 },
  "L 200×100×10": { A: 29.2, cz: 6.93, cy: 2.01, Iy: 1219, Iz: 210, Iu: 1290, Iv: 135, iy: 6.46, iz: 2.68, iu: 6.65, iv: 2.15, Wely: 93.3, Welz: 26.3, tanAlfa: 0.263 },
  "T 30": { A: 2.26, e: 0.85, Iy: 1.72, Wely: 0.80, iy: 0.87, Iz: 0.87, Welz: 0.58, iz: 0.62 },
  "T 35": { A: 2.97, e: 0.99, Iy: 3.10, Wely: 1.23, iy: 1.04, Iz: 1.57, Welz: 0.90, iz: 0.73 },
  "T 40": { A: 3.77, e: 1.12, Iy: 5.28, Wely: 1.84, iy: 1.18, Iz: 2.58, Welz: 1.29, iz: 0.83 },
  "T 50": { A: 5.66, e: 1.39, Iy: 12.1, Wely: 3.36, iy: 1.46, Iz: 6.06, Welz: 2.42, iz: 1.03 }
};
Object.keys(REF_LT).forEach(function (nome) {
  var p = porNomeLT[nome], ref = REF_LT[nome];
  if (!p) { verificados++; falhas++; console.log("FALHA  " + nome + " não existe nos dados"); return; }
  var pr = Seccao.propriedadesLT(p);
  // Os T têm a forma ajustada aos valores publicados (banzo e alma inclinados): tolerância maior.
  Object.keys(ref).forEach(function (k) { dentro(nome + " " + k, pr[k], ref[k], p.tipo === "T" ? 0.025 : 0.015); });
});
// Cantoneira de abas iguais: eixos principais a 45° e Iu + Iv = Iy + Iz.
(function () {
  var pr = Seccao.propriedadesLT(porNomeLT["L 60×60×6"]);
  dentro("L 60×60×6 tan α (abas iguais)", pr.tanAlfa, 1, 1e-9);
  dentro("L 60×60×6 Iu + Iv = Iy + Iz", pr.Iu + pr.Iv, pr.Iy + pr.Iz, 1e-9);
})();

// Classe à compressão (Quadro 5.2): linha das cantoneiras (h/t ≤ 15ε, (b + h)/2t ≤ 11,5ε) e abas em consola.
esperar("L 100×100×10 S275 classe compressão", Seccao.classificarLT(porNomeLT["L 100×100×10"], 275).compressao, 1);
esperar("L 120×120×10 S275 classe compressão ((b + h)/2t = 12 > 11,5ε)", Seccao.classificarLT(porNomeLT["L 120×120×10"], 275).compressao, 4);
esperar("L 200×100×10 S355 classe compressão (h/t = 20 > 15ε)", Seccao.classificarLT(porNomeLT["L 200×100×10"], 355).compressao, 4);
esperar("L 60×60×6 S355 classe compressão (h/t = 10 > 11,5ε)", Seccao.classificarLT(porNomeLT["L 60×60×6"], 355).compressao, 4);
esperar("T 50 S275 classe compressão", Seccao.classificarLT(porNomeLT["T 50"], 275).compressao, 1);

// ----- Perfis ocos estruturais (EN 10219): Ferpinta, HIASA e Nordesfer -----
// Propriedades pelas fórmulas do Anexo B da EN 10219-2 contra os catálogos (testes/referencias-tubulares.json,
// gerado por ferramentas/dados_tubulares.py). A Ferpinta dá A, I, W e i: confere-se tudo, linha a linha; os seus
// valores têm 2 a 3 casas decimais, por isso aceita-se também meia unidade da última casa (0,006).
(function () {
  var REF = require("./referencias-tubulares.json"), porChave = {};
  Seccao.todosTubos().forEach(function (p) { porChave[p.forma + "|" + p.h + "|" + (p.forma === "CHS" ? "" : p.b) + "|" + p.t] = p; });
  var maxF = {}, piorF = {}, nF = 0, faltam = 0, maxH = 0, maxN = 0, nH = 0, nN = 0, divNordesfer = 0, nComumN = 0;
  REF.linhas.forEach(function (r) {
    var p = porChave[r.forma + "|" + r.d1 + "|" + (r.forma === "CHS" ? "" : r.d2) + "|" + r.t];
    if (!p) { faltam++; return; }
    var pr = Seccao.propriedadesTubo(p), dm = Math.abs(pr.G / r.massa - 1);
    if (r.fonte === "Ferpinta") {
      nF++;
      [["massa", pr.G, r.massa], ["A", pr.A, r.A], ["I", pr.Iy, r.I], ["W", pr.Wely, r.W], ["i", pr.iy, r.i], ["Iz", pr.Iz, r.Iz], ["Wz", pr.Welz, r.Wz], ["iz", pr.iz, r.iz]]
        .forEach(function (q) {
          if (q[2] === null || q[2] === undefined) return;
          var d = Math.abs(q[1] - q[2]) <= 0.006 ? 0 : Math.abs(q[1] / q[2] - 1), k = r.forma + " " + q[0];
          if (!(k in maxF) || d > maxF[k]) { maxF[k] = d; piorF[k] = p.nome; }
        });
    } else if (r.comum) {
      if (r.fonte === "Nordesfer") { nComumN++; if (dm > 0.03) divNordesfer++; }
    } else if (r.fonte === "HIASA") { nH++; maxH = Math.max(maxH, dm); }
    else { nN++; maxN = Math.max(maxN, dm); }
  });
  verificados++; if (faltam) falhas++;
  console.log((faltam ? "FALHA" : "ok   ") + "  Tubos: todas as linhas dos catálogos têm secção nos dados (" + faltam + " em falta)");
  Object.keys(maxF).sort().forEach(function (k) {
    dentro("Ferpinta " + k + ": maior desvio para lá do arredondamento (" + nF + " linhas" + (maxF[k] ? "; pior " + piorF[k] : "") + ")", 1 + maxF[k], 1, 0.005);
  });
  dentro("HIASA: maior desvio de G nas secções só da HIASA (" + nH + ")", 1 + maxH, 1, 0.035);
  dentro("Nordesfer: maior desvio de G nas secções só da Nordesfer (" + nN + ")", 1 + maxN, 1, 0.03);
  console.log("info   Nordesfer: " + divNordesfer + " de " + nComumN + " linhas comuns com a Ferpinta ou a HIASA divergem mais de 3 % (catálogo com colunas desalinhadas); "
    + REF.divergencias.length + " linhas só da Nordesfer ficaram de fora pelo mesmo motivo.");

  var tubo = {};
  Seccao.todosTubos().forEach(function (p) { tubo[p.nome] = p; });
  // Raios de cálculo (Anexo B): ro = 2 T e ri = T até 6 mm; 2,5 T e 1,5 T até 10 mm; 3 T e 2 T acima.
  esperar("SHS 100×100×5: ro", tubo["SHS 100×100×5"].ro, 10);
  esperar("SHS 100×100×8: ri", tubo["SHS 100×100×8"].ri, 12);
  // Série normalizada (EN 10219-2, Anexo C) e gama de fabricante.
  esperar("SHS 100×100×5 na série EN 10219-2", tubo["SHS 100×100×5"].en, 2);
  esperar("SHS 130×130×5 só gama de fabricante", tubo["SHS 130×130×5"].en, 0);
  esperar("SHS 65×65×3 só na HIASA", tubo["SHS 65×65×3"].fontes + "/" + tubo["SHS 65×65×3"].en, "H/0");
  esperar("RHS 150×130×5 só gama de fabricante", tubo["RHS 150×130×5"].en, 0);
  // Aço EN 10219-1: fy até 16 mm; fu com t < 3 mm e 3 ≤ t ≤ 40 mm.
  esperar("S355H fy com t = 10 mm", Seccao.tensoes("S355H", 10).fy, 355);
  esperar("S355H fu com t = 2,5 mm", Seccao.tensoes("S355H", 2.5).fu, 510);
  esperar("S275H fu com t = 5 mm", Seccao.tensoes("S275H", 5).fu, 410);
  // Classe (Quadro 5.2): c = b − 3t nos SHS/RHS; d/t com ε² nos CHS.
  esperar("SHS 200×200×5 S355H classe compressão (c/t = 37 > 42ε = 34,2)", Seccao.classificarTubo(tubo["SHS 200×200×5"], 355).compressao, 4);
  esperar("SHS 100×100×5 S355H classe compressão (c/t = 17)", Seccao.classificarTubo(tubo["SHS 100×100×5"], 355).compressao, 1);
  esperar("CHS 219,1×3 S355H classe (d/t = 73 > 70ε² = 46)", Seccao.classificarTubo(tubo["CHS 219,1×3"], 355).compressao, 4);
  esperar("CHS 88,9×4 S275H classe (d/t = 22)", Seccao.classificarTubo(tubo["CHS 88,9×4"], 275).compressao, 1);
})();

// ----- Madremax® (Constálica): coerência interna do catálogo (só dá a secção bruta) -----
// Raios de giração e módulos a partir de I, A e das cotas; massa com 7850 kg/m³; área ≈ desenvolvimento × t;
// disposições duplas (encaixada e costas com costas) com o dobro da área e de I_z, e a encaixada com o dobro de I_y.
(function () {
  var M = require("../src/js/madremax.js"), max = {};
  function reg(k, v, ref) { var d = Math.abs(v / ref - 1); max[k] = Math.max(max[k] || 0, d); }
  verificados++;
  var nove = M.seccoes.length === 9;
  if (!nove) falhas++;
  console.log((nove ? "ok   " : "FALHA") + "  Madremax: 9 secções no catálogo (" + M.seccoes.length + ")");
  M.seccoes.forEach(function (s) {
    reg("i_y = √(I_y/A)", Math.sqrt(s.Iy / s.A), s.iy);
    reg("i_z = √(I_z/A)", Math.sqrt(s.Iz / s.A), s.iz);
    reg("W_z = I_z/(b3/2)", s.Iz / (s.b3 / 20), s.Wz);
    reg("W_y = I_y/máx(y1; H − y1)", s.Iy / (Math.max(s.y1, s.H - s.y1) / 10), s.Wy);
    reg("G = 0,785 A", 0.785 * s.A, s.G);
    reg("A = desenvolvimento × t", s.desenv * s.t / 100, s.A);
    var e = s.duplas.encaixada, c = s.duplas.costas;
    reg("duplas: A = 2A", e.A, 2 * s.A); reg("duplas: A = 2A", c.A, 2 * s.A);
    reg("duplas: I_z = 2I_z", e.Iz, 2 * s.Iz); reg("duplas: I_z = 2I_z", c.Iz, 2 * s.Iz);
    reg("encaixada: I_y = 2I_y", e.Iy, 2 * s.Iy);
  });
  var TOL = { "i_y = √(I_y/A)": 0.01, "i_z = √(I_z/A)": 0.01, "W_z = I_z/(b3/2)": 0.01, "W_y = I_y/máx(y1; H − y1)": 0.025,
    "G = 0,785 A": 0.015, "A = desenvolvimento × t": 0.02, "duplas: A = 2A": 0.002, "duplas: I_z = 2I_z": 0.002, "encaixada: I_y = 2I_y": 0.002 };
  Object.keys(TOL).forEach(function (k) { dentro("Madremax: " + k + ", maior desvio", 1 + max[k], 1, TOL[k]); });
})();

console.log("\n" + (verificados - falhas) + "/" + verificados + " verificações dentro da tolerância");
process.exit(falhas ? 1 : 0);
