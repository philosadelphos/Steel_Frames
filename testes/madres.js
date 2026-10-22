/*
 * Verificações do motor de ações e do dimensionamento de madres.
 * Correr com: node testes/madres.js
 */
global.PERFIS = require("../src/js/perfis.js");
global.Seccao = require("../src/js/seccao.js");
var Acoes = require("../src/js/acoes.js");
var Madres = require("../src/js/madres.js");

var falhas = 0, total = 0;
function perto(desc, valor, esperado, tol) {
  total++;
  var ok = Math.abs(valor - esperado) <= (tol === undefined ? 0.01 : tol) * Math.max(1, Math.abs(esperado));
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + valor.toFixed(4) + " (esperado " + esperado + ")");
}
function igual(desc, valor, esperado) {
  total++;
  var ok = valor === esperado;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + valor + " (esperado " + esperado + ")");
}

// Vento: qb na zona A; ce(10 m) em terreno II ≈ 2,35 (EN 1991-1-4, Figura 4.2; z0 = 0,05 m como no AN).
var p = Acoes.pressaoPico("A", "II", 10);
perto("qb zona A (kN/m²)", p.qb, 0.4556);
perto("ce(10 m) terreno II", p.qp / p.qb, 2.35, 0.005);
// Abaixo de zmin usa-se zmin (terreno IV: zmin = 15 m).
perto("qp(5 m) = qp(15 m) em terreno IV", Acoes.pressaoPico("A", "IV", 5).qp, Acoes.pressaoPico("A", "IV", 15).qp, 1e-9);
perto("qb zona B (kN/m²)", Acoes.pressaoPico("B", "II", 10).qb, 0.5625);

// Coeficientes de pressão: interpolação em α e na área carregada.
var F10 = Acoes._interpolarAlfa([[-1.7, -2.5], [-0.9, -2.0], [-0.5, -1.5], [-0.0, -0.0]], 10);
perto("cpe,10 zona F a 10° (θ = 0°)", F10[0], -1.3);
perto("cpe,1 zona F a 10° (θ = 0°)", F10[1], -2.25);
perto("cpe com A = 1 m² é cpe,1", Acoes._cpeArea([-1.3, -2.25], 1), -2.25);
perto("cpe com A = 10 m² é cpe,10", Acoes._cpeArea([-1.3, -2.25], 10), -1.3);
perto("cpe com A = 5 m² (interpolação logarítmica)", Acoes._cpeArea([-1.3, -2.25], 5), -2.25 + 0.95 * Math.log10(5));
var c = Acoes.coeficientesCobertura(15, "corrente", 20);
perto("sucção máxima em zona corrente a 15°, A ≥ 10 m²", c.succao.cpe, -0.6);   // zona H, θ = 90°
perto("pressão máxima em zona corrente a 15°, A ≥ 10 m²", c.pressao.cpe, 0.2);  // zona H, θ = 0°
var t = Acoes.coeficientesCobertura(3, "bordadura", 20);
perto("cobertura em terraço (α < 5°): sucção na zona F", t.succao.cpe, -1.8);

// Neve
perto("sk zona Z1 a 1000 m (kN/m²)", Acoes.neve("Z1", 1000, "normal", 10).sk, 1.5);
perto("sk zona Z3 ao nível do mar (kN/m²)", Acoes.neve("Z3", 0, "normal", 10).sk, 0.10);
perto("μ1 a 45°", Acoes.mu1(45), 0.4);
perto("μ1 a 60°", Acoes.mu1(60), 0);

// Cargas por metro de madre e combinações
var k = Acoes.cargasMadre({ espacamento: 2, alfa: 0, gRev: 0.1, gInst: 0.1, qH: 0.4, s: 0.2, wPressao: 0.3, wSuccao: -0.8 });
perto("G normal com α = 0 (kN/m)", k.G.n, 0.4);
perto("Ws normal (kN/m)", k.Ws.n, -1.6);
var cb = Acoes.combinacoes(k, 100);
var porId = {};
cb.elu.forEach(function (x) { porId[x.id] = x; });
perto("ELU 1,35 G + 1,5 Q", porId.Q.qn, 1.35 * 0.4 + 1.5 * 0.8);
perto("ELU 1,35 G + 1,5 S + 0,9 Wp", porId.S.qn, 1.35 * 0.4 + 1.5 * 0.4 + 1.5 * 0.6 * 0.6);
perto("ELU 1,0 G + 1,5 Ws", porId.Ws.qn, 0.4 - 1.5 * 1.6);
perto("ψ0 da neve acima de 1000 m", Acoes.combinacoes(k, 1200).psi0.S, 0.7);

// Bambeamento: IPE 300, L = 6 m, momento uniforme (C1 = 1) → Mcr ≈ 90,5 kN·m; S275, caso geral, curva a.
var porNome = {};
Seccao.todos().forEach(function (q) { porNome[q.nome] = q; });
var ipe300 = porNome["IPE 300"], pr300 = Seccao.propriedades(ipe300);
var Mcr = Madres.momentoCritico(ipe300, pr300, 6, 1.0);
perto("Mcr IPE 300, L = 6 m, C1 = 1 (kN·m)", Mcr, 90.5, 0.01);
var lt = Madres.chiLT(ipe300, pr300.Wply, 275, Mcr);
igual("curva de bambeamento do IPE 300 (h/b = 2)", lt.curva, "a");
perto("χLT IPE 300 S275, L = 6 m (6.3.2.2)", lt.chi, 0.427, 0.01);
igual("curva do IPE 330 (h/b > 2)", Madres.chiLT(porNome["IPE 330"], 1, 275, 1000).curva, "b");

// Madre simplesmente apoiada, sem tirantes: L = 5 m, qn = 2 kN/m → MEd = 6,25 kN·m.
var ipe120 = porNome["IPE 120"], pr120 = Seccao.propriedades(ipe120);
var v = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "simples", tirantes: 0, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "x", qn: 2, qt: 0 }], combELS: [{ id: "x", qn: 1.4, qnVar: 1 }]
});
perto("utilização da secção IPE 120 (M/Mc,Rd)²", v.verificacoes.seccao.u, Math.pow(6.25 / (60.73 * 0.275), 2), 0.01);
perto("esforço transverso IPE 120", v.verificacoes.corte.V, 5);
perto("flecha IPE 120 (mm)", v.verificacoes.flecha.d, 5 / 384 * 1.4 * Math.pow(5000, 4) / (210000 * 317.8e4), 0.01);
igual("sem banzo inferior comprimido, não há verificação de bambeamento", v.verificacoes.bambeamento.u, 0);
var vs = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "simples", tirantes: 0, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "s", qn: -2, qt: 0 }], combELS: [{ id: "s", qn: -1.4, qnVar: -1.4 }]
});
perto("sucção: bambeamento verificado com C1 = 1,127", vs.C1, 1.127, 1e-9);
total++; if (!(vs.verificacoes.bambeamento.u > vs.verificacoes.seccao.u)) { falhas++; console.log("FALHA  sucção: bambeamento deveria condicionar mais do que a secção"); }
else console.log("ok     sucção: bambeamento condiciona mais do que a secção");

// Contínua com gravidade: banzo inferior comprimido sobre os apoios.
var vc = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "continua2", tirantes: 0, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "g", qn: 2, qt: 0 }], combELS: [{ id: "g", qn: 1.4, qnVar: 1 }]
});
perto("contínua 2 vãos: momento no apoio qL²/8 verificado ao bambeamento", vc.verificacoes.bambeamento.My, 6.25);

// Ómegas Constálica: coerência interna das tabelas transcritas do catálogo.
var OMEGAS = require("../src/js/omegas.js");
Object.keys(OMEGAS).forEach(function (fam) {
  OMEGAS[fam].seccoes.forEach(function (s) {
    var x = s.simples;
    perto(fam + " " + s.nome + ": iy = √(Iy/A)", x.iy, Math.sqrt(x.Iy * 1e4 / x.A) / 10, 0.01);
    // O próprio catálogo tem diferenças até 1,4 % entre G e A (Ω150×1,5 e Ω200×2,0), confirmadas no PDF.
    perto(fam + " " + s.nome + ": G ≈ A × 7850 kg/m³", x.G, x.A * 1e-6 * 7850, 0.02);
    if (s.sobreposta) {
      perto(fam + " " + s.nome + ": Iy sobreposta = 2 × simples", s.sobreposta.Iy, 2 * x.Iy, 0.001);
      perto(fam + " " + s.nome + ": A sobreposta = 2 × simples", s.sobreposta.A, 2 * x.A, 0.002);
      perto(fam + " " + s.nome + ": Iz dupla = Iz sobreposta", s.dupla.Iz, s.sobreposta.Iz, 0.001);
    }
    if (x.y1) perto(fam + " " + s.nome + ": Wy,min ≈ Iy / max(y1, H − y1)", x.Wy, x.Iy * 10 / Math.max(x.y1, x.H - x.y1), 0.025);
  });
});
// Omegamax = Madremax simples nas mesmas dimensões
perto("Omegamax 200 = Madremax Ω200×1,5 (Iy)", OMEGAS.Omegamax.seccoes[3].simples.Iy, OMEGAS.Madremax.seccoes[3].simples.Iy, 1e-9);

// Madre Ω100×1,5 simplesmente apoiada, L = 5 m, qn = 1 kN/m (sem peso próprio: gamaG = 0)
var om100 = OMEGAS.Madremax.seccoes[1];
var vo = Madres.verificarOmega(om100, OMEGAS.Madremax, {
  L: 5, esquema: "simples", tirantes: 0, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "x", qn: 1, qt: 0, gamaG: 0 }], combELS: []
});
perto("Ω100×1,5: σ = M/Wy,min (MPa)", vo.verificacoes.seccao.sigma, 3.125e6 / 11.3e3, 0.001);
perto("Ω100×1,5: utilização σ/fyb", vo.verificacoes.seccao.u, 3.125e6 / 11.3e3 / 350, 0.001);
var voc = Madres.verificarOmega(om100, OMEGAS.Madremax, {
  L: 5, esquema: "continua2", tirantes: 0, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "x", qn: 1, qt: 0, gamaG: 0 }], combELS: []
});
igual("Ω100×1,5 contínua: usa a secção sobreposta nos apoios", voc.sobreposta, true);
perto("Ω100×1,5 contínua: governa o vão (9/128 qL² / Wy simples)", voc.verificacoes.seccao.sigma, 9 / 128 * 25 * 1e3 / 11.3, 0.001);
igual("ómegas: bambeamento marcado como não avaliado", voc.verificacoes.bambeamento.naoAvaliado, true);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
