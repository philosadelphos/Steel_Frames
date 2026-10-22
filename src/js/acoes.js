/*
 * Ações em coberturas de duas águas segundo os Eurocódigos com os Anexos Nacionais portugueses
 * (Portugal continental): neve (NP EN 1991-1-3), vento (NP EN 1991-1-4) e combinações (NP EN 1990).
 * Unidades: m, graus, kN/m², kN/m.
 */
var Acoes = (function () {
  // ----- Neve — NP EN 1991-1-3 + Anexo Nacional: sk = Cz [1 + (H/500)²] -----
  var NEVE_CZ = { Z1: 0.30, Z2: 0.20, Z3: 0.10 };
  var NEVE_CE = { exposta: 0.8, normal: 1.0, abrigada: 1.2 }; // Quadro 5.1
  var NEVE_CT = 1.0;

  // Coeficiente de forma μ1 para coberturas de uma e duas águas (Quadro 5.2).
  function mu1(alfa) {
    if (alfa <= 30) return 0.8;
    if (alfa < 60) return 0.8 * (60 - alfa) / 30;
    return 0;
  }

  function neve(zona, altitude, exposicao, alfa) {
    var sk = NEVE_CZ[zona] * (1 + Math.pow(altitude / 500, 2));
    var mu = mu1(alfa), ce = NEVE_CE[exposicao];
    return { sk: sk, mu1: mu, Ce: ce, Ct: NEVE_CT, s: mu * ce * NEVE_CT * sk };
  }

  // ----- Vento — NP EN 1991-1-4 + Anexo Nacional -----
  // Zona A: generalidade do território; zona B: faixa costeira de 5 km ou altitude > 600 m.
  var VENTO_VB0 = { A: 27, B: 30 };
  // Quadro NA-4.1: categorias de terreno do Anexo Nacional.
  var TERRENO = {
    I: { z0: 0.005, zmin: 1 },
    II: { z0: 0.05, zmin: 3 },
    III: { z0: 0.3, zmin: 8 },
    IV: { z0: 1.0, zmin: 15 }
  };
  var RHO = 1.25;   // kg/m³
  // 7.2.9(6): edifícios sem face dominante (por exemplo, portões fechados ou resistentes ao vento).
  var CPI = [0.2, -0.3];

  // Pressão dinâmica de pico qp(ze) com c0 = 1, kI = 1, cdir = cseason = 1.
  function pressaoPico(zona, categoria, ze) {
    var t = TERRENO[categoria];
    var vb = VENTO_VB0[zona];
    var z = Math.max(ze, t.zmin);
    var kr = 0.19 * Math.pow(t.z0 / 0.05, 0.07);
    var cr = kr * Math.log(z / t.z0);
    var Iv = 1 / Math.log(z / t.z0);
    var vm = cr * vb;
    var qp = (1 + 7 * Iv) * 0.5 * RHO * vm * vm / 1000;
    return { vb: vb, qb: 0.5 * RHO * vb * vb / 1000, z0: t.z0, zmin: t.zmin, z: z, kr: kr, cr: cr, Iv: Iv, vm: vm, qp: qp };
  }

  /*
   * Coeficientes de pressão exterior [cpe,10, cpe,1].
   * Duas águas: Quadro 7.4a (θ = 0°, com casos de sucção e de pressão) e 7.4b (θ = 90°).
   * Para α < 5° aplica-se a cobertura em terraço de bordo reto (Quadro 7.2), sem zona J.
   * Valores conferidos com o texto da NP EN 1991-1-4 em 22/10/2026.
   */
  var TERRACO = {
    neg: { F: [-1.8, -2.5], G: [-1.2, -2.0], H: [-0.7, -1.2], I: [-0.2, -0.2] },
    pos: { I: [0.2, 0.2] }
  };
  var ALFAS = [5, 15, 30, 45];
  var DUAS_AGUAS_0 = {
    neg: {
      F: [[-1.7, -2.5], [-0.9, -2.0], [-0.5, -1.5], [-0.0, -0.0]],
      G: [[-1.2, -2.0], [-0.8, -1.5], [-0.5, -1.5], [-0.0, -0.0]],
      H: [[-0.6, -1.2], [-0.3, -0.3], [-0.2, -0.2], [-0.0, -0.0]],
      I: [[-0.6, -0.6], [-0.4, -0.4], [-0.4, -0.4], [-0.2, -0.2]],
      J: [[-0.6, -0.6], [-1.0, -1.5], [-0.5, -0.5], [-0.3, -0.3]]
    },
    pos: {
      F: [[0.0, 0.0], [0.2, 0.2], [0.7, 0.7], [0.7, 0.7]],
      G: [[0.0, 0.0], [0.2, 0.2], [0.7, 0.7], [0.7, 0.7]],
      H: [[0.0, 0.0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6]],
      I: [[-0.6, -0.6], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]],
      J: [[0.2, 0.2], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
    }
  };
  var DUAS_AGUAS_90 = {
    neg: {
      F: [[-1.6, -2.2], [-1.3, -2.0], [-1.1, -1.5], [-1.1, -1.5]],
      G: [[-1.3, -2.0], [-1.3, -2.0], [-1.4, -2.0], [-1.4, -2.0]],
      H: [[-0.7, -1.2], [-0.6, -1.2], [-0.8, -1.2], [-0.9, -1.2]],
      I: [[-0.6, -0.6], [-0.5, -0.5], [-0.5, -0.5], [-0.5, -0.5]]
    }
  };

  // Zonas que uma madre atravessa, conforme a sua posição na cobertura.
  var POSICOES = {
    corrente: { nome: "Zona corrente", zonas: ["H", "I"] },
    bordadura: { nome: "Bordadura, cantos e cumeeira", zonas: ["F", "G", "H", "I", "J"] }
  };

  // Interpolação linear em α entre linhas do quadro (só entre valores do mesmo sinal, como exige a norma).
  function interpolarAlfa(linhas, alfa) {
    if (alfa <= ALFAS[0]) return linhas[0];
    for (var i = 1; i < ALFAS.length; i++) {
      if (alfa <= ALFAS[i]) {
        var t = (alfa - ALFAS[i - 1]) / (ALFAS[i] - ALFAS[i - 1]);
        var a = linhas[i - 1], b = linhas[i];
        // Valores de sinais opostos não se interpolam: usa-se o mais desfavorável dos dois.
        return [0, 1].map(function (k) {
          if (a[k] * b[k] < 0) return Math.abs(a[k]) > Math.abs(b[k]) ? a[k] : b[k];
          return a[k] + t * (b[k] - a[k]);
        });
      }
    }
    return linhas[linhas.length - 1];
  }

  // 7.2.1: cpe para área carregada A (m²) entre 1 e 10 m².
  function cpeArea(par, area) {
    if (area >= 10) return par[0];
    if (area <= 1) return par[1];
    return par[1] - (par[1] - par[0]) * Math.log(area) / Math.LN10;
  }

  // Coeficientes extremos (sucção máxima e pressão máxima) nas zonas da posição escolhida.
  function coeficientesCobertura(alfa, posicao, area) {
    var zonas = POSICOES[posicao].zonas;
    var succao = { cpe: 0, zona: null, direcao: null }, pressao = { cpe: -Infinity, zona: null, direcao: null };
    function considerar(cpe, zona, direcao) {
      if (cpe < succao.cpe) succao = { cpe: cpe, zona: zona, direcao: direcao };
      if (cpe > pressao.cpe) pressao = { cpe: cpe, zona: zona, direcao: direcao };
    }
    if (alfa < 5) {
      zonas.forEach(function (z) {
        var zt = z === "J" ? "I" : z;
        if (TERRACO.neg[zt]) considerar(cpeArea(TERRACO.neg[zt], area), zt, "0° e 90°");
        if (TERRACO.pos[zt]) considerar(cpeArea(TERRACO.pos[zt], area), zt, "0° e 90°");
      });
    } else {
      zonas.forEach(function (z) {
        considerar(cpeArea(interpolarAlfa(DUAS_AGUAS_0.neg[z], alfa), area), z, "0°");
        considerar(cpeArea(interpolarAlfa(DUAS_AGUAS_0.pos[z], alfa), area), z, "0°");
        if (DUAS_AGUAS_90.neg[z]) considerar(cpeArea(interpolarAlfa(DUAS_AGUAS_90.neg[z], alfa), area), z, "90°");
      });
    }
    return { succao: succao, pressao: pressao };
  }

  // Pressão resultante na cobertura (kN/m², positiva para baixo) nos dois casos extremos.
  function vento(zona, categoria, ze, alfa, posicao, area, cpi) {
    var pico = pressaoPico(zona, categoria, ze);
    var c = coeficientesCobertura(alfa, posicao, area);
    var lista = cpi || CPI;
    var cpiMax = Math.max.apply(null, lista), cpiMin = Math.min.apply(null, lista);
    // Pressão positiva = a empurrar a cobertura para baixo: w = qp (cpe − cpi), com sinal invertido para "para baixo".
    var wSuccao = pico.qp * (c.succao.cpe - cpiMax);    // negativo: levanta
    var wPressao = pico.qp * (c.pressao.cpe - cpiMin);  // positivo: empurra para baixo
    return {
      pico: pico, area: area,
      succao: { cpe: c.succao.cpe, cpi: cpiMax, zona: c.succao.zona, direcao: c.succao.direcao, w: wSuccao },
      pressao: { cpe: c.pressao.cpe, cpi: cpiMin, zona: c.pressao.zona, direcao: c.pressao.direcao, w: Math.max(wPressao, 0) }
    };
  }

  // ----- Cargas por metro de madre -----
  /*
   * c: { espacamento (m, medido na pendente), alfa, gRev, gInst (kN/m² de cobertura),
   *      qH, s (kN/m² em projeção horizontal), wPressao, wSuccao (kN/m², normais à cobertura) }
   * Devolve, para cada ação, as componentes normal (n, positiva para baixo) e tangencial (t) em kN/m.
   */
  function cargasMadre(c) {
    var a = c.alfa * Math.PI / 180, cos = Math.cos(a), sen = Math.sin(a), e = c.espacamento;
    function porSuperficie(v) { return { n: v * e * cos, t: v * e * sen }; }
    function porProjecao(v) { return { n: v * e * cos * cos, t: v * e * cos * sen }; }
    return {
      G: porSuperficie(c.gRev + c.gInst),
      // Contra a sucção só conta o revestimento: as instalações podem não existir ou ser retiradas.
      Gfav: porSuperficie(c.gRev),
      Q: porProjecao(c.qH),
      S: porProjecao(c.s),
      Wp: { n: c.wPressao * e, t: 0 },
      Ws: { n: c.wSuccao * e, t: 0 }
    };
  }

  // ----- Combinações — NP EN 1990 (expressão 6.10, STR) -----
  var GAMA = { Gsup: 1.35, Ginf: 1.0, Q: 1.5 };
  var PSI0 = { H: 0, W: 0.6 };
  function psi0Neve(altitude) { return altitude > 1000 ? 0.7 : 0.5; }

  /*
   * A sobrecarga de cobertura (categoria H) não se combina com a neve nem com o vento
   * (NP EN 1991-1-1, 3.3.2(1)). Cada combinação: { id, nome, gamaG, qn, qt } (ELU)
   * ou { id, nome, qn, qnVar } (ELS característica). gamaG multiplica o peso próprio da madre.
   */
  function combinacoes(k, altitude) {
    var psiS = psi0Neve(altitude), psiW = PSI0.W;
    function soma(gG, termos, G) {
      var n = gG * G.n, t = gG * G.t;
      termos.forEach(function (x) { n += x[0] * x[1].n; t += x[0] * x[1].t; });
      return { n: n, t: t };
    }
    function variavel(termos) {
      return termos.reduce(function (s, x) { return s + x[0] * x[1].n; }, 0);
    }
    // qnQ: parte da sobrecarga, que se coloca nos vãos mais desfavoráveis das madres contínuas.
    var defs = [
      { id: "Q", nome: "Sobrecarga de cobertura", gG: GAMA.Gsup, G: k.G, var: [[1, k.Q]], qQ: k.Q.n },
      { id: "S", nome: "Neve (base) + vento em pressão", gG: GAMA.Gsup, G: k.G, var: [[1, k.S], [psiW, k.Wp]], qQ: 0 },
      { id: "Wp", nome: "Vento em pressão (base) + neve", gG: GAMA.Gsup, G: k.G, var: [[1, k.Wp], [psiS, k.S]], qQ: 0 },
      { id: "Ws", nome: "Vento em sucção (base)", gG: GAMA.Ginf, G: k.Gfav, var: [[1, k.Ws]], qQ: 0 }
    ];
    var elu = defs.map(function (d) {
      var r = soma(d.gG, d.var.map(function (x) { return [GAMA.Q * x[0], x[1]]; }), d.G);
      return { id: d.id, nome: d.nome, gamaG: d.gG, qn: r.n, qt: r.t, qnQ: GAMA.Q * d.qQ };
    });
    var els = defs.map(function (d) {
      var r = soma(1, d.var, d.G);
      return { id: d.id, nome: d.nome, gamaG: 1, qn: r.n, qt: r.t, qnVar: variavel(d.var), qnQ: d.qQ };
    });
    return { elu: elu, els: els, psi0: { S: psiS, W: psiW, H: PSI0.H }, gama: GAMA };
  }

  return {
    NEVE_CZ: NEVE_CZ, NEVE_CE: NEVE_CE, VENTO_VB0: VENTO_VB0, TERRENO: TERRENO, POSICOES: POSICOES,
    mu1: mu1, neve: neve, pressaoPico: pressaoPico, coeficientesCobertura: coeficientesCobertura, vento: vento,
    cargasMadre: cargasMadre, combinacoes: combinacoes,
    _interpolarAlfa: interpolarAlfa, _cpeArea: cpeArea
  };
})();

if (typeof module !== "undefined") module.exports = Acoes;
