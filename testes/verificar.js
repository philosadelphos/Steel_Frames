/*
 * Compara as propriedades calculadas com os valores publicados nos catálogos
 * de perfis (ArcelorMittal, Sections and Merchant Bars; cantoneiras e T: ver abaixo). Correr com: node testes/verificar.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.PERFIS_U = require("../src/js/perfis-u.js");
global.PERFIS_LT = require("../src/js/perfis-lt.js");
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

console.log("\n" + (verificados - falhas) + "/" + verificados + " verificações dentro da tolerância");
process.exit(falhas ? 1 : 0);
