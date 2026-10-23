/*
 * Verificações do motor de ações e do dimensionamento de madres IPE.
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
perto("ELU 1,0 Grev + 1,5 Ws", porId.Ws.qn, 0.2 - 1.5 * 1.6);
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
perto("utilização da secção IPE 120 (sem Mz é M/Mc,Rd)", v.verificacoes.seccao.u, 6.25 / (60.73 * 0.275), 0.01);
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

// Sobrecarga em alternância nas madres contínuas (só a parte qnQ).
var e2 = Madres.ESQUEMAS.continua2, e3 = Madres.ESQUEMAS.continua3;
perto("2 vãos, só sobrecarga: momento no vão 0,0957 qL²", Madres.esforcos(e2, 1, 1, 1).mVao, 0.0957, 1e-6);
perto("2 vãos, só permanente: momento no vão 9/128 qL²", Madres.esforcos(e2, 1, 0, 1).mVao, 9 / 128, 1e-6);
perto("3+ vãos, só sobrecarga: momento no apoio 0,1205 qL²", Madres.esforcos(e3, 1, 1, 1).mApoio, 0.1205, 1e-6);
perto("simplesmente apoiada: alternância não muda nada", Madres.esforcos(Madres.ESQUEMAS.simples, 2, 1, 3).mVao, 2 * 9 / 8, 1e-9);
var vq = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "continua3", tirantes: 0, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "Q", qn: 2, qt: 0, qnQ: 2 }], combELS: [{ id: "Q", qn: 1, qnVar: 1, qnQ: 1 }]
});
perto("3+ vãos com sobrecarga: flecha com 0,0099 qL⁴/EI", vq.verificacoes.flecha.d, 0.0099 * Math.pow(5000, 4) / (210000 * 317.8e4), 0.01);

// Utilização da flexão desviada proporcional à carga: (My/Mc)² + Mz/Mcz = 1 ⇔ u = 1.
var vd = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "simples", tirantes: 0, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "d", qn: 2, qt: 0.3 }], combELS: []
});
var rY = vd.verificacoes.seccao.My / vd.McyRd, rZ = vd.verificacoes.seccao.Mz / vd.MczRd, u = vd.verificacoes.seccao.u;
perto("flexão desviada: (rY/u)² + rZ/u = 1", Math.pow(rY / u, 2) + rZ / u, 1, 1e-9);

// Sucção: as instalações suspensas não contam como carga favorável.
var kk = Acoes.cargasMadre({ espacamento: 2, alfa: 0, gRev: 0.1, gInst: 0.1, qH: 0.4, s: 0.2, wPressao: 0.3, wSuccao: -0.8 });
var cws = Acoes.combinacoes(kk, 100).elu.filter(function (x) { return x.id === "Ws"; })[0];
perto("ELU 1,0 Grev + 1,5 Ws (sem instalações)", cws.qn, 0.2 - 1.5 * 1.6);
perto("cpi personalizado: sucção com cpi = +0,6", Acoes.vento("A", "II", 10, 15, "corrente", 20, [0.6, -0.3]).succao.w,
  Acoes.pressaoPico("A", "II", 10).qp * (-0.6 - 0.6), 1e-9);

// Orografia: qp = ½ρ vb² (cr² c0² + 7 kI kr cr c0), expressões (4.3), (4.7) e (4.8) com vm = c0 cr vb.
var p1 = Acoes.pressaoPico("A", "III", 9), p12 = Acoes.pressaoPico("A", "III", 9, 1.2);
perto("c0 = 1 por omissão", p1.qp, Acoes.pressaoPico("A", "III", 9, 1).qp, 1e-12);
perto("qp com c0 = 1,2", p12.qp, 0.5 * 1.25 * 27 * 27 * (p1.cr * p1.cr * 1.44 + 7 * p1.kr * p1.cr * 1.2) / 1000, 1e-9);
perto("Iv com c0 = 1,2 é Iv(c0 = 1) / 1,2", p12.Iv, p1.Iv / 1.2, 1e-12);
perto("c0 passa por Acoes.vento", Acoes.vento("A", "III", 9, 15, "corrente", 20, null, 1.2).pico.qp, p12.qp, 1e-12);

// Carga concentrada Q_k = 1,0 kN (Quadro NA–6.10), verificada à parte (6.3.4.2(3)P): só no ELU.
var kq = Acoes.cargasMadre({ espacamento: 2, alfa: 10, gRev: 0.1, gInst: 0.1, qH: 0.4, s: 0.2, wPressao: 0.3, wSuccao: -0.8 });
var cq = Acoes.combinacoes(kq, 100);
var cqp = cq.elu.filter(function (x) { return x.id === "QP"; })[0];
perto("Q_k: componente normal 1,5 × 1,0 × cos 10°", cqp.Pn, 1.5 * Math.cos(10 * Math.PI / 180), 1e-12);
perto("Q_k: permanentes com 1,35", cqp.qn, 1.35 * kq.G.n, 1e-12);
igual("Q_k não entra nas combinações ELS", cq.els.some(function (x) { return x.id === "QP"; }), false);
igual("Q_k não se soma a q_k (sem parte distribuída variável)", cqp.qnQ, 0);
perto("simplesmente apoiada: M = PL/4", Madres.esforcos(Madres.ESQUEMAS.simples, 0, 0, 6, 2).mVao, 3, 1e-12);
perto("simplesmente apoiada: V = P", Madres.esforcos(Madres.ESQUEMAS.simples, 0, 0, 6, 2).V, 2, 1e-12);
// Envolventes da equação dos três momentos (2 vãos: 0,2074 PL no vão, 0,0962 PL no apoio; 3 a 10 vãos: 0,2049 e 0,1031).
igual("2 vãos: coeficiente do vão por excesso", Madres.ESQUEMAS.continua2.mVaoP >= 0.2074, true);
igual("2 vãos: coeficiente do apoio por excesso", Madres.ESQUEMAS.continua2.mApoioP >= 0.0962, true);
igual("3+ vãos: coeficiente do vão por excesso", Madres.ESQUEMAS.continua3.mVaoP >= 0.2049, true);
igual("3+ vãos: coeficiente do apoio por excesso", Madres.ESQUEMAS.continua3.mApoioP >= 0.1031, true);
var vp = Madres.verificar(ipe120, pr120, {
  L: 5, esquema: "simples", tirantes: 1, fy: 275, cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "QP", qn: 0, qt: 0, Pn: 1.5, Pt: 0.4 }], combELS: []
});
perto("Q_k: My = 1,5 × 5 / 4 no IPE", vp.verificacoes.seccao.My, 1.875, 1e-12);
perto("Q_k: Mz = Pt × Lseg / 4 entre tirantes", vp.verificacoes.seccao.Mz, 0.4 * 2.5 / 4, 1e-12);

// fy de cada IPE pela espessura do banzo quando se indica a classe do aço.
var dimAco = Madres.dimensionar(Seccao.todos().filter(function (x) { return x.nome === "IPE 600" || x.nome === "IPE 200"; }), {
  L: 6, esquema: "simples", tirantes: 0, aco: "S355", cosAlfa: 1, senAlfa: 0,
  combELU: [{ id: "d", qn: 1, qt: 0, gamaG: 1.35 }], combELS: []
});
var ipe600 = dimAco.lista.filter(function (x) { return x.perfil.nome === "IPE 600"; })[0];
perto("IPE 600 (tf = 19 mm) em S355: fy = 345 MPa", ipe600.McyRd * 1e6 / (ipe600.props.Wply * 1e3), 345, 1e-9);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
