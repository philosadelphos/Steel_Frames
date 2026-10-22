/*
 * Compara as propriedades calculadas com os valores publicados nos catálogos
 * de perfis (ArcelorMittal, Sections and Merchant Bars). Correr com: node testes/verificar.js
 */
global.PERFIS = require("../js/perfis.js");
var Seccao = require("../js/seccao.js");

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

console.log("\n" + (verificados - falhas) + "/" + verificados + " verificações dentro da tolerância");
process.exit(falhas ? 1 : 0);
