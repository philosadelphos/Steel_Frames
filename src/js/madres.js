/*
 * Pré-dimensionamento de madres de cobertura em perfis I laminados (NP EN 1993-1-1).
 * Depende de seccao.js. Unidades de entrada: m, kN/m; resultados em kN, kN·m, mm.
 */
var Madres = (function () {
  var E = 210000;   // MPa
  var G = 81000;    // MPa (EC3 3.2.6)

  // Coeficientes de esforços e flecha para carga uniforme q em vãos iguais L.
  // mVao, mApoio: q·L²; v: q·L; flecha: q·L⁴/(E·I).
  var ESQUEMAS = {
    simples: { nome: "Simplesmente apoiada", mVao: 1 / 8, mApoio: 0, v: 0.5, flecha: 5 / 384 },
    continua2: { nome: "Contínua, 2 vãos", mVao: 9 / 128, mApoio: 1 / 8, v: 0.625, flecha: 1 / 185 },
    continua3: { nome: "Contínua, 3 ou mais vãos", mVao: 0.080, mApoio: 0.107, v: 0.607, flecha: 0.0069 }
  };

  // Limites de flecha (L/x) para coberturas em geral.
  var LIMITES_FLECHA = { max: 200, variaveis: 250 };

  // Bambeamento pelo caso geral (EC3 6.3.2.2, Quadros 6.3 e 6.4). Não se usa o método de 6.3.2.3
  // porque não foi possível confirmar a sua adoção no Anexo Nacional; o caso geral é mais conservador.
  var LT_LAMBDA0 = 0.2;
  var ALFA_LT = { a: 0.21, b: 0.34 };

  // Momento crítico elástico (fórmula de 3 fatores com zg = 0, k = kw = 1), em kN·m.
  function momentoCritico(p, props, Lcr, C1) {
    var Iz = props.Iz * 1e4, It = props.It * 1e4, Iw = props.Iw * 1e6, L = Lcr * 1000;
    var base = Math.PI * Math.PI * E * Iz / (L * L);
    return C1 * base * Math.sqrt(Iw / Iz + L * L * G * It / (Math.PI * Math.PI * E * Iz)) / 1e6;
  }

  // Coeficiente de redução χLT (6.3.2.2) para perfis I laminados: curva a se h/b ≤ 2, b se h/b > 2.
  function chiLT(p, Wy, fy, Mcr) {
    var lambda = Math.sqrt(Wy * 1e3 * fy / (Mcr * 1e6));
    var curva = p.h / p.b <= 2 ? "a" : "b";
    if (lambda <= LT_LAMBDA0) return { lambda: lambda, curva: curva, chi: 1 };
    var a = ALFA_LT[curva];
    var phi = 0.5 * (1 + a * (lambda - LT_LAMBDA0) + lambda * lambda);
    var chi = 1 / (phi + Math.sqrt(phi * phi - lambda * lambda));
    return { lambda: lambda, curva: curva, chi: Math.min(chi, 1) };
  }

  /*
   * Verifica um perfil para um conjunto de combinações.
   * cfg: { L, esquema, tirantes (0, 1 ou 2), fy, combELU: [{id, qn, qt}], combELS: [{id, qn, qnVar}] }
   * qn: componente normal à cobertura (positiva para baixo); qt: componente no plano da cobertura.
   */
  function verificar(p, props, cfg) {
    var e = ESQUEMAS[cfg.esquema];
    var L = cfg.L, nSeg = cfg.tirantes + 1, Lseg = L / nSeg;
    var res = Seccao.resistencias(p, props, cfg.fy);
    var classe = res.classe.flexao;
    var Wy = classe <= 2 ? props.Wply : props.Wely;
    var Wz = classe <= 2 ? props.Wplz : props.Welz;
    var McyRd = Wy * 1e3 * cfg.fy / Seccao.GAMMA_M0 / 1e6;
    var MczRd = Wz * 1e3 * cfg.fy / Seccao.GAMMA_M0 / 1e6;
    var VRd = res.VplzRd;

    // Banzo inferior comprimido entre travamentos (tirantes ou escoras) a cada Lseg.
    var C1 = cfg.tirantes === 0 && cfg.esquema === "simples" ? 1.127 : 1.0;
    var Mcr = momentoCritico(p, props, Lseg, C1);
    var lt = chiLT(p, Wy, cfg.fy, Mcr);
    var MbRd = lt.chi * Wy * 1e3 * cfg.fy / Seccao.GAMMA_M1 / 1e6;

    var pior = { seccao: { u: 0 }, bambeamento: { u: 0 }, corte: { u: 0 }, flecha: { u: 0 }, flechaVar: { u: 0 } };
    function registar(chave, u, extra) {
      if (u > pior[chave].u) pior[chave] = Object.assign({ u: u }, extra);
    }

    cfg.combELU.forEach(function (c) {
      var qn = c.qn + (c.gMadre || 0) * cfg.cosAlfa, qt = c.qt + (c.gMadre || 0) * cfg.senAlfa;
      var mVao = e.mVao * qn * L * L;            // > 0: banzo superior comprimido no vão
      var mApoio = e.mApoio * qn * L * L;        // > 0: banzo inferior comprimido sobre os apoios
      var Mz = Math.abs(qt) * Lseg * Lseg / 8;
      var V = e.v * Math.abs(qn) * L;

      // Resistência da secção à flexão desviada (6.2.9, α = 2 e β = 1 para classes 1 e 2).
      var My = Math.max(Math.abs(mVao), Math.abs(mApoio));
      var uSec = classe <= 2 ? Math.pow(My / McyRd, 2) + Mz / MczRd : My / McyRd + Mz / MczRd;
      registar("seccao", uSec, { comb: c.id, My: My, Mz: Mz });

      // Bambeamento sempre que o banzo inferior (livre) fica comprimido.
      var MyLT = Math.max(mVao < 0 ? -mVao : 0, mApoio > 0 ? mApoio : 0);
      if (MyLT > 0) registar("bambeamento", MyLT / MbRd + Mz / MczRd, { comb: c.id, My: MyLT, Mz: Mz });

      registar("corte", V / VRd, { comb: c.id, V: V });
    });

    var IyMm = props.Iy * 1e4;
    cfg.combELS.forEach(function (c) {
      var qn = c.qn + (c.gMadre || 0) * cfg.cosAlfa;
      var d = e.flecha * Math.abs(qn) * Math.pow(L * 1000, 4) / (E * IyMm);         // q em kN/m = N/mm
      var dVar = e.flecha * Math.abs(c.qnVar) * Math.pow(L * 1000, 4) / (E * IyMm);
      registar("flecha", d / (L * 1000 / LIMITES_FLECHA.max), { comb: c.id, d: d, lim: L * 1000 / LIMITES_FLECHA.max });
      registar("flechaVar", dVar / (L * 1000 / LIMITES_FLECHA.variaveis), { comb: c.id, d: dVar, lim: L * 1000 / LIMITES_FLECHA.variaveis });
    });

    var uMax = Math.max(pior.seccao.u, pior.bambeamento.u, pior.corte.u, pior.flecha.u, pior.flechaVar.u);
    return {
      perfil: p, props: props, classe: classe,
      McyRd: McyRd, MczRd: MczRd, VRd: VRd, MbRd: MbRd, Mcr: Mcr, lt: lt, C1: C1, Lseg: Lseg,
      verificacoes: pior, uMax: uMax, ok: uMax <= 1
    };
  }

  // Ordena os perfis por peso e devolve a verificação de cada um e o mais leve que verifica.
  function dimensionar(perfis, cfg) {
    var lista = perfis.map(function (p) {
      var props = Seccao.propriedades(p);
      var gMadre = props.G * 9.81 / 1000; // kN/m
      var c = Object.assign({}, cfg, {
        combELU: cfg.combELU.map(function (x) { return Object.assign({}, x, { gMadre: gMadre * x.gamaG }); }),
        combELS: cfg.combELS.map(function (x) { return Object.assign({}, x, { gMadre: gMadre }); })
      });
      return verificar(p, props, c);
    }).sort(function (a, b) { return a.props.G - b.props.G; });
    var escolhido = lista.filter(function (r) { return r.ok; })[0] || null;
    return { lista: lista, escolhido: escolhido };
  }

  /*
   * Madres em ómega enformadas a frio (catálogo com propriedades da secção bruta).
   * Só se verifica o que essas propriedades permitem: tensões na secção bruta (limite superior da
   * resistência, porque ignora a encurvadura local e distorcional) e flechas com Iy bruto.
   * Nas madres contínuas, o momento sobre os apoios é resistido pela secção sobreposta.
   */
  function verificarOmega(sec, fam, cfg) {
    var e = ESQUEMAS[cfg.esquema];
    var L = cfg.L, Lseg = L / (cfg.tirantes + 1);
    var sim = sec.simples, sob = cfg.esquema !== "simples" && sec.sobreposta ? sec.sobreposta : sim;
    var fRd = fam.fyb / Seccao.GAMMA_M0;
    var gMadre = sim.G * 9.81 / 1000;
    var pior = {
      seccao: { u: 0 }, flecha: { u: 0 }, flechaVar: { u: 0 },
      bambeamento: { u: 0, naoAvaliado: true }, corte: { u: 0, naoAvaliado: true }
    };
    function registar(chave, u, extra) {
      if (u > pior[chave].u) pior[chave] = Object.assign({ u: u }, extra);
    }
    cfg.combELU.forEach(function (c) {
      var qn = c.qn + gMadre * c.gamaG * cfg.cosAlfa, qt = c.qt + gMadre * c.gamaG * cfg.senAlfa;
      var mVao = Math.abs(e.mVao * qn * L * L), mApoio = Math.abs(e.mApoio * qn * L * L);
      var Mz = Math.abs(qt) * Lseg * Lseg / 8;
      var sVao = mVao * 1e3 / sim.Wy + Mz * 1e3 / sim.Wz;   // MPa (kN·m e cm³)
      var sApoio = mApoio * 1e3 / sob.Wy;
      var s = Math.max(sVao, sApoio);
      registar("seccao", s / fRd, { comb: c.id, sigma: s, My: Math.max(mVao, mApoio), Mz: Mz, noApoio: sApoio > sVao });
    });
    var Iy = sim.Iy * 1e4;
    cfg.combELS.forEach(function (c) {
      var qn = c.qn + gMadre * cfg.cosAlfa;
      var d = e.flecha * Math.abs(qn) * Math.pow(L * 1000, 4) / (E * Iy);
      var dVar = e.flecha * Math.abs(c.qnVar) * Math.pow(L * 1000, 4) / (E * Iy);
      registar("flecha", d / (L * 1000 / LIMITES_FLECHA.max), { comb: c.id, d: d, lim: L * 1000 / LIMITES_FLECHA.max });
      registar("flechaVar", dVar / (L * 1000 / LIMITES_FLECHA.variaveis), { comb: c.id, d: dVar, lim: L * 1000 / LIMITES_FLECHA.variaveis });
    });
    var uMax = Math.max(pior.seccao.u, pior.flecha.u, pior.flechaVar.u);
    return {
      omega: true, perfil: { nome: sec.nome }, sec: sec, fam: fam, props: { G: sim.G },
      fRd: fRd, Lseg: Lseg, sobreposta: sob !== sim, verificacoes: pior, uMax: uMax, ok: uMax <= 1
    };
  }

  function dimensionarOmegas(fam, cfg) {
    var lista = fam.seccoes.map(function (s) { return verificarOmega(s, fam, cfg); })
      .sort(function (a, b) { return a.props.G - b.props.G; });
    return { lista: lista, escolhido: lista.filter(function (r) { return r.ok; })[0] || null };
  }

  return {
    ESQUEMAS: ESQUEMAS, LIMITES_FLECHA: LIMITES_FLECHA, E: E, G: G,
    momentoCritico: momentoCritico, chiLT: chiLT, verificar: verificar, dimensionar: dimensionar,
    verificarOmega: verificarOmega, dimensionarOmegas: dimensionarOmegas
  };
})();

if (typeof module !== "undefined") module.exports = Madres;
