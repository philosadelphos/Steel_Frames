/*
 * Verificações do motor do pórtico (Fase 3, em curso). Correr com: node testes/portico.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.Seccao = require("../src/js/seccao.js");
global.Madres = require("../src/js/madres.js");
global.Acoes = require("../src/js/acoes.js");
var P = require("../src/js/portico.js");

var falhas = 0, total = 0;
function perto(desc, valor, esperado, tol) {
  total++;
  var ok = Math.abs(valor - esperado) <= (tol === undefined ? 0.01 : tol) * Math.max(1, Math.abs(esperado));
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + (+valor).toFixed(5) + " (esperado " + esperado + ")");
}

// Pórtico retangular de bases encastradas (hc = hb), comparado com o método da deflexão angular.
var W = 20, h = 6, I1 = 20000, I2 = 30000, q = 10, H = 10;
var m = P.malha({ W: W, hb: h, hc: h, nPilar: 8, nTravessa: 8 });
var mod = P.modelo(m, { pilar: { A: 1e6, Iy: I1 }, travessa: { A: 1e6, Iy: I2 } });
var ne = m.elementos.length, membros = m.elementos.map(function (e) { return e.membro; });
var cq = { q: new Float64Array(2 * ne), F: new Float64Array(3 * m.nos.length) };
m.elementos.forEach(function (e, k) { if (e.membro.indexOf("trav") === 0) cq.q[2 * k + 1] = -q; });
var r = P.resolver(mod, cq);
var EI1 = 210e6 * I1 * 1e-8, EI2 = 210e6 * I2 * 1e-8, th = q * W * W / (12 * (4 * EI1 / h + 2 * EI2 / W));
perto("gravidade: momento no topo do pilar = −4EI₁θ/h", r.M[3 * membros.lastIndexOf("pilarE") + 2], -4 * EI1 / h * th, 1e-6);
perto("gravidade: momento na base = 2EI₁θ/h", r.M[0], 2 * EI1 / h * th, 1e-6);
perto("gravidade: reações verticais = carga", r.R[1] + r.R[4], q * W, 1e-9);
var ch = { q: new Float64Array(2 * ne), F: new Float64Array(3 * m.nos.length) }; ch.F[3 * m.beirados[0]] = H;
var rh = P.resolver(mod, ch);
var k1 = EI1 / h, k2 = EI2 / W, psi = H * h * (4 * k1 + 6 * k2) / (4 * k1 * (6 * k1 + 36 * k2));
perto("carga horizontal: deslocamento do beirado", rh.u[3 * m.beirados[0]], psi * h, 1e-3);
perto("carga horizontal: reações horizontais = −H", rh.R[0] + rh.R[3], -H, 1e-6);
perto("amplificação: carga simétrica não muda", P.amplificar(r, 2, m).M[0], r.M[0], 1e-9);
perto("amplificação: carga antissimétrica × k", P.amplificar(rh, 2, m).M[0], 2 * rh.M[0], 1e-6);
perto("χ curva b, λ̄ = 1", P.chiFlexao(1, "b"), 0.5970, 0.001);
perto("C1 com ψ = 0", P.fatorC1([10, 5, 0]), 1.88, 1e-9);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
