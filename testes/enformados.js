/*
 * Verificações das madres enformadas a frio (Superomega, C e Z da O Feliz) e dos seus dados.
 * Correr com: node testes/enformados.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.Seccao = require("../src/js/seccao.js");
global.OFELIZ = require("../src/js/ofeliz.js");
global.Madres = require("../src/js/madres.js");
var EF = require("../src/js/enformados.js");

var falhas = 0, total = 0;
function perto(desc, valor, esperado, tol) {
  total++;
  var ok = Math.abs(valor - esperado) <= (tol === undefined ? 0.01 : tol) * Math.max(1, Math.abs(esperado));
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + (+valor).toFixed(4) + " (esperado " + esperado + ")");
}
function igual(desc, valor, esperado) {
  total++;
  var ok = valor === esperado;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + valor + " (esperado " + esperado + ")");
}
function relativo(desc, valor, esperado, tol) { perto(desc, valor / esperado, 1, tol); }
var SO = OFELIZ.superomega.seccoes;
function sec(lista, nome) { return lista.filter(function (s) { return s.nome === nome; })[0]; }

// ----- Dados -----
igual("Superomega: 16 secções", SO.length, 16);
igual("C: 22 secções", OFELIZ.C.length, 22);
igual("Z: 19 secções", OFELIZ.Z.length, 19);
// Peso. Superomega: G = A × tnom/teff × 0,785 (aço 7850 kg/m³). C e Z: o fabricante calcula G com as
// dimensões exteriores, G = (h + 2b + 2a) × tnom × 0,00785, 1,6 a 3,1 % acima da linha média.
var pesoMax = 0;
SO.forEach(function (s) { pesoMax = Math.max(pesoMax, Math.abs(s.G / (s.A * s.t / s.teff * 0.785) - 1)); });
perto("Superomega: G coerente com A (maior desvio)", pesoMax, 0, 0.003);
pesoMax = 0;
OFELIZ.C.concat(OFELIZ.Z).forEach(function (s) { pesoMax = Math.max(pesoMax, Math.abs(s.G / ((s.h + 2 * s.b + 2 * s.a) * s.t * 0.00785) - 1)); });
perto("C e Z: G pelas dimensões exteriores (maior desvio)", pesoMax, 0, 0.002);
// Superomega: A/teff, Iy/teff e Iz/teff iguais em todas as espessuras da mesma altura (mesma linha média).
[80, 120, 160, 200, 250].forEach(function (h) {
  var g = SO.filter(function (s) { return s.h === h; });
  ["A", "Iy", "Iz"].forEach(function (k) {
    var r = g.map(function (s) { return s[k] / s.teff; });
    perto("Ω" + h + ": " + k + "/teff igual em todas as espessuras", Math.max.apply(null, r) / Math.min.apply(null, r), 1, 0.005);
  });
});
perto("Ω120×1,5: Iz corrigido pelo PDF", sec(SO, "Ω120×1,5").Iz, 156.18, 1e-6);
perto("Ω250×3,0: It corrigido pelo PDF (cm⁴)", sec(SO, "Ω250×3,0").It, 0.566041, 1e-6);
// Propriedades efetivas não excedem as brutas (tolerância de arredondamento).
var excede = 0;
SO.forEach(function (s) {
  Object.keys(s.ef).forEach(function (a) { var e = s.ef[a]; if (e[1] > s.Iy * 1.001 || e[3] > s.Iy * 1.001 || e[5] > s.Iz * 1.001) excede++; });
});
OFELIZ.C.concat(OFELIZ.Z).forEach(function (s) {
  Object.keys(s.ef).forEach(function (a) { var e = s.ef[a]; if (e[1] > s.Iy * 1.001) excede++; });
});
igual("Iy,eff e Iz,eff ≤ secção bruta", excede, 0);
// C e Z: as propriedades do fabricante são as da linha média de cantos vivos (h − t, b − t, a − t/2) com teff.
var cvMax = 0;
OFELIZ.C.concat(OFELIZ.Z).forEach(function (s) {
  var hm = s.h - s.t, bm = s.b - s.t, am = s.a - s.t / 2, t = s.teff;
  var A = (hm + 2 * bm + 2 * am) * t;
  var Iy = t * Math.pow(hm, 3) / 12 + 2 * bm * t * Math.pow(hm / 2, 2) + 2 * (t * Math.pow(am, 3) / 12 + am * t * Math.pow(hm / 2 - am / 2, 2));
  cvMax = Math.max(cvMax, Math.abs(s.A * 100 / A - 1), Math.abs(s.Iy * 1e4 / Iy - 1));
});
perto("C e Z: A e Iy de cantos vivos (maior desvio)", cvMax, 0, 0.002);
// Geometria do desenho do Superomega
Object.keys(OFELIZ.superomega.geo).forEach(function (h) {
  var g = OFELIZ.superomega.geo[h];
  igual("Ω" + h + ": alma entre 45° e 90° (6.1.7.3)", g.phi >= 45 && g.phi <= 90, true);
});

// ----- Propriedades de cálculo -----
var c140 = sec(OFELIZ.C, "C140×1,5"), pc = EF.propriedades("C", c140, "S350GD");
perto("C140×1,5: δ = 0,43 × 4r / Σbp (5.1(4))", pc.delta, 0.43 * 20 / (138.5 + 2 * 58.5 + 2 * 19.25), 1e-9);
perto("C140×1,5: Iy,eff reduzido por (1 − 2δ)", pc.Ieff, c140.ef.S350GD[1] * (1 - 2 * pc.delta), 1e-9);
perto("C: kh = (b/2 + ycc)/h", pc.kh.gravidade, (58.5 / 2 + c140.ycc) / 138.5, 1e-9);
var z200 = sec(OFELIZ.Z, "Z200×2,0"), pz = EF.propriedades("Z", z200, "S350GD");
var hm = 198, bm = 63, am = 19, Iyz = z200.Iy * (1 - 2 * pz.delta) * 1e4;
var kh0 = hm * z200.teff * (bm * bm + 2 * am * bm - 2 * am * am * bm / hm) / (4 * Iyz);
perto("Z200×2,0: kh0 da Figura 10.3", pz.kh.gravidade, kh0, 1e-9);
perto("Z200×2,0: kh em sucção = |kh0 − a/h|", pz.kh.succao, Math.abs(kh0 - bm / 2 / hm), 1e-9);
var so160 = sec(SO, "Ω160×2,0"), ps = EF.propriedades("Superomega", so160, "S350GD");
igual("Superomega: kh = 0 (simétrica, carga no eixo)", ps.kh.gravidade + ps.kh.succao, 0);
perto("Ω160×2,0: banzo livre A = (A/t) × teff", ps.livre.A, OFELIZ.superomega.geo[160].livre[0] * 1.96, 1e-9);

// ----- Curva de encurvadura do banzo livre (curva b, λ0 = 0,4, β = 0,75) -----
perto("χ(λ̄ = 0,3) = 1", EF.chiBanzoLivre(0.3), 1, 1e-9);
perto("χ(λ̄ = 1,0)", EF.chiBanzoLivre(1.0), 1 / (0.977 + Math.sqrt(0.977 * 0.977 - 0.75)), 1e-9);
perto("χ(λ̄ = 2,0) limitado a 1/λ̄²", EF.chiBanzoLivre(2.0), 0.25, 1e-9);

// ----- Restrição do revestimento (10.13) -----
var c250 = sec(OFELIZ.C, "C250×1,8"), p250 = EF.propriedades("C", c250, "S350GD");
var rk = EF.restricao(p250, { restricao: "chapa", fixacoes: 2 });
var bm250 = 70 - 1.8, hd250 = 250 - 1.8;
var invK = 4 * 0.91 * 250 * 250 * (hd250 + 2 * bm250) / (210000 * Math.pow(1.76, 3)) + 250 * 250 / 260;
perto("C250×1,8, chapa com p = 2: K pela (10.13)", rk.K, 1 / invK, 1e-9);
var rso = EF.restricao(ps, { restricao: "chapa", fixacoes: 2 });
igual("Superomega: 130 p não se aplica (fixação a menos de 25 mm da alma)", rso.valida, false);
igual("Superomega com chapa: usa-se K = 0", rso.K, 0);
var bl0 = EF.banzoLivre(ps, { L: 6, tirantes: 0, esquema: "simples" }, { K: 0 }, "vao", 0, 0);
perto("K = 0, simples, sem tirantes: lfz = 0,694 L (Quadro 10.2b)", bl0.lfz, 0.694 * 6000, 1e-9);

// ----- Esforço transverso e esmagamento da alma (Ω160×2,0, S350GD) -----
var lw = 0.346 * 170.4 / 1.96 * Math.sqrt(350 / 210000);
var vr = EF.corteResistente(ps, false);
perto("Ω160×2,0: λ̄w pela (6.10a) com sd", vr.lambda, lw, 1e-6);
perto("Ω160×2,0: Vb,Rd = 2 × hw/sinφ × t × 0,48 fyb/λ̄w", vr.VbRd, 2 * 158 / Math.sin(76.4 * Math.PI / 180) * 1.96 * 0.48 * 350 / lw / 1000, 1e-6);
var rw = EF.esmagamentoAlma(ps, 2, 100);
var rwMao = 0.115 * 1.96 * 1.96 * Math.sqrt(350 * 210000) * (1 - 0.1 * Math.sqrt(3.5 / 1.96)) * (0.5 + Math.sqrt(0.02 * 100 / 1.96)) * (2.4 + Math.pow(76.4 / 90, 2)) / 1000;
perto("Ω160×2,0: Rw,Rd por alma, categoria 2, la = 100 mm (6.18)", rw.Rw, rwMao, 1e-9);
igual("Ω160×2,0: condições (6.17) cumpridas", rw.condicoes, true);

// ----- Momento negativo junto ao apoio (equação dos três momentos) -----
var j0 = EF.envolventeJuntoApoio("continua2", 0), j1 = EF.envolventeJuntoApoio("continua2", 0.1);
perto("2 vãos, no apoio: qL²/8", j0.todos, 0.125, 1e-9);
perto("2 vãos, carga concentrada no apoio: 0,0962 PL", j0.P, 0.0962, 0.005);
perto("2 vãos, a 0,1 L do apoio: 3/8 × 0,9 − 0,9²/2 = 0,0675 qL²", j1.todos, 0.0675, 1e-9);
var j3 = EF.envolventeJuntoApoio("continua3", 0);
perto("3+ vãos, no apoio: 0,107 qL²", j3.todos, 0.107, 0.005);
perto("3+ vãos, no apoio com alternância: 0,1205 qL²", j3.alternada, 0.1205, 0.005);

// ----- Verificações completas (sem peso próprio: gamaG = 0) -----
function cfg(extra) {
  return Object.assign({ L: 5, esquema: "simples", tirantes: 0, cosAlfa: 1, senAlfa: 0, aco: "S350GD", ligacao: "continua", sobreposicao: 0,
    restricao: "nenhuma", fixacoes: 2, CD: 1, apoio: 100, combELS: [] }, extra);
}
var g1 = { id: "g", qn: 1, qt: 0, gamaG: 0 }, s1 = { id: "s", qn: -1, qt: 0, gamaG: 0 };
var vg = EF.verificar("Superomega", so160, cfg({ combELU: [g1] }));
perto("Ω160×2,0 simples, gravidade: σ = M/Wy,eff+", vg.verificacoes.seccao.u, 3.125e3 / so160.ef.S350GD[2] / 350, 1e-9);
igual("gravidade num vão simples: o banzo livre não fica comprimido", !!vg.verificacoes.banzoLivre.comb, false);
perto("Ω160×2,0 simples: apoio extremo F/(2 Rw,Rd cat. 1)", vg.verificacoes.apoio.u, 2.5 / (2 * EF.esmagamentoAlma(ps, 1, 100).Rw), 1e-9);
var vs = EF.verificar("Superomega", so160, cfg({ combELU: [s1] }));
var sM = 3.125e3 / so160.ef.S350GD[4];
perto("sucção: σ no banzo livre = M/Wy,eff− (kh = 0)", vs.verificacoes.seccao.u, sM / 350, 1e-9);
var chi0 = EF.chiBanzoLivre(0.694 * 5000 / ps.livre.i / (Math.PI * Math.sqrt(210000 / 350)));
perto("sucção, K = 0: (1/χ) M/Wy,eff− com lfz = 0,694 L", vs.verificacoes.banzoLivre.u, sM / chi0 / 350, 1e-9);
var vsCD = EF.verificar("Superomega", so160, cfg({ combELU: [s1], restricao: "cd", CD: 2 }));
igual("com CD do revestimento o banzo livre melhora", vsCD.verificacoes.banzoLivre.u < vs.verificacoes.banzoLivre.u, true);
var vc = EF.verificar("C", c140, cfg({ combELU: [s1], tirantes: 1 }));
var MfzC = pc.kh.succao * 1 * 2500 * 2500 / 8;     // κR = 1 com R = 0, La = L/2
perto("C140×1,5 em sucção: Mfz = kh q La²/8 com K = 0", vc.verificacoes.seccao.Mfz, MfzC / 1e6, 1e-9);
igual("C: reação no apoio não se aplica (esquadro)", vc.verificacoes.apoio.naoAplicavel, true);

// Continuidade: parcial (sobreposição desconhecida) verifica o vão também como simplesmente apoiado.
var g2 = { id: "g", qn: 1, qt: 0, gamaG: 0 };
var vp = EF.verificar("Superomega", so160, cfg({ esquema: "continua2", ligacao: "sobreposicao", combELU: [g2] }));
igual("sobreposição desconhecida: continuidade parcial", vp.continuidade, "parcial");
// Vão como simplesmente apoiado (qL²/8, W+) e apoio com secção simples (qL²/8, W−): governa o maior.
perto("continuidade parcial: vão como qL²/8 e apoio com secção simples", vp.verificacoes.seccao.u,
  Math.max(3.125e3 / so160.ef.S350GD[2], 3.125e3 / so160.ef.S350GD[4]) / 350, 1e-9);
var vt = EF.verificar("Superomega", so160, cfg({ esquema: "continua2", ligacao: "sobreposicao", sobreposicao: 1.0, combELU: [g2] }));
igual("sobreposição de 1,0 m com L = 5 m (0,1 L para cada lado): continuidade total", vt.continuidade, "total-sobreposicao");
igual("sobreposição medida: secção dupla no apoio", vt.duplaNoApoio, true);
// Vão contínuo: 9/128 qL² (W+); apoio: qL²/8 em duas secções (W−); fim da sobreposição (0,1 L): 0,0675 qL² numa só (W−).
var uVao = 9 / 128 * 25e3 / so160.ef.S350GD[2] / 350;
var uApoio = 3.125e3 / (2 * so160.ef.S350GD[4]) / 350, uFim = 0.0675 * 25e3 / so160.ef.S350GD[4] / 350;
igual("no fim da sobreposição a secção simples fica mais solicitada do que a dupla no apoio", uFim > uApoio, true);
perto("sobreposição longa: governa o maior de vão, apoio e fim da sobreposição", vt.verificacoes.seccao.u, Math.max(uVao, uApoio, uFim), 1e-6);
var vt2 = EF.verificar("Superomega", so160, cfg({ esquema: "continua2", ligacao: "sobreposicao", sobreposicao: 1.0, combELU: [s1] }));
perto("sobreposição longa em sucção: fim da sobreposição com o banzo superior comprimido", vt2.verificacoes.seccao.u,
  Math.max(9 / 128 * 25e3 / so160.ef.S350GD[4], 3.125e3 / (2 * so160.ef.S350GD[2]), 0.0675 * 25e3 / so160.ef.S350GD[2]) / 350, 1e-6);
// Flechas: com continuidade parcial, como simplesmente apoiada.
var e1 = { id: "e", qn: 1, qnVar: 1, qnQ: 0 };
var fp = EF.verificar("Superomega", so160, cfg({ esquema: "continua2", ligacao: "sobreposicao", combELU: [g2], combELS: [e1] }));
var Iso = Math.min(so160.ef.S350GD[1], so160.ef.S350GD[3]) * 1e4;
var qEls = 1 + so160.G * 9.81 / 1000;     // com o peso próprio da madre
perto("flecha com continuidade parcial = 5qL⁴/(384 E Ieff)", fp.verificacoes.flecha.d, 5 * qEls * Math.pow(5000, 4) / (384 * 210000 * Iso), 1e-9);

// Dimensionamento: lista ordenada pelo peso e a mais leve que verifica.
var dim = EF.dimensionar("Z", cfg({ combELU: [g1, s1], tirantes: 1 }));
var ordenada = dim.lista.every(function (x, i, a) { return i === 0 || a[i - 1].props.G <= x.props.G; });
igual("lista ordenada pelo peso", ordenada, true);
igual("a escolhida é a mais leve que verifica", dim.escolhido === dim.lista.filter(function (x) { return x.ok; })[0], true);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
