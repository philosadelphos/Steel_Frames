/*
 * Compara as propriedades calculadas com os valores publicados nos catálogos
 * de perfis (ArcelorMittal, Sections and Merchant Bars). Correr com: node testes/verificar.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.PERFIS_U = require("../src/js/perfis-u.js");
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

console.log("\n" + (verificados - falhas) + "/" + verificados + " verificações dentro da tolerância");
process.exit(falhas ? 1 : 0);
