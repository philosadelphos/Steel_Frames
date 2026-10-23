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

function igual(desc, valor, esperado) {
  total++;
  var ok = valor === esperado;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + valor + " (esperado " + esperado + ")");
}

// Exemplo da app: pavilhão 20 × 48 m, alturas 7,0 / 8,4 m, pórticos a 6 m, terreno III, zona A.
var alfa = Math.atan(1.4 / 10) * 180 / Math.PI, ze = 8.55;
var zv = P.zonasVento({ W: 20, C: 48, h: ze, L: 6, alfa: alfa, posicao: "empena" });
perto("e a 0° = min(b, 2h) = 17,1 m", zv.e0, 17.1, 1e-9);
igual("2.º pórtico (faixa 3–9 m) toca os cantos F a 0° (L/2 < e/4)", zv.z0.barlavento[0][2], "F");
igual("a 90°: zona H (e/10 < 3 m < e/2)", zv.z90, "H");
igual("a 90°: parede na zona A (3 m < e/5)", zv.parede90, "A");
igual("pórtico corrente a 90°: zona I", P.zonasVento({ W: 20, C: 48, h: ze, L: 6, alfa: alfa, posicao: "corrente" }).z90, "I");
var cp = Acoes.cpeParedes(ze / 20);
perto("Quadro 7.1, h/d = 0,4275: D = 0,7 + 0,1 × (0,1775/0,75)", cp.D, 0.7 + 0.1 * 0.1775 / 0.75, 1e-9);
perto("Quadro 7.1, h/d = 0,4275: E = −0,3 − 0,2 × (0,1775/0,75)", cp.E, -0.3 - 0.2 * 0.1775 / 0.75, 1e-9);
var dados = {
  g: { W: 20, hb: 7, hc: 8.4 }, altitude: 150, travamentos: { pilar: 0, travessaEscoras: 2, espacamentoMadres: 1.5 },
  acoes: { L: 6, gRev: 0.10, gInst: 0.10, gMadres: 0.084, qk: 0.4, s: 0.8 * 0.2 * 1.09, qp: Acoes.pressaoPico("A", "III", ze).qp,
    cpe: cp, cpi: [0.2, -0.3], alfa: alfa, zonas: zv }
};
var comb = P.combinacoes(10, 150);
igual("86 combinações de ELU (3 Q + 3 S × 11 + 10 W × 5)", comb.elu.length, 86);
// Equilíbrio de um caso de vento: reações horizontais = − soma das cargas horizontais aplicadas.
var mv = P.malha({ W: 20, hb: 7, hc: 8.4, nPilar: 8, nTravessa: 16, cortes: P.cortesVento(zv) });
var casos = P.casosCarga(mv, dados.acoes, { pilar: 0.5, travessa: 0.5 });
var modv = P.modelo(mv, { pilar: { A: 86.8, Iy: 10450 }, travessa: { A: 72.7, Iy: 16270 } });
var w0 = casos.W[0], Fx = 0, Fy = 0;
mv.elementos.forEach(function (e, k) { Fx += w0.q[2 * k] * e.L; Fy += w0.q[2 * k + 1] * e.L; });
var rw = P.resolver(modv, w0);
perto("vento: Σ reações horizontais = − Σ cargas horizontais", rw.R[0] + rw.R[3], -Fx, 1e-6);
perto("vento: Σ reações verticais = − Σ cargas verticais", rw.R[1] + rw.R[4], -Fy, 1e-6);
// Resistência da secção à flexão simples (classe 1): M / (Wpl fy).
var T = Seccao.todos(), ipe360 = T.filter(function (p) { return p.nome === "IPE 360"; })[0], pr360 = Seccao.propriedades(ipe360);
perto("IPE 360 S275, M = 100 kN·m: u = M/(Wpl,y fy)", P.verificarSeccao(ipe360, pr360, 275, 0, 0, 100).u, 100e6 / (pr360.Wply * 1e3 * 275), 1e-9);
// Caso de referência desta versão (exemplo da app): HEA 260 + IPE 360 em S275 verifica; HEA 240 + IPE 400 não.
var hea260 = T.filter(function (p) { return p.nome === "HEA 260"; })[0], hea240 = T.filter(function (p) { return p.nome === "HEA 240"; })[0];
var ipe400 = T.filter(function (p) { return p.nome === "IPE 400"; })[0];
var v1 = P.verificar(dados, hea260, ipe360, "S275"), v2 = P.verificar(dados, hea240, ipe400, "S275");
igual("exemplo: HEA 260 + IPE 360 verifica", v1.ok, true);
perto("exemplo: utilização máxima 0,947 (encurvadura do pilar)", v1.uMax, 0.947, 0.01);
igual("exemplo: HEA 240 + IPE 400 não verifica", v2.ok, false);
igual("exemplo: αcr ≥ 10 (análise de 1.ª ordem)", v1.alfaCrMin >= 10, true);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
