/*
 * Propriedades de secções I/H laminadas e verificações base do Eurocódigo 3.
 * Unidades internas: mm, N. Os resultados são devolvidos nas unidades dos catálogos
 * (cm², cm⁴, cm³, kg/m, kN, kN·m).
 */
var Seccao = (function () {
  // Coeficientes parciais — NP EN 1993-1-1, Anexo Nacional (valores recomendados).
  var GAMMA_M0 = 1.0;
  var GAMMA_M1 = 1.0;
  var DENSIDADE = 7850; // kg/m³

  // fy e fu (MPa) da norma de produto, como manda o NA–3.2.1(1) da NP EN 1993-1-1 (opção a), e não do
  // Quadro 3.1, que dá valores mais altos entre 16 e 40 mm. fy por escalões de espessura nominal
  // (t ≤ 16, ≤ 40, ≤ 63, ≤ 80 mm); fu mínimo para 3 ≤ t ≤ 100 mm.
  var ESCALOES_T = [16, 40, 63, 80];
  var ACOS = {
    S235: { norma: "EN 10025-2", fy: [235, 225, 215, 215], fu: 360 },
    S275: { norma: "EN 10025-2", fy: [275, 265, 255, 245], fu: 410 },
    S355: { norma: "EN 10025-2", fy: [355, 345, 335, 325], fu: 470 },
    S460: { norma: "EN 10025-3", fy: [460, 440, 430, 410], fu: 540 }
  };

  // Concordância (área, centróide e inércia própria) de cada um dos 4 cantos arredondados.
  var K_AREA = 1 - Math.PI / 4;
  var K_CENTROIDE = (10 - 3 * Math.PI) / (12 - 3 * Math.PI);

  // Inércia própria do canto (quadrado r×r menos quarto de círculo) em torno do seu centróide.
  function inerciaCanto(r) {
    var aq = Math.PI * r * r / 4;
    var dq = r - 4 * r / (3 * Math.PI);              // centróide do quarto de círculo à face
    var iq = Math.PI * Math.pow(r, 4) / 16 - aq * Math.pow(4 * r / (3 * Math.PI), 2) + aq * dq * dq;
    var iFace = Math.pow(r, 4) / 3 - iq;             // em torno da face da alma/banzo
    var a = K_AREA * r * r;
    return iFace - a * Math.pow(K_CENTROIDE * r, 2);
  }

  function aPartirDeLinha(familia, linha) {
    return {
      familia: familia, nome: linha[0],
      h: linha[1], b: linha[2], tw: linha[3], tf: linha[4], r: linha[5]
    };
  }

  function propriedades(p) {
    var h = p.h, b = p.b, tw = p.tw, tf = p.tf, r = p.r;
    var hw = h - 2 * tf;
    var aCanto = K_AREA * r * r;
    var iCanto = inerciaCanto(r);
    var zCanto = h / 2 - tf - K_CENTROIDE * r;       // distância do canto ao eixo y-y
    var yCanto = tw / 2 + K_CENTROIDE * r;           // distância do canto ao eixo z-z

    var A = 2 * b * tf + hw * tw + 4 * aCanto;

    var Iy = (b * Math.pow(h, 3) - (b - tw) * Math.pow(hw, 3)) / 12
      + 4 * (iCanto + aCanto * zCanto * zCanto);
    var Iz = 2 * tf * Math.pow(b, 3) / 12 + hw * Math.pow(tw, 3) / 12
      + 4 * (iCanto + aCanto * yCanto * yCanto);

    var Wply = 2 * (b * tf * (h - tf) / 2 + tw * Math.pow(hw / 2, 2) / 2 + 2 * aCanto * zCanto);
    var Wplz = tf * b * b / 2 + hw * tw * tw / 4 + 4 * aCanto * yCanto;

    // Área de corte (EC3 6.2.6(3)a), com η = 1,0 do lado da segurança.
    var Avz = Math.max(A - 2 * b * tf + (tw + 2 * r) * tf, hw * tw);

    // Constante de torsão de St. Venant com contribuição das concordâncias (fórmula SCI P363).
    var alfa = (tw / tf) * (0.145 + 0.1 * r / tf);
    var D = (Math.pow(r + tw / 2, 2) + Math.pow(r + tf, 2) - r * r) / (2 * r + tf);
    var It = 2 / 3 * (b - 0.63 * tf) * Math.pow(tf, 3) + 1 / 3 * hw * Math.pow(tw, 3)
      + 2 * alfa * Math.pow(D, 4);

    var Iw = Iz * Math.pow(h - tf, 2) / 4;

    // Superfície exterior por metro (pintura, proteção ao fogo).
    var perimetro = 4 * b + 2 * h - 2 * tw - 8 * r + 2 * Math.PI * r;

    return {
      A: A / 1e2,
      G: A * 1e-6 * DENSIDADE,
      Iy: Iy / 1e4, Wely: Iy / (h / 2) / 1e3, Wply: Wply / 1e3, iy: Math.sqrt(Iy / A) / 10,
      Avz: Avz / 1e2,
      Iz: Iz / 1e4, Welz: Iz / (b / 2) / 1e3, Wplz: Wplz / 1e3, iz: Math.sqrt(Iz / A) / 10,
      It: It / 1e4, Iw: Iw / 1e6,
      AL: perimetro / 1e3
    };
  }

  // t: espessura nominal do elemento mais espesso da secção (o banzo, nos perfis I e H).
  function tensoes(classeAco, t) {
    var a = ACOS[classeAco], i = 0;
    while (i < ESCALOES_T.length - 1 && t > ESCALOES_T[i]) i++;
    return { fy: a.fy[i], fu: a.fu, escalao: [i ? ESCALOES_T[i - 1] : 0, ESCALOES_T[i]] };
  }

  // EC3 Quadro 5.2 — classe para flexão pura (y-y) e compressão pura.
  function classificar(p, fy) {
    var eps = Math.sqrt(235 / fy);
    var cBanzo = (p.b - p.tw - 2 * p.r) / 2;
    var cAlma = p.h - 2 * p.tf - 2 * p.r;
    var rBanzo = cBanzo / p.tf / eps;
    var rAlma = cAlma / p.tw / eps;

    function classe(rel, limites) {
      for (var i = 0; i < limites.length; i++) if (rel <= limites[i]) return i + 1;
      return 4;
    }
    var banzo = classe(rBanzo, [9, 10, 14]);
    var almaFlexao = classe(rAlma, [72, 83, 124]);
    var almaCompressao = classe(rAlma, [33, 38, 42]);

    return {
      eps: eps,
      banzo: { c_t: cBanzo / p.tf, classe: banzo },
      alma: { c_t: cAlma / p.tw, flexao: almaFlexao, compressao: almaCompressao },
      flexao: Math.max(banzo, almaFlexao),
      compressao: Math.max(banzo, almaCompressao)
    };
  }

  // Resistências de cálculo da secção (EC3 6.2). Devolve null quando a classe 4 o impede.
  function resistencias(p, props, fy) {
    var cl = classificar(p, fy);
    var W = cl.flexao <= 2 ? props.Wply : props.Wely;
    return {
      classe: cl,
      NplRd: cl.compressao <= 3 ? props.A * 1e2 * fy / GAMMA_M0 / 1e3 : null,
      McyRd: cl.flexao <= 3 ? W * 1e3 * fy / GAMMA_M0 / 1e6 : null,
      VplzRd: props.Avz * 1e2 * (fy / Math.sqrt(3)) / GAMMA_M0 / 1e3
    };
  }

  // ----- Perfis U (UPN e UPE): propriedades pela integração exata do contorno -----
  function aPartirDeLinhaU(familia, l) {
    var upn = familia === "UPN";
    return { familia: familia, nome: l[0], h: l[1], b: l[2], tw: l[3], tf: l[4], r: l[5], r2: upn ? l[6] : 0,
      inclinacao: upn ? (l[1] > 300 ? 0.05 : 0.08) : 0, tipo: "U" };
  }

  // Concordância de raio r no vértice P entre as arestas P0→P e P→P1 (pontos do arco, de tangente a tangente).
  function concordancia(P0, P, P1, r, n) {
    if (!r) return [P];
    var u1 = [P[0] - P0[0], P[1] - P0[1]], u2 = [P1[0] - P[0], P1[1] - P[1]];
    var l1 = Math.hypot(u1[0], u1[1]), l2 = Math.hypot(u2[0], u2[1]);
    var a = [-u1[0] / l1, -u1[1] / l1], c = [u2[0] / l2, u2[1] / l2];
    var th = Math.acos(Math.max(-1, Math.min(1, a[0] * c[0] + a[1] * c[1])));
    var d = r / Math.tan(th / 2), bl = Math.hypot(a[0] + c[0], a[1] + c[1]);
    var bis = [(a[0] + c[0]) / bl, (a[1] + c[1]) / bl], dc = r / Math.sin(th / 2);
    var C = [P[0] + bis[0] * dc, P[1] + bis[1] * dc];
    var T1 = [P[0] + a[0] * d, P[1] + a[1] * d], T2 = [P[0] + c[0] * d, P[1] + c[1] * d];
    var f1 = Math.atan2(T1[1] - C[1], T1[0] - C[0]), f2 = Math.atan2(T2[1] - C[1], T2[0] - C[0]), df = f2 - f1;
    while (df > Math.PI) df -= 2 * Math.PI;
    while (df < -Math.PI) df += 2 * Math.PI;
    var pts = [];
    for (var k = 0; k <= n; k++) pts.push([C[0] + r * Math.cos(f1 + df * k / n), C[1] + r * Math.sin(f1 + df * k / n)]);
    return pts;
  }

  // Contorno do U (dorso da alma em x = 0, eixo y-y em y = 0), percorrido no sentido anti-horário.
  function contornoU(p) {
    var h = p.h, b = p.b, tw = p.tw;
    function t(x) { return p.tf + (b / 2 - x) * p.inclinacao; }   // espessura do banzo à distância x do dorso
    var v = [[0, -h / 2], [b, -h / 2], [b, -h / 2 + t(b)], [tw, -h / 2 + t(tw)], [tw, h / 2 - t(tw)], [b, h / 2 - t(b)], [b, h / 2], [0, h / 2]];
    var raio = [0, 0, p.r2, p.r, p.r, p.r2, 0, 0], pts = [];
    v.forEach(function (P, i) {
      pts = pts.concat(concordancia(v[(i + v.length - 1) % v.length], P, v[(i + 1) % v.length], raio[i], 10));
    });
    return pts;
  }

  // Área, momentos estáticos e de inércia de um polígono (em relação à origem).
  function integrar(pts) {
    var A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0;
    for (var i = 0; i < pts.length; i++) {
      var x1 = pts[i][0], y1 = pts[i][1], x2 = pts[(i + 1) % pts.length][0], y2 = pts[(i + 1) % pts.length][1];
      var cr = x1 * y2 - x2 * y1;
      A += cr / 2; Sx += (x1 + x2) * cr / 6; Sy += (y1 + y2) * cr / 6;
      Iyy += (y1 * y1 + y1 * y2 + y2 * y2) * cr / 12; Ixx += (x1 * x1 + x1 * x2 + x2 * x2) * cr / 12;
    }
    return { A: A, Sx: Sx, Sy: Sy, Iyy: Iyy, Ixx: Ixx };
  }

  // Parte do polígono com dentro(ponto) verdadeiro, recortada pela reta (Sutherland–Hodgman).
  function recortar(pts, dentro, corte) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var P = pts[i], Q = pts[(i + 1) % pts.length], dp = dentro(P), dq = dentro(Q);
      if (dp) out.push(P);
      if (dp !== dq) out.push(corte(P, Q));
    }
    return out;
  }

  function propriedadesU(p) {
    var pts = contornoU(p), g = integrar(pts), A = g.A;
    var xc = g.Sx / A;                                   // centro de gravidade a partir do dorso da alma
    var Iy = g.Iyy, Iz = g.Ixx - A * xc * xc;
    // Wpl,y: secção simétrica em relação a y-y → 2 × momento estático da metade superior.
    var sup = recortar(pts, function (P) { return P[1] >= 0; }, function (P, Q) { var f = -P[1] / (Q[1] - P[1]); return [P[0] + f * (Q[0] - P[0]), 0]; });
    var Wply = 2 * integrar(sup).Sy;
    // Wpl,z: eixo neutro plástico vertical que divide a área ao meio.
    function lado(xp, esquerda) {
      return recortar(pts, function (P) { return esquerda ? P[0] <= xp : P[0] >= xp; }, function (P, Q) { var f = (xp - P[0]) / (Q[0] - P[0]); return [xp, P[1] + f * (Q[1] - P[1])]; });
    }
    var lo = 0, hi = p.b;
    for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (integrar(lado(m, true)).A < A / 2) lo = m; else hi = m; }
    var xp = (lo + hi) / 2, ge = integrar(lado(xp, true)), gd = integrar(lado(xp, false));
    var Wplz = (gd.Sx - xp * gd.A) + (xp * ge.A - ge.Sx);
    // Torção e empenamento pelas fórmulas de paredes finas (linha média; valores aproximados).
    var bl = p.b - p.tw / 2, hl = p.h - p.tf;
    var It = (2 * bl * Math.pow(p.tf, 3) + hl * Math.pow(p.tw, 3)) / 3;
    var Iw = p.tf * Math.pow(bl, 3) * hl * hl / 12 * (3 * bl * p.tf + 2 * hl * p.tw) / (6 * bl * p.tf + hl * p.tw);
    var e = 3 * bl * bl * p.tf / (6 * bl * p.tf + hl * p.tw);   // centro de corte à linha média da alma
    // Área de corte (6.2.6(3)c) para perfis U: A − 2 b tf + (tw + r) tf.
    var Avz = A - 2 * p.b * p.tf + (p.tw + p.r) * p.tf;
    return {
      A: A / 1e2, G: A * 1e-6 * DENSIDADE,
      Iy: Iy / 1e4, Wely: Iy / (p.h / 2) / 1e3, Wply: Wply / 1e3, iy: Math.sqrt(Iy / A) / 10,
      Avz: Avz / 1e2,
      Iz: Iz / 1e4, Welz: Iz / Math.max(xc, p.b - xc) / 1e3, Wplz: Wplz / 1e3, iz: Math.sqrt(Iz / A) / 10,
      It: It / 1e4, Iw: Iw / 1e6, ys: xc / 10, eCorte: (e + p.tw / 2) / 10,
      AL: (2 * p.h + 4 * p.b - 2 * p.tw) / 1e3, contorno: pts
    };
  }

  // Classes (Quadro 5.2): banzos em consola, c = b − tw − r; alma interior, c = h − 2 tf − 2 r.
  function classificarU(p, fy) {
    var eps = Math.sqrt(235 / fy), cB = p.b - p.tw - p.r, cA = p.h - 2 * p.tf - 2 * p.r;
    function classe(rel, lim) { for (var i = 0; i < lim.length; i++) if (rel <= lim[i]) return i + 1; return 4; }
    var banzo = classe(cB / p.tf / eps, [9, 10, 14]);
    return {
      eps: eps, banzo: { c_t: cB / p.tf, classe: banzo },
      alma: { c_t: cA / p.tw, flexao: classe(cA / p.tw / eps, [72, 83, 124]), compressao: classe(cA / p.tw / eps, [33, 38, 42]) },
      flexao: Math.max(banzo, classe(cA / p.tw / eps, [72, 83, 124])),
      compressao: Math.max(banzo, classe(cA / p.tw / eps, [33, 38, 42]))
    };
  }

  function todosU() {
    var lista = [];
    if (typeof PERFIS_U === "undefined") return lista;
    Object.keys(PERFIS_U).forEach(function (fam) {
      PERFIS_U[fam].linhas.forEach(function (l) { lista.push(aPartirDeLinhaU(fam, l)); });
    });
    return lista;
  }

  function todos() {
    var lista = [];
    Object.keys(PERFIS).forEach(function (fam) {
      PERFIS[fam].linhas.forEach(function (l) { lista.push(aPartirDeLinha(fam, l)); });
    });
    return lista;
  }

  return {
    ACOS: ACOS, GAMMA_M0: GAMMA_M0, GAMMA_M1: GAMMA_M1,
    todos: todos, propriedades: propriedades, tensoes: tensoes,
    classificar: classificar, resistencias: resistencias,
    todosU: todosU, propriedadesU: propriedadesU, classificarU: classificarU, contornoU: contornoU
  };
})();

if (typeof module !== "undefined") module.exports = Seccao;
