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

  // Zonas de neve do NA–4.1(1) para Portugal continental: distrito inteiro numa zona, ou os concelhos
  // de cada zona (nos distritos repartidos, o Anexo Nacional enumera todos os concelhos).
  var NEVE_DISTRITOS = {
    "Aveiro": "Z2", "Beja": "Z3", "Braga": "Z2",
    "Bragança": { Z1: ["Alfândega da Fé", "Carrazeda de Ansiães", "Freixo de Espada à Cinta", "Mogadouro", "Torre de Moncorvo", "Vila Flor"],
      Z2: ["Bragança", "Macedo de Cavaleiros", "Miranda do Douro", "Mirandela", "Vimioso", "Vinhais"] },
    "Castelo Branco": "Z1",
    "Coimbra": { Z1: ["Arganil", "Góis", "Oliveira do Hospital", "Pampilhosa da Serra", "Tábua"],
      Z2: ["Cantanhede", "Coimbra", "Condeixa-a-Nova", "Figueira da Foz", "Lousã", "Mira", "Miranda do Corvo", "Montemor-o-Velho", "Penacova", "Penela", "Soure", "Vila Nova de Poiares"] },
    "Évora": "Z3", "Faro": "Z3", "Guarda": "Z1",
    "Leiria": { Z2: ["Alvaiázere", "Ansião", "Batalha", "Castanheira de Pêra", "Figueiró dos Vinhos", "Leiria", "Marinha Grande", "Pedrógão Grande", "Pombal"],
      Z3: ["Alcobaça", "Bombarral", "Caldas da Rainha", "Nazaré", "Óbidos", "Peniche", "Porto de Mós"] },
    "Lisboa": "Z3",
    "Portalegre": { Z1: ["Castelo de Vide", "Marvão", "Nisa"],
      Z2: ["Alter do Chão", "Arronches", "Avis", "Campo Maior", "Crato", "Elvas", "Fronteira", "Gavião", "Monforte", "Ponte de Sôr", "Portalegre", "Sousel"] },
    "Porto": "Z2",
    "Santarém": { Z1: ["Mação"],
      Z2: ["Abrantes", "Chamusca", "Constância", "Entroncamento", "Ferreira do Zêzere", "Golegã", "Ourém", "Sardoal", "Tomar", "Torres Novas", "Vila Nova da Barquinha"],
      Z3: ["Alcanena", "Almeirim", "Alpiarça", "Benavente", "Cartaxo", "Coruche", "Rio Maior", "Salvaterra de Magos", "Santarém"] },
    "Setúbal": "Z3", "Viana do Castelo": "Z2", "Vila Real": "Z2",
    "Viseu": { Z1: ["Armamar", "Carregal do Sal", "Castro Daire", "Lamego", "Mangualde", "Moimenta da Beira", "Nelas", "Penalva do Castelo", "Penedono", "São João da Pesqueira", "Sátão", "Sernancelhe", "Tabuaço", "Tarouca", "Vila Nova de Paiva", "Viseu"],
      Z2: ["Cinfães", "Mortágua", "Oliveira de Frades", "Resende", "Santa Comba Dão", "São Pedro do Sul", "Tondela", "Vouzela"] }
  };
  // Quadro NA–A.1, Nota 1: caso B3 (queda e deslocamento excecionais) nestes concelhos; B2 no resto da zona Z1.
  var NEVE_B3 = ["Aguiar da Beira", "Fornos de Algodres", "Mangualde", "Nelas", "Penalva do Castelo", "Sátão", "Viseu"];

  // Concelhos que é preciso distinguir num distrito: os do Anexo Nacional ou, na Guarda, os do caso B3.
  function concelhosDistrito(distrito) {
    var d = NEVE_DISTRITOS[distrito];
    if (!d) return [];
    if (typeof d === "string") return distrito === "Guarda" ? ["Aguiar da Beira", "Fornos de Algodres"] : [];
    return Object.keys(d).reduce(function (l, z) { return l.concat(d[z]); }, []).sort(function (a, b) { return a.localeCompare(b, "pt"); });
  }
  // Zona de neve (ou null se faltar o concelho) e caso do Quadro NA–A.1.
  function zonaNeve(distrito, concelho) {
    var d = NEVE_DISTRITOS[distrito], zona = null;
    if (typeof d === "string") zona = d;
    else if (d) Object.keys(d).forEach(function (z) { if (d[z].indexOf(concelho) >= 0) zona = z; });
    return { zona: zona, caso: zona === "Z1" ? (NEVE_B3.indexOf(concelho) >= 0 ? "B3" : "B2") : zona ? "A" : null };
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

  // Pressão dinâmica de pico qp(ze) (4.3 a 4.5) com kI = 1 e cdir = cseason = 1.
  // c0: coeficiente de orografia (4.3.3), 1 em terreno plano; entra em vm(z) e em Iv(z) = kI / (c0 ln(z/z0)).
  function pressaoPico(zona, categoria, ze, c0) {
    var t = TERRENO[categoria];
    var vb = VENTO_VB0[zona];
    var co = c0 || 1;
    var z = Math.max(ze, t.zmin);
    var kr = 0.19 * Math.pow(t.z0 / 0.05, 0.07);
    var cr = kr * Math.log(z / t.z0);
    var Iv = 1 / (co * Math.log(z / t.z0));
    var vm = cr * co * vb;
    var qp = (1 + 7 * Iv) * 0.5 * RHO * vm * vm / 1000;
    return { vb: vb, qb: 0.5 * RHO * vb * vb / 1000, z0: t.z0, zmin: t.zmin, z: z, kr: kr, cr: cr, c0: co, Iv: Iv, vm: vm, qp: qp };
  }

  /*
   * Coeficiente de orografia c0(z) pelo Anexo A.3 (NA–4.3.3(1)), expressões (A.1) a (A.13).
   * o: { tipo: "colina" (isolada ou em cadeia) | "escarpa" (falésia ou escarpa), H (altura efetiva),
   *      Lu, Ld (comprimentos das vertentes a barlavento e a sotavento; Ld só nas colinas),
   *      x (distância horizontal do local à crista: < 0 a barlavento, > 0 a sotavento) }, em m.
   * z: altura do ponto acima do solo no local (m). As expressões aplicam-se em todo o seu domínio de
   * validade, também para lá da zona em que a norma obriga a considerar a orografia (A.3(3), facultativo).
   */
  function polA5(zl) {
    return 0.1552 * Math.pow(zl, 4) - 0.8575 * Math.pow(zl, 3) + 1.8133 * zl * zl - 1.9115 * zl + 1.0124;
  }
  function coeficienteOrografia(o, z) {
    var phi = o.H / o.Lu;
    var Le = phi < 0.3 ? o.Lu : o.H / 0.3;          // Quadro A.2
    var zl = z / Le, s = 0, seccao;
    if (phi < 0.05) return { phi: phi, Le: Le, s: 0, c0: 1, seccao: "declive inferior a 0,05" };
    if (o.x <= 0) {
      // Barlavento, todos os tipos (A.4) a (A.6)
      seccao = "barlavento";
      var xu = o.x / o.Lu;
      if (xu >= -1.5 && zl <= 2) s = polA5(zl) * Math.exp((0.3542 * zl * zl - 1.0577 * zl + 2.6456) * xu);
    } else if (o.tipo === "escarpa") {
      // Sotavento de falésias e escarpas (A.7) a (A.10), com z/Le ≥ 0,1 e interpolação para X/Le < 0,1
      seccao = "sotavento da escarpa";
      var xe = o.x / Le;
      var sA7 = function (xr) {
        var lz = Math.log10(Math.max(zl, 0.1)), lx = Math.log10(xr);
        var A = -1.3420 * Math.pow(lz, 3) - 0.8222 * lz * lz + 0.4609 * lz - 0.0791;
        var B = -1.0196 * Math.pow(lz, 3) - 0.8910 * lz * lz + 0.5343 * lz - 0.1156;
        var C = 0.8030 * Math.pow(lz, 3) + 0.4236 * lz * lz - 0.5738 * lz + 0.1606;
        return A * lx * lx + B * lx + C;
      };
      if (xe <= 3.5 && zl <= 2) s = xe >= 0.1 ? sA7(xe) : polA5(zl) + (sA7(0.1) - polA5(zl)) * xe / 0.1;
    } else {
      // Sotavento de colinas isoladas ou em cadeia (A.11) a (A.13)
      seccao = "sotavento da colina";
      var xd = o.x / o.Ld;
      if (xd <= 2 && zl <= 2) s = polA5(zl) * Math.exp((-0.3056 * zl * zl + 1.0212 * zl - 1.7637) * xd);
    }
    s = Math.max(s, 0);
    var c0 = phi < 0.3 ? 1 + 2 * s * phi : 1 + 0.6 * s;   // (A.2) e (A.3)
    return { phi: phi, Le: Le, s: s, c0: c0, seccao: seccao };
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
  function vento(zona, categoria, ze, alfa, posicao, area, cpi, c0) {
    var pico = pressaoPico(zona, categoria, ze, c0);
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

  // ----- Sobrecarga em coberturas da categoria H (Quadro NA–6.10 da NP EN 1991-1-1) -----
  // q_k e Q_k não atuam em simultâneo: Q_k verifica-se à parte (6.3.4.2(3)P).
  var SOBRECARGA_H = { qk: 0.4, Qk: 1.0 };

  // ----- Cargas por metro de madre -----
  /*
   * c: { espacamento (m, medido na pendente), alfa, gRev, gInst (kN/m² de cobertura),
   *      qH, s (kN/m² em projeção horizontal), wPressao, wSuccao (kN/m², normais à cobertura), QkH (kN) }
   * Devolve, para cada ação, as componentes normal (n, positiva para baixo) e tangencial (t) em kN/m;
   * QP é a carga concentrada Q_k, em kN.
   */
  function cargasMadre(c) {
    var a = c.alfa * Math.PI / 180, cos = Math.cos(a), sen = Math.sin(a), e = c.espacamento;
    function porSuperficie(v) { return { n: v * e * cos, t: v * e * sen }; }
    function porProjecao(v) { return { n: v * e * cos * cos, t: v * e * cos * sen }; }
    var Qk = c.QkH === undefined ? SOBRECARGA_H.Qk : c.QkH;
    return {
      G: porSuperficie(c.gRev + c.gInst),
      // Contra a sucção só conta o revestimento: as instalações podem não existir ou ser retiradas.
      Gfav: porSuperficie(c.gRev),
      Q: porProjecao(c.qH),
      QP: { n: Qk * cos, t: Qk * sen },
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
   * (NP EN 1991-1-1, 3.3.2(1)). Cada combinação: { id, nome, gamaG, qn, qt, Pn, Pt } (ELU)
   * ou { id, nome, qn, qnVar } (ELS característica). gamaG multiplica o peso próprio da madre.
   * A carga concentrada Q_k é uma verificação local: entra só no ELU, numa combinação própria.
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
      { id: "Ws", nome: "Vento em sucção (base)", gG: GAMA.Ginf, G: k.Gfav, var: [[1, k.Ws]], qQ: 0 },
      { id: "QP", nome: "Carga concentrada de cobertura", gG: GAMA.Gsup, G: k.G, var: [], qQ: 0, P: k.QP, soELU: true }
    ];
    var elu = defs.map(function (d) {
      var r = soma(d.gG, d.var.map(function (x) { return [GAMA.Q * x[0], x[1]]; }), d.G);
      var c = { id: d.id, nome: d.nome, gamaG: d.gG, qn: r.n, qt: r.t, qnQ: GAMA.Q * d.qQ };
      if (d.P) { c.Pn = GAMA.Q * d.P.n; c.Pt = GAMA.Q * d.P.t; }
      return c;
    });
    var els = defs.filter(function (d) { return !d.soELU; }).map(function (d) {
      var r = soma(1, d.var, d.G);
      return { id: d.id, nome: d.nome, gamaG: 1, qn: r.n, qt: r.t, qnVar: variavel(d.var), qnQ: d.qQ };
    });
    return { elu: elu, els: els, psi0: { S: psiS, W: psiW, H: PSI0.H }, gama: GAMA };
  }

  return {
    NEVE_CZ: NEVE_CZ, NEVE_CE: NEVE_CE, VENTO_VB0: VENTO_VB0, TERRENO: TERRENO, POSICOES: POSICOES, SOBRECARGA_H: SOBRECARGA_H,
    NEVE_DISTRITOS: NEVE_DISTRITOS, NEVE_B3: NEVE_B3, concelhosDistrito: concelhosDistrito, zonaNeve: zonaNeve,
    coeficienteOrografia: coeficienteOrografia,
    mu1: mu1, neve: neve, pressaoPico: pressaoPico, coeficientesCobertura: coeficientesCobertura, vento: vento,
    cargasMadre: cargasMadre, combinacoes: combinacoes,
    _interpolarAlfa: interpolarAlfa, _cpeArea: cpeArea
  };
})();

if (typeof module !== "undefined") module.exports = Acoes;
