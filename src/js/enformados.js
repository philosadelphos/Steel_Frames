/*
 * Madres em aço enformado a frio (Superomega, C e Z da O Feliz) segundo a EN 1993-1-3, 10.1:
 * vigas travadas pelo revestimento no banzo superior, com o banzo inferior livre.
 * Sem o Anexo Nacional português da EN 1993-1-3, usam-se os valores recomendados (γM0 = γM1 = 1,0;
 * χLT do banzo livre pela curva b com λLT,0 = 0,4 e β = 0,75, nota de 10.1.4.2(1)).
 * Depende de madres.js (esquemas e esforços) e de ofeliz.js (dados). Unidades como em madres.js.
 */
var Enformados = (function () {
  var E = 210000, NU = 0.3;
  var GAMMA_M0 = 1.0, GAMMA_M1 = 1.0;

  var FAMILIAS = {
    Superomega: { nome: "Superomega", descricao: "Superomega® (ómega) · O Feliz", acos: ["S280GD", "S350GD"], almas: 2, esquadro: false },
    C: { nome: "C", descricao: "Madres C · O Feliz", acos: ["S220GD", "S250GD", "S280GD", "S320GD", "S350GD"], almas: 1, esquadro: true },
    Z: { nome: "Z", descricao: "Madres Z · O Feliz", acos: ["S220GD", "S250GD", "S280GD", "S320GD", "S350GD"], almas: 1, esquadro: true }
  };
  function seccoes(fam) { return fam === "Superomega" ? OFELIZ.superomega.seccoes : OFELIZ[fam]; }
  function fyb(aco) { return parseInt(aco.slice(1), 10); }

  // ----- Propriedades -----
  // Linha média de cantos vivos das C e Z, como o fabricante a usou: h − t, b − t, reforço a − t/2.
  function cantosVivos(s) {
    return { hm: s.h - s.t, bm: s.b - s.t, am: s.a - s.t / 2 };
  }

  // Redução δ dos cantos arredondados (EN 1993-1-3, 5.1(4)): quatro cantos de 90° com raio interior r.
  // O catálogo das C e Z despreza-os, mas a 5.1(3) só o permite se r ≤ 0,10 bp em todos os elementos.
  function deltaCantos(s) {
    var g = cantosVivos(s);
    return 0.43 * 4 * s.r / (g.hm + 2 * g.bm + 2 * g.am);
  }

  // Banzo livre = banzo inferior + reforço + 1/5 da altura da alma (10.1.4.1(2)), secção bruta.
  // Devolve A (mm²), I em torno do eixo vertical próprio (mm⁴) e a distância à fibra extrema (mm).
  function banzoLivreCZ(s, t) {
    var g = cantosVivos(s), hw = g.hm / 5;
    var partes = [ // [comprimento, x do centro, comprimento projetado em x]
      [hw, 0, 0], [g.bm, g.bm / 2, g.bm], [g.am, g.bm, 0]
    ];
    var A = 0, Sx = 0;
    partes.forEach(function (p) { A += p[0] * t; Sx += p[0] * t * p[1]; });
    var xc = Sx / A, I = 0;
    partes.forEach(function (p) { I += p[0] * t * Math.pow(p[1] - xc, 2) + t * Math.pow(p[2], 3) / 12; });
    return { A: A, I: I, c: Math.max(xc, g.bm - xc) + t / 2 };
  }

  /*
   * Propriedades de uma secção para a classe de aço escolhida, em unidades de cálculo:
   * W em cm³, I em cm⁴; banzo livre e geometria em mm.
   */
  function propriedades(fam, s, aco) {
    var F = FAMILIAS[fam], ef = s.ef[aco], t = s.teff, p = { familia: fam, nome: s.nome, G: s.G, fy: fyb(aco), t: t, h: s.h, almas: F.almas };
    if (fam === "Superomega") {
      var geo = OFELIZ.superomega.geo[s.h];
      p.delta = 0;
      p.A = s.A; p.Iy = s.Iy;
      p.Aeff = Math.min(ef[0], s.A);              // as folhas excedem A em até 0,4 % em três secções
      p.Wpos = ef[2]; p.Wneg = ef[4];             // +: banzo superior comprimido
      p.Ieff = Math.min(ef[1], ef[3]);
      p.Wz = ef[6];
      p.hw = s.h - s.t; p.sd = geo.sd; p.phi = geo.phi; p.r = geo.r;
      p.b = geo.bTopo; p.hd = geo.sd;
      p.livre = { A: geo.livre[0] * t, I: geo.livre[1] * t, c: geo.livre[2] };
      p.kh = { gravidade: 0, succao: 0 };         // secção simétrica carregada no eixo do centro de corte
    } else {
      var d = deltaCantos(s), g = cantosVivos(s);
      p.delta = d;
      p.A = s.A * (1 - d); p.Iy = s.Iy * (1 - 2 * d);
      p.Aeff = Math.min(ef[0], s.A) * (1 - d);
      p.Wpos = p.Wneg = ef[2] * (1 - 2 * d);
      p.Ieff = ef[1] * (1 - 2 * d);
      p.Wz = (fam === "C" ? Math.min(ef[4], ef[6]) : ef[4]) * (1 - 2 * d);
      p.hw = g.hm; p.sd = g.hm; p.phi = 90; p.r = s.r;
      p.b = g.bm; p.hd = g.hm;
      var bl = banzoLivreCZ(s, t);
      p.livre = { A: bl.A * (1 - d), I: bl.I * (1 - 2 * d), c: bl.c };
      // Carga equivalente no banzo livre (Figura 10.3), com a fixação a meio do banzo superior (a = b/2).
      var a = g.bm / 2;
      if (fam === "Z") {
        var kh0 = g.hm * t * (g.bm * g.bm + 2 * g.am * g.bm - 2 * g.am * g.am * g.bm / g.hm) / (4 * s.Iy * (1 - 2 * d) * 1e4);
        p.kh = { gravidade: kh0, succao: Math.abs(kh0 - a / g.hm), kh0: kh0 };
      } else {
        // C: Iyz = 0, logo kh0 = 0; e = f = distância da fixação ao centro de corte (fora da alma).
        p.kh = { gravidade: (a + s.ycc) / g.hm, succao: (a + s.ycc) / g.hm, kh0: 0 };
      }
    }
    p.livre.W = p.livre.I / p.livre.c;
    p.livre.i = Math.sqrt(p.livre.I / p.livre.A);
    return p;
  }

  // ----- Restrição dada pelo revestimento (10.1.5) -----
  /*
   * cfg.restricao: "nenhuma" (K = 0), "chapa" (CD,A = 130 p, 10.1.5.2(7)) ou "cd" (CD do fabricante).
   * K (N/mm por mm) pela expressão (10.13), com bmod = 2a + b (a = b/2), o maior dos dois casos.
   */
  function restricao(p, cfg) {
    var r = { tipo: cfg.restricao || "nenhuma", K: 0, CD: 0, valida: true, nota: "" };
    if (r.tipo === "nenhuma") return r;
    var a = p.b / 2;
    if (r.tipo === "chapa") {
      // Condições de 10.1.5.2(7) que dependem da madre: distâncias da fixação à alma e ao bordo ≥ 25 mm.
      if (a < 25) {
        r.valida = false;
        r.nota = "C<sub>D,A</sub> = 130 p não se aplica: o banzo superior tem " + Math.round(p.b) + " mm e a fixação fica a menos de 25 mm da alma (10.1.5.2(7)). Usa-se K = 0.";
        r.tipo = "nenhuma";
        return r;
      }
      r.CD = 130 * cfg.fixacoes;        // N·m/m/rad = N·mm/mm/rad
    } else {
      r.CD = cfg.CD * 1000;             // kN·m/m/rad
    }
    var bmod = 2 * a + p.b;
    var inv = 4 * (1 - NU * NU) * p.h * p.h * (p.hd + bmod) / (E * Math.pow(p.t, 3)) + p.h * p.h / r.CD;
    r.K = 1 / inv;
    return r;
  }

  // Coeficientes ηi dos Quadros 10.2a (gravidade) e 10.2b (sucção), por número de tirantes.
  var ETA_GRAV = {
    extremo: [[0.414, 1.72, 1.11, -0.178], [0.515, 1.26, 0.868, -0.242], [0.596, 2.33, 1.15, -0.192]],
    interior: [[0.657, 8.17, 2.22, -0.107], [0.596, 2.33, 1.15, -0.192], [0.596, 2.33, 1.15, -0.192]]
  };
  var ETA_SUCC = {
    simples: [[0.694, 5.45, 1.27, -0.168], [0.800, 6.75, 1.49, -0.155], [0.902, 8.55, 2.18, -0.111]],
    extremo: [[0.515, 1.26, 0.868, -0.242], [0.800, 6.75, 1.49, -0.155], [0.800, 6.75, 1.49, -0.155]],
    interior: [[0.306, 0.232, 0.742, -0.279], [0.515, 1.26, 0.868, -0.242], [0.800, 6.75, 1.49, -0.155]]
  };
  // Sobreposições e mangas sem continuidade total: valores do Quadro 10.2a para 3 tirantes (10.1.4.2(3)).
  var ETA_SOBREPOSICAO = [0.694, 5.45, 1.27, -0.168];

  function comprimentoLfz(eta, La, R) {
    return eta[0] * La * Math.pow(1 + eta[1] * Math.pow(Math.min(R, 200), eta[2]), eta[3]);
  }

  // χLT do banzo livre: EN 1993-1-1, 6.3.2.3, curva b, λLT,0 = 0,4 e β = 0,75 (valores recomendados).
  function chiBanzoLivre(lambda) {
    var l0 = 0.4, beta = 0.75, alfa = 0.34;
    if (lambda <= l0) return 1;
    var phi = 0.5 * (1 + alfa * (lambda - l0) + beta * lambda * lambda);
    var chi = 1 / (phi + Math.sqrt(phi * phi - beta * lambda * lambda));
    return Math.min(chi, 1, 1 / (lambda * lambda));
  }

  /*
   * Encurvadura do banzo livre comprimido (10.1.4.2) e momento lateral Mfz (10.1.4.1(5) a (7)).
   * zona: "vao" (sucção) ou "apoio" (gravidade sobre um apoio intermédio).
   */
  function banzoLivre(p, cfg, rest, zona, qh, Ph) {
    var n = cfg.tirantes, La = cfg.L * 1000 / (n + 1);
    var R = rest.K * Math.pow(La, 4) / (Math.pow(Math.PI, 4) * E * p.livre.I);
    var Rk = Math.min(R, 40);    // validade do Quadro 10.1
    var kappa = n === 0 && zona === "vao" ? (1 - 0.0225 * Rk) / (1 + 1.013 * Rk) : (1 + 0.0314 * Rk) / (1 + 0.396 * Rk);
    // Mfz = κR · M0,fz, com M0,fz = qh La²/8 (o maior valor do Quadro 10.1) e, havendo, a carga concentrada.
    var Mfz = kappa * (qh * La * La / 8 + Ph * 1000 * La / 4);
    var etas;
    if (cfg.continuidade === "parcial" || cfg.continuidade === "total-sobreposicao") etas = [ETA_SOBREPOSICAO];
    else if (zona === "apoio") etas = [ETA_GRAV.extremo[n], ETA_GRAV.interior[n]];
    else if (cfg.esquema === "simples") etas = [ETA_SUCC.simples[n]];
    else etas = [ETA_SUCC.extremo[n], ETA_SUCC.interior[n]];
    var lfz = Math.max.apply(null, etas.map(function (eta) { return comprimentoLfz(eta, La, R); }));
    var lambda1 = Math.PI * Math.sqrt(E / p.fy);
    var lambda = lfz / p.livre.i / lambda1;
    return { La: La, R: R, kappa: kappa, Mfz: Mfz, lfz: lfz, lambda: lambda, chi: chiBanzoLivre(lambda) };
  }

  // ----- Esforço transverso (6.1.5) -----
  // λw pela (6.10a) com a altura desenvolvida sd (do lado da segurança nas almas com dobras).
  function corteResistente(p, comEsquadro) {
    var lw = 0.346 * p.sd / p.t * Math.sqrt(p.fy / E);
    var fbv;
    if (lw <= 0.83) fbv = 0.58 * p.fy;
    else if (lw < 1.4 || comEsquadro) fbv = 0.48 * p.fy / lw;
    else fbv = 0.67 * p.fy / (lw * lw);
    var phi = p.phi * Math.PI / 180;
    return { lambda: lw, fbv: fbv, VbRd: p.almas * (p.hw / Math.sin(phi)) * p.t * fbv / GAMMA_M0 / 1000 };
  }

  // ----- Esmagamento da alma (6.1.7.3), por alma, para secções com duas almas apoiadas pelas abas -----
  function esmagamentoAlma(p, categoria, la) {
    var alfa = categoria === 1 ? 0.057 : 0.115;     // perfis em ómega ("hat sections")
    var l = categoria === 1 ? 10 : Math.min(la, 200);
    var t = p.t;
    var Rw = alfa * t * t * Math.sqrt(p.fy * E) * (1 - 0.1 * Math.sqrt(p.r / t)) * (0.5 + Math.sqrt(0.02 * l / t)) *
      (2.4 + Math.pow(p.phi / 90, 2)) / GAMMA_M1;
    var condicoes = p.r / t <= 10 && p.hw / t <= 200 * Math.sin(p.phi * Math.PI / 180) && p.phi >= 45 && p.phi <= 90;
    return { Rw: Rw / 1000, la: l, categoria: categoria, condicoes: condicoes };
  }

  // ----- Viga contínua de vãos iguais (L = 1): equação dos três momentos -----
  // cargas: por vão, { q: carga uniforme, P: [[a, P], ...] com a medido desde o apoio da esquerda }.
  function momentosApoio(cargas) {
    var n = cargas.length, m = n - 1;
    if (m === 0) return [0, 0];
    var A = [], b = [];
    for (var i = 0; i < m; i++) { A.push(new Array(m).fill(0)); b.push(0); }
    function termo(c, aDireita) {
      var s = c.q / 4;
      (c.P || []).forEach(function (x) { var a = aDireita ? x[0] : 1 - x[0]; s += x[1] * a * (1 - a * a); });
      return s;
    }
    for (var k = 1; k <= m; k++) {
      var r = k - 1;
      if (r > 0) A[r][r - 1] = 1;
      A[r][r] = 4;
      if (r < m - 1) A[r][r + 1] = 1;
      b[r] = -(termo(cargas[k - 1], true) + termo(cargas[k], false));
    }
    for (var c = 0; c < m; c++) for (var j = c + 1; j < m; j++) {
      var f = A[j][c] / A[c][c];
      for (var q = c; q < m; q++) A[j][q] -= f * A[c][q];
      b[j] -= f * b[c];
    }
    var x = new Array(m).fill(0);
    for (var w = m - 1; w >= 0; w--) {
      var s2 = b[w];
      for (var z = w + 1; z < m; z++) s2 -= A[w][z] * x[z];
      x[w] = s2 / A[w][w];
    }
    return [0].concat(x, [0]);
  }
  function momentoEm(cargas, M, vao, x) {
    var c = cargas[vao], m0 = c.q * x * (1 - x) / 2;
    (c.P || []).forEach(function (pp) { m0 += pp[1] * (x <= pp[0] ? (1 - pp[0]) * x : pp[0] * (1 - x)); });
    return m0 + M[vao] * (1 - x) + M[vao + 1] * x;
  }

  /*
   * Momento negativo máximo (banzo inferior comprimido sob gravidade) à distância d·L de um apoio
   * intermédio, como coeficientes: todos os vãos carregados (·qL²), sobrecarga na pior disposição (·qL²)
   * e carga concentrada na pior posição (·PL). 2 vãos, ou o máximo de 3 a 6 vãos.
   */
  var cacheJunto = {};
  function envolventeJuntoApoio(esquema, d) {
    var chave = esquema + ":" + d.toFixed(4);
    if (cacheJunto[chave]) return cacheJunto[chave];
    var ns = esquema === "continua2" ? [2] : [3, 4, 5, 6];
    var res = { todos: 0, alternada: 0, P: 0 };
    ns.forEach(function (n) {
      function negativoMax(cargas) {
        var M = momentosApoio(cargas), pior = -Infinity;
        for (var k = 1; k < n; k++) {
          pior = Math.max(pior, -momentoEm(cargas, M, k - 1, 1 - d), -momentoEm(cargas, M, k, d));
        }
        return pior;
      }
      var uns = []; for (var i = 0; i < n; i++) uns.push({ q: 1 });
      res.todos = Math.max(res.todos, negativoMax(uns));
      for (var mask = 1; mask < (1 << n); mask++) {
        var cg = []; for (var j = 0; j < n; j++) cg.push({ q: mask & (1 << j) ? 1 : 0 });
        res.alternada = Math.max(res.alternada, negativoMax(cg));
      }
      for (var v = 0; v < n; v++) for (var a = 0.02; a < 1; a += 0.02) {
        var cp = []; for (var u = 0; u < n; u++) cp.push({ q: 0, P: u === v ? [[a, 1]] : [] });
        res.P = Math.max(res.P, negativoMax(cp));
      }
    });
    cacheJunto[chave] = res;
    return res;
  }

  /*
   * Verifica uma secção. cfg, além do que madres.js usa: aco, ligacao ("continua" | "sobreposicao"),
   * sobreposicao (m, opcional), restricao, fixacoes (por metro), CD (kN·m/m/rad), apoio (mm, largura
   * de apoio para o esmagamento da alma).
   */
  function verificar(fam, s, cfg) {
    var F = FAMILIAS[fam], p = propriedades(fam, s, cfg.aco), L = cfg.L;
    var e = Madres.ESQUEMAS[cfg.esquema], eSimples = Madres.ESQUEMAS.simples;
    var continua = cfg.esquema !== "simples";
    var lSob = cfg.ligacao === "sobreposicao" && cfg.sobreposicao > 0 ? cfg.sobreposicao : 0;
    // Continuidade: total (madre contínua, ou sobreposição ≥ 0,1 L para cada lado) ou parcial
    // (sobreposição curta ou desconhecida: o vão verifica-se também como simplesmente apoiado, 10.1.3.4).
    var continuidade = !continua ? "nenhuma"
      : cfg.ligacao !== "sobreposicao" ? "total"
      : lSob >= 0.2 * L - 1e-9 ? "total-sobreposicao" : "parcial";
    var cfgB = Object.assign({}, cfg, { continuidade: continuidade });
    var duplaNoApoio = continua && lSob > 0;
    var rest = restricao(p, cfg);
    var fRd0 = p.fy / GAMMA_M0, fRd1 = p.fy / GAMMA_M1;
    var gMadre = p.G * 9.81 / 1000;
    var vRd = corteResistente(p, F.esquadro);
    var junto = lSob > 0 && continua ? envolventeJuntoApoio(cfg.esquema, Math.min(lSob / 2 / L, 0.5)) : null;

    var pior = { seccao: { u: 0 }, banzoLivre: { u: 0 }, corte: { u: 0 }, apoio: { u: 0 }, flecha: { u: 0 }, flechaVar: { u: 0 } };
    if (F.esquadro) pior.apoio = { u: 0, naoAplicavel: true };
    function registar(chave, u, extra) {
      if (u > pior[chave].u || (pior[chave].u === 0 && !pior[chave].comb)) pior[chave] = Object.assign({ u: u }, extra);
    }

    cfg.combELU.forEach(function (c) {
      var qn = c.qn + gMadre * c.gamaG * cfg.cosAlfa, qt = c.qt + gMadre * c.gamaG * cfg.senAlfa;
      var Pn = c.Pn || 0, Pt = c.Pt || 0, qnQ = c.qnQ || 0;
      var es = Madres.esforcos(e, qn, qnQ, L, Pn);
      var esS = Madres.esforcos(eSimples, qn, qnQ, L, Pn);
      var Mz = Madres.momentoPlano(qt, Pt, L / (cfg.tirantes + 1));
      var sz = Mz * 1e3 / p.Wz;
      var gravidade = qn + Pn > 0;
      var kh = gravidade ? p.kh.gravidade : p.kh.succao;
      var qh = kh * Math.abs(qn), Ph = kh * Math.abs(Pn);

      // Pontos a verificar: [onde, momento (> 0: banzo superior comprimido), multiplicador da secção, zona]
      var pontos = [];
      pontos.push(["vão", es.mVao, 1, "vao"]);
      if (continuidade === "parcial") pontos.push(["vão (como simplesmente apoiada)", esS.mVao, 1, "vao"]);
      if (continua) {
        pontos.push([duplaNoApoio ? "apoio (secção dupla)" : "apoio", -es.mApoio, duplaNoApoio ? 2 : 1, "apoio"]);
        if (junto) {
          var qRest = qn - qnQ;
          var mJ = gravidade
            ? junto.todos * qRest * L * L + junto.alternada * qnQ * L * L + junto.P * Pn * L
            : junto.todos * qn * L * L;
          pontos.push(["fim da sobreposição", -mJ, 1, "apoio"]);
        }
      }
      pontos.forEach(function (pt) {
        var M = pt[1], m = pt[2];
        if (M >= 0) {
          // Banzo superior (travado) comprimido: (10.3a); o banzo livre fica traccionado e Mfz = 0.
          var s1 = M * 1e3 / (p.Wpos * m) + sz;
          registar("seccao", s1 / fRd0, { comb: c.id, M: M, Mz: Mz, onde: pt[0], banzo: "superior" });
        } else {
          // Na secção dupla, cada uma das duas madres sobrepostas recebe metade de M e de Mfz.
          var bl = banzoLivre(p, cfgB, rest, pt[3], qh, Ph);
          var sM = -M * 1e3 / (p.Wneg * m), sF = bl.Mfz / (p.livre.W * m);
          registar("seccao", (sM + sz + sF) / fRd0, { comb: c.id, M: M, Mz: Mz, Mfz: bl.Mfz / 1e6, onde: pt[0], banzo: "inferior" });
          registar("banzoLivre", (sM / bl.chi + sz + sF) / fRd1, Object.assign({ comb: c.id, M: M, onde: pt[0] }, bl));
        }
      });

      // Esforço transverso e interação com o momento no apoio (6.1.10, com Mf,Rd = 0).
      var V = es.V, uV = V / vRd.VbRd, inter = 0;
      if (V > 0.5 * vRd.VbRd) {
        var Mapoio = continua ? Math.abs(es.mApoio) : 0;
        var W = continua && es.mApoio < 0 ? p.Wpos : p.Wneg;
        inter = Mapoio * 1e3 / (W * fRd0) + Math.pow(2 * V / vRd.VbRd - 1, 2);
      }
      registar("corte", Math.max(uV, inter), { comb: c.id, V: V, VbRd: vRd.VbRd, interacao: inter });

      // Reação de apoio com a madre apoiada pelas abas (Superomega): só com reação de compressão.
      if (!F.esquadro && gravidade) {
        var ext = esmagamentoAlma(p, 1, cfg.apoio);
        var Fext = continua ? es.V : esS.V;
        registar("apoio", Fext / (p.almas * ext.Rw), { comb: c.id, F: Fext, Rw: p.almas * ext.Rw, onde: "apoio extremo", categoria: 1, condicoes: ext.condicoes, la: ext.la });
        if (continua) {
          var mult = duplaNoApoio ? 2 : 1;
          var intn = esmagamentoAlma(p, 2, cfg.apoio);
          var Fi = 2 * es.V, RwI = p.almas * intn.Rw * mult;
          var Mi = Math.abs(es.mApoio), Mc = (es.mApoio > 0 ? p.Wneg : p.Wpos) * mult * fRd0 / 1e3;
          var u628 = Math.max(Fi / RwI, (Mi / Mc + Fi / RwI) / 1.25);
          registar("apoio", u628, { comb: c.id, F: Fi, Rw: RwI, M: Mi, Mc: Mc, onde: "apoio intermédio", categoria: 2, condicoes: intn.condicoes, la: intn.la });
        }
      }
    });

    // Flechas com Ieff (o menor dos dois sentidos); com continuidade parcial, como simplesmente apoiada.
    var eF = continuidade === "parcial" ? eSimples : e;
    var I = p.Ieff * 1e4;
    cfg.combELS.forEach(function (c) {
      var qn = c.qn + gMadre * cfg.cosAlfa;
      var d = Madres.coefFlecha(eF, qn, c.qnQ || 0) * Math.pow(L * 1000, 4) / (E * I);
      var dVar = Madres.coefFlecha(eF, c.qnVar, c.qnQ || 0) * Math.pow(L * 1000, 4) / (E * I);
      registar("flecha", d / (L * 1000 / Madres.LIMITES_FLECHA.max), { comb: c.id, d: d, lim: L * 1000 / Madres.LIMITES_FLECHA.max });
      registar("flechaVar", dVar / (L * 1000 / Madres.LIMITES_FLECHA.variaveis), { comb: c.id, d: dVar, lim: L * 1000 / Madres.LIMITES_FLECHA.variaveis });
    });

    var uMax = Math.max.apply(null, Object.keys(pior).map(function (k) { return pior[k].u; }));
    return {
      enformado: true, familia: fam, perfil: { nome: s.nome }, sec: s, p: p, props: { G: p.G }, aco: cfg.aco,
      restricao: rest, corte: vRd, continuidade: continuidade, sobreposicao: lSob, duplaNoApoio: duplaNoApoio,
      verificacoes: pior, uMax: uMax, ok: uMax <= 1
    };
  }

  function dimensionar(fam, cfg) {
    var lista = seccoes(fam).map(function (s) { return verificar(fam, s, cfg); })
      .sort(function (a, b) { return a.props.G - b.props.G; });
    return { lista: lista, escolhido: lista.filter(function (r) { return r.ok; })[0] || null };
  }

  return {
    FAMILIAS: FAMILIAS, seccoes: seccoes, propriedades: propriedades, deltaCantos: deltaCantos, restricao: restricao,
    banzoLivre: banzoLivre, chiBanzoLivre: chiBanzoLivre, corteResistente: corteResistente, esmagamentoAlma: esmagamentoAlma,
    envolventeJuntoApoio: envolventeJuntoApoio, verificar: verificar, dimensionar: dimensionar
  };
})();

if (typeof module !== "undefined") module.exports = Enformados;
