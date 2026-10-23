/*
 * Pórtico de duas águas com bases encastradas, sem pontes rolantes (Fase 3).
 * Análise elástica de 1.ª ordem de barras no plano (método dos deslocamentos), com:
 *  - imperfeições globais (NP EN 1993-1-1, 5.3.2) e αcr pela expressão (5.2) (5.2.1(4)B);
 *  - efeitos de 2.ª ordem pela amplificação 1/(1 − 1/αcr) da parte antissimétrica (com deslocamento
 *    lateral) de cada combinação, para 3 ≤ αcr < 10 (5.2.2(5)B);
 *  - verificação das secções (6.2) e dos elementos (6.3.3, método 2 do Anexo B, normativo em Portugal),
 *    com comprimentos de encurvadura no plano iguais aos comprimentos reais (5.2.2(7)b).
 * Depende de seccao.js, madres.js (momento crítico e χLT) e acoes.js. Unidades: m, kN, kN·m.
 */
var Portico = (function () {
  var E = 210000;   // MPa
  var ALFA_CURVA = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 };

  // ----- Malha simétrica ao longo do pórtico: base E → beirado E → cumeeira → beirado D → base D -----
  /*
   * g: { W, hb, hc (m), nPilar, nTravessa, cortes: frações da projeção horizontal da meia travessa medidas
   *      a partir do beirado (0) até à cumeeira (1), que têm de ser nós nas duas águas }
   */
  function unir(l) {
    l = l.filter(function (x) { return x >= 0 && x <= 1; }).sort(function (a, b) { return a - b; });
    return l.filter(function (x, i) { return i === 0 || x - l[i - 1] > 1e-6; });
  }
  function malha(g) {
    var fp = [], ft = [], i;
    for (i = 0; i <= g.nPilar; i++) fp.push(i / g.nPilar);
    for (i = 0; i <= g.nTravessa; i++) ft.push(i / g.nTravessa);
    fp = unir(fp.concat(g.cortesPilar || []));
    ft = unir(ft.concat(g.cortes || []));
    var nos = [], membroNo = [];
    function no(x, y) { nos.push({ x: x, y: y }); return nos.length - 1; }
    var seq = [];
    fp.forEach(function (f) { seq.push(no(0, f * g.hb)); });                                           // pilar E
    ft.slice(1).forEach(function (f) { seq.push(no(f * g.W / 2, g.hb + f * (g.hc - g.hb))); });          // travessa E
    ft.slice(0, -1).reverse().forEach(function (f) { seq.push(no(g.W - f * g.W / 2, g.hb + f * (g.hc - g.hb))); }); // travessa D
    fp.slice(0, -1).reverse().forEach(function (f) { seq.push(no(g.W, f * g.hb)); });                    // pilar D
    var nP = fp.length - 1, nT = ft.length - 1;
    var elementos = [];
    for (i = 0; i < seq.length - 1; i++) {
      var membro = i < nP ? "pilarE" : i < nP + nT ? "travE" : i < nP + 2 * nT ? "travD" : "pilarD";
      var a = nos[seq[i]], b = nos[seq[i + 1]], L = Math.hypot(b.x - a.x, b.y - a.y);
      elementos.push({ i: seq[i], j: seq[i + 1], membro: membro, L: L, c: (b.x - a.x) / L, s: (b.y - a.y) / L });
    }
    // Posição de cada elemento ao longo do seu membro (s0, s1), a partir do início do membro no percurso.
    var acum = {};
    elementos.forEach(function (e) {
      e.s0 = acum[e.membro] || 0; e.s1 = e.s0 + e.L; acum[e.membro] = e.s1;
    });
    return {
      nos: nos, elementos: elementos, base: [seq[0], seq[seq.length - 1]],
      beirados: [seq[nP], seq[nP + 2 * nT]], cumeeira: seq[nP + nT],
      comprimento: { pilar: g.hb, travessa: Math.hypot(g.W / 2, g.hc - g.hb) }, alfa: Math.atan2(g.hc - g.hb, g.W / 2)
    };
  }

  // ----- Rigidez e solução (matriz em banda: só nós consecutivos estão ligados) -----
  function rigidezLocal(EA, EI, L) {
    var a = EA / L, b = 12 * EI / Math.pow(L, 3), c = 6 * EI / (L * L), d = 4 * EI / L, f = 2 * EI / L;
    return [
      [a, 0, 0, -a, 0, 0], [0, b, c, 0, -b, c], [0, c, d, 0, -c, f],
      [-a, 0, 0, a, 0, 0], [0, -b, -c, 0, b, -c], [0, c, f, 0, -c, d]
    ];
  }
  function paraLocal(e, v) {   // vetor global de 6 → local
    return [e.c * v[0] + e.s * v[1], -e.s * v[0] + e.c * v[1], v[2], e.c * v[3] + e.s * v[4], -e.s * v[3] + e.c * v[4], v[5]];
  }
  function paraGlobal(e, v) {
    return [e.c * v[0] - e.s * v[1], e.s * v[0] + e.c * v[1], v[2], e.c * v[3] - e.s * v[4], e.s * v[3] + e.c * v[4], v[5]];
  }

  /*
   * Prepara o modelo para um par de secções: rigidez global fatorizada (Gauss em banda).
   * sec: { pilar: {A (cm²), Iy (cm⁴)}, travessa: {...} }
   */
  function modelo(m, sec) {
    var nn = m.nos.length, n = 3 * nn, bw = 5;
    m.elementos.forEach(function (e) {
      var s = e.membro.indexOf("pilar") === 0 ? sec.pilar : sec.travessa;
      e.k = rigidezLocal(E * s.A * 1e2 / 1e3, E * s.Iy * 1e4 / 1e9, e.L);   // kN e m
    });
    // Matriz em banda K[i][d], d = j − i + bw (|j − i| ≤ bw)
    var K = []; for (var i = 0; i < n; i++) K.push(new Float64Array(2 * bw + 1));
    m.elementos.forEach(function (e) {
      var T = [[e.c, e.s, 0], [-e.s, e.c, 0], [0, 0, 1]];
      var dofs = [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2];
      // kg = Tᵀ k T (blocos 3×3)
      for (var a = 0; a < 6; a++) for (var b = 0; b < 6; b++) {
        var v = 0;
        for (var p = 0; p < 3; p++) for (var q = 0; q < 3; q++) {
          v += T[p][a % 3] * e.k[3 * Math.floor(a / 3) + p][3 * Math.floor(b / 3) + q] * T[q][b % 3];
        }
        K[dofs[a]][dofs[b] - dofs[a] + bw] += v;
      }
    });
    // Apoios encastrados: graus de liberdade das duas bases fixos (linha e coluna anuladas, diagonal 1).
    var fixos = {};
    m.base.forEach(function (b) { for (var k = 0; k < 3; k++) fixos[3 * b + k] = true; });
    Object.keys(fixos).forEach(function (d) {
      d = +d;
      for (var o = -bw; o <= bw; o++) {
        var j = d + o; if (j < 0 || j >= n) continue;
        K[d][o + bw] = 0; K[j][-o + bw] = 0;
      }
      K[d][bw] = 1;
    });
    // Eliminação de Gauss em banda (simétrica e definida positiva: sem pivotagem)
    for (var k = 0; k < n; k++) {
      for (var r = k + 1; r <= Math.min(n - 1, k + bw); r++) {
        var f = K[r][k - r + bw] / K[k][bw];
        if (!f) continue;
        for (var c = k; c <= Math.min(n - 1, k + bw); c++) K[r][c - r + bw] -= f * K[k][c - k + bw];
        K[r][k - r + bw] = f;   // guarda o multiplicador
      }
    }
    return { m: m, K: K, n: n, bw: bw, fixos: fixos };
  }

  /*
   * Resolve um caso de carga. carga: { q: Float64Array(2·nElementos) com (qx, qy) globais por metro de
   * elemento, F: Float64Array(3·nNós) com forças e momentos nodais }.
   * Devolve deslocamentos, esforços nas estações (início, meio e fim de cada elemento) e reações.
   */
  function resolver(mod, carga) {
    var m = mod.m, n = mod.n, bw = mod.bw, K = mod.K;
    var F = new Float64Array(n), eq = [];
    if (carga.F) for (var i = 0; i < n; i++) F[i] = carga.F[i];
    m.elementos.forEach(function (e, k) {
      var qx = carga.q[2 * k], qy = carga.q[2 * k + 1];
      var wx = e.c * qx + e.s * qy, wy = -e.s * qx + e.c * qy, L = e.L;
      var pl = [wx * L / 2, wy * L / 2, wy * L * L / 12, wx * L / 2, wy * L / 2, -wy * L * L / 12];
      eq.push({ pl: pl, wx: wx, wy: wy });
      var pg = paraGlobal(e, pl);
      [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2].forEach(function (d, a) { F[d] += pg[a]; });
    });
    Object.keys(mod.fixos).forEach(function (d) { F[+d] = 0; });
    // Substituição progressiva e regressiva
    var u = new Float64Array(F);
    for (var k = 0; k < n; k++) for (var r = k + 1; r <= Math.min(n - 1, k + bw); r++) u[r] -= K[r][k - r + bw] * u[k];
    for (var k2 = n - 1; k2 >= 0; k2--) {
      var s = u[k2];
      for (var c = k2 + 1; c <= Math.min(n - 1, k2 + bw); c++) s -= K[k2][c - k2 + bw] * u[c];
      u[k2] = s / K[k2][bw];
    }
    // Esforços: f = k·u_local − p_eq (forças nas extremidades sobre o elemento, eixos locais)
    var ne = m.elementos.length, N = new Float64Array(3 * ne), V = new Float64Array(3 * ne), M = new Float64Array(3 * ne);
    var R = new Float64Array(6);
    m.elementos.forEach(function (e, k) {
      var ug = [u[3 * e.i], u[3 * e.i + 1], u[3 * e.i + 2], u[3 * e.j], u[3 * e.j + 1], u[3 * e.j + 2]];
      var ul = paraLocal(e, ug), f = [];
      for (var a = 0; a < 6; a++) {
        var v = -eq[k].pl[a];
        for (var b = 0; b < 6; b++) v += e.k[a][b] * ul[b];
        f.push(v);
      }
      var wx = eq[k].wx, wy = eq[k].wy;
      [0, 0.5, 1].forEach(function (t, p) {
        var x = t * e.L;
        N[3 * k + p] = -(f[0] + wx * x);                          // tração positiva
        V[3 * k + p] = f[1] + wy * x;
        M[3 * k + p] = -f[2] + f[1] * x + wy * x * x / 2;         // positivo: tração na face interior
      });
      // Reações: forças que os apoios exercem nas extremidades ligadas às bases
      var fg = paraGlobal(e, f);
      if (e.i === m.base[0]) { R[0] = fg[0]; R[1] = fg[1]; R[2] = fg[2]; }
      if (e.j === m.base[1]) { R[3] = fg[3]; R[4] = fg[4]; R[5] = fg[5]; }
    });
    return { u: u, N: N, V: V, M: M, R: R };
  }

  // Combinação linear de resultados: termos [[coeficiente, resultado], ...]
  function combinar(termos) {
    var r0 = termos[0][1], out = {};
    ["u", "N", "V", "M", "R"].forEach(function (k) {
      var a = new Float64Array(r0[k].length);
      termos.forEach(function (t) { var x = t[1][k]; for (var i = 0; i < a.length; i++) a[i] += t[0] * x[i]; });
      out[k] = a;
    });
    return out;
  }

  /*
   * Parte simétrica e antissimétrica de um resultado (malha simétrica): a estação i corresponde à
   * estação n − 1 − i. M e N são simétricos sob carga simétrica; V e as rotações e deslocamentos
   * horizontais mudam de sinal. Devolve sim + k·anti, com as reações recombinadas da mesma forma.
   */
  function amplificar(r, k, m) {
    if (k === 1) return r;
    var out = {};
    function lado(arr, sinal) {
      var n = arr.length, a = new Float64Array(n);
      for (var i = 0; i < n; i++) {
        var esp = sinal * arr[n - 1 - i];
        a[i] = (arr[i] + esp) / 2 + k * (arr[i] - esp) / 2;
      }
      return a;
    }
    out.N = lado(r.N, 1); out.M = lado(r.M, 1); out.V = lado(r.V, -1);
    // Deslocamentos: nó i ↔ nó espelho na sequência do percurso (os nós estão por essa ordem)
    var nn = r.u.length / 3, u = new Float64Array(r.u.length);
    for (var i = 0; i < nn; i++) {
      var j = nn - 1 - i;
      var sx = (r.u[3 * i] - r.u[3 * j]) / 2, ax = (r.u[3 * i] + r.u[3 * j]) / 2;      // ux: simétrico se ux_i = −ux_j
      var sy = (r.u[3 * i + 1] + r.u[3 * j + 1]) / 2, ay = (r.u[3 * i + 1] - r.u[3 * j + 1]) / 2;
      var sr = (r.u[3 * i + 2] - r.u[3 * j + 2]) / 2, ar = (r.u[3 * i + 2] + r.u[3 * j + 2]) / 2;
      u[3 * i] = sx + k * ax; u[3 * i + 1] = sy + k * ay; u[3 * i + 2] = sr + k * ar;
    }
    out.u = u;
    // Reações [Rx, Ry, M] E e D: espelho troca os apoios, Rx e M mudam de sinal.
    var R = r.R, Rm = [-R[3], R[4], -R[5], -R[0], R[1], -R[2]], Ro = new Float64Array(6);
    for (var q = 0; q < 6; q++) Ro[q] = (R[q] + Rm[q]) / 2 + k * (R[q] - Rm[q]) / 2;
    out.R = Ro;
    return out;
  }

  // ----- Ações no pórtico -----
  /*
   * Zonas do vento ao longo da cobertura (Figura 7.8) e nas paredes (Figura 7.5) para o pórtico analisado.
   * v: { W, C (comprimento), h (altura de referência), L (espaçamento), alfa (graus), posicao: "empena" | "corrente" }
   */
  function zonasVento(v) {
    var e0 = Math.min(v.C, 2 * v.h), e90 = Math.min(v.W, 2 * v.h), meia = v.W / 2;
    // θ = 0° (vento da esquerda): x medido em planta a partir do beirado de barlavento
    var z0;
    if (v.alfa < 5) {
      z0 = { esq: [[0, e0 / 10, "G"], [e0 / 10, e0 / 2, "H"], [e0 / 2, Infinity, "I"]], plano: true };
    } else {
      var faixaF = v.posicao === "empena" && v.L / 2 < e0 / 4;    // a faixa do pórtico toca os cantos F
      z0 = { barlavento: [[0, e0 / 10, faixaF ? "F" : "G"], [e0 / 10, Infinity, "H"]],
        sotavento: [[0, e0 / 10, "J"], [e0 / 10, Infinity, "I"]] };    // sotavento: a partir da cumeeira
    }
    // θ = 90°: zona da cobertura e das paredes laterais pela distância à empena de barlavento
    var x0 = v.posicao === "empena" ? v.L / 2 : Infinity;
    var z90 = x0 < e90 / 10 ? "FG" : x0 < e90 / 2 ? "H" : "I";
    var parede90 = x0 < e90 / 5 ? "A" : (x0 < e90 || e90 >= v.C) ? "B" : "C";
    return { e0: e0, e90: e90, meia: meia, z0: z0, z90: z90, parede90: parede90 };
  }

  // Frações (a partir do beirado, na projeção horizontal da meia travessa) onde mudam as zonas.
  function cortesVento(zv) {
    var c = [], meia = zv.meia;
    if (zv.z0.plano) {
      [zv.e0 / 10, zv.e0 / 2].forEach(function (x) { c.push(x / meia, (zv.meia * 2 - x) / meia); });
    } else {
      c.push(zv.e0 / 10 / meia, 1 - zv.e0 / 10 / meia);
    }
    if (zv.z90 === "FG") c.push(zv.e90 / 4 / meia);
    return c.filter(function (f) { return f > 0 && f < 1; });
  }

  /*
   * Casos de carga elementares (valores característicos), em kN/m por metro de elemento.
   * a: { L, gRev, gInst, gMadres (kN/m² de cobertura), qk, s (neve com μ1, kN/m² em projeção),
   *      qp, cpe paredes {D, E, A, B, C}, cpi [máx, mín], alfa (graus), zonas (zonasVento) }
   * pp: pesos próprios { pilar, travessa } em kN/m
   */
  function casosCarga(m, a, pp) {
    var ne = m.elementos.length, nn = m.nos.length, al = m.alfa, cosA = Math.cos(al), senA = Math.sin(al);
    function novo() { return { q: new Float64Array(2 * ne), F: new Float64Array(3 * nn) }; }
    function porMembro(f) {   // f(elemento, xm horizontal a partir do próprio beirado) → [qx, qy]
      var c = novo();
      m.elementos.forEach(function (e, k) {
        var xm;
        if (e.membro === "travE") xm = (e.s0 + e.s1) / 2 * cosA;
        else if (e.membro === "travD") xm = (m.comprimento.travessa - (e.s0 + e.s1) / 2) * cosA;
        var v = f(e, xm);
        if (v) { c.q[2 * k] = v[0]; c.q[2 * k + 1] = v[1]; }
      });
      return c;
    }
    var trav = function (e) { return e.membro === "travE" || e.membro === "travD"; };
    var casos = {};
    // Pesos próprios dos elementos (verticais, por metro de elemento)
    casos.Gp = porMembro(function (e) { return [0, -(trav(e) ? pp.travessa : pp.pilar)]; });
    // Revestimento e madres; instalações (por m² de cobertura, ao longo da travessa)
    casos.Gr = porMembro(function (e) { return trav(e) ? [0, -(a.gRev + a.gMadres) * a.L] : null; });
    casos.Gi = porMembro(function (e) { return trav(e) ? [0, -a.gInst * a.L] : null; });
    // Sobrecarga e neve: por m² em projeção horizontal → por metro de travessa × cos α
    function projecao(vE, vD) {
      return porMembro(function (e) {
        if (e.membro === "travE") return [0, -vE * a.L * cosA];
        if (e.membro === "travD") return [0, -vD * a.L * cosA];
        return null;
      });
    }
    casos.Qa = projecao(a.qk, a.qk); casos.Qe = projecao(a.qk, 0); casos.Qd = projecao(0, a.qk);
    casos.Si = projecao(a.s, a.s); casos.Sii = projecao(0.5 * a.s, a.s); casos.Siii = projecao(a.s, 0.5 * a.s);
    // Carga horizontal unitária (1 kN no total, metade em cada beirado): imperfeições e αcr
    var H = novo();
    m.beirados.forEach(function (b) { H.F[3 * b] = 0.5; });
    casos.H = H;
    // Vento: pressão resultante p = qp (cpe − cpi), positiva contra a superfície
    var zv = a.zonas, vento = [];
    function pressaoTrav(e, p) {   // força por metro de travessa, normal à água
      if (e.membro === "travE") return [p * a.L * senA, -p * a.L * cosA];
      return [-p * a.L * senA, -p * a.L * cosA];
    }
    function zonaEm(lista, x) { for (var i = 0; i < lista.length; i++) if (x < lista[i][1]) return lista[i][2]; return lista[lista.length - 1][2]; }
    function cpe(dir, zona, sinal) {
      var v = Acoes.cpeCobertura(a.alfa, dir, zona, sinal);
      return v === null ? Acoes.cpeCobertura(a.alfa, dir, zona, "neg") : v;
    }
    var sinais = zv.z0.plano ? [["neg", "neg"], ["neg", "pos"]] : [["neg", "neg"], ["neg", "pos"], ["pos", "neg"], ["pos", "pos"]];
    a.cpi.forEach(function (cpi) {
      sinais.forEach(function (sg) {
        var c = porMembro(function (e, x) {
          if (e.membro === "pilarE") return [a.qp * (a.cpe.D - cpi) * a.L, 0];
          if (e.membro === "pilarD") return [-a.qp * (a.cpe.E - cpi) * a.L, 0];
          var zona;
          if (zv.z0.plano) {
            var xg = e.membro === "travE" ? x : 2 * zv.meia - x;          // a partir do beirado de barlavento
            zona = zonaEm(zv.z0.esq, xg);
            return pressaoTrav(e, a.qp * (cpe(0, zona, zona === "I" ? sg[1] : sg[0]) - cpi));
          }
          if (e.membro === "travE") { zona = zonaEm(zv.z0.barlavento, x); return pressaoTrav(e, a.qp * (cpe(0, zona, sg[0]) - cpi)); }
          zona = zonaEm(zv.z0.sotavento, zv.meia - x);
          return pressaoTrav(e, a.qp * (cpe(0, zona, sg[1]) - cpi));
        });
        c.nome = "W 0° (" + (sg[0] === "neg" ? "−" : "+") + "/" + (sg[1] === "neg" ? "−" : "+") + "), c<sub>pi</sub> " + (cpi > 0 ? "+" : "") + cpi.toFixed(1).replace(".", ",").replace("-", "−");
        vento.push(c);
      });
      var c90 = porMembro(function (e, x) {
        var p = a.qp * (a.cpe[zv.parede90] - cpi);
        if (e.membro === "pilarE") return [p * a.L, 0];
        if (e.membro === "pilarD") return [-p * a.L, 0];
        var zona = zv.z90 === "FG" ? (x < zv.e90 / 4 ? "F" : "G") : zv.z90;
        return pressaoTrav(e, a.qp * (cpe(90, zona, "neg") - cpi));
      });
      c90.nome = "W 90°, c<sub>pi</sub> " + (cpi > 0 ? "+" : "") + cpi.toFixed(1).replace(".", ",").replace("-", "−");
      vento.push(c90);
    });
    casos.W = vento;
    return casos;
  }

  // ----- Combinações (NP EN 1990, 6.10 e características) -----
  /*
   * Lista de combinações como termos sobre os casos elementares. Cada combinação:
   * { nome, termos: [[coef, chave]], vento: true/false }. As chaves de vento são "W0".."W9".
   */
  function combinacoes(nVento, altitude) {
    var g = Acoes.GAMA, psiW = Acoes.PSI0.W, psiS = Acoes.psi0Neve(altitude);
    var Gdesf = [[g.Gsup, "Gp"], [g.Gsup, "Gr"], [g.Gsup, "Gi"]], Gfav = [[g.Ginf, "Gp"], [g.Ginf, "Gr"]];
    var Gk = [[1, "Gp"], [1, "Gr"], [1, "Gi"]], GkFav = [[1, "Gp"], [1, "Gr"]];
    var Qs = [["Qa", "Q (todas as águas)"], ["Qe", "Q (água esquerda)"], ["Qd", "Q (água direita)"]];
    var Ss = [["Si", "S (i)"], ["Sii", "S (ii)"], ["Siii", "S (iii)"]];
    var Ws = []; for (var i = 0; i < nVento; i++) Ws.push("W" + i);
    var elu = [], els = [];
    Qs.forEach(function (q) {
      elu.push({ nome: "1,35 G + 1,5 " + q[1], termos: Gdesf.concat([[g.Q, q[0]]]), variavel: [[g.Q, q[0]]] });
      els.push({ nome: "G + " + q[1], termos: Gk.concat([[1, q[0]]]), variavel: [[1, q[0]]] });
    });
    Ss.forEach(function (s) {
      elu.push({ nome: "1,35 G + 1,5 " + s[1], termos: Gdesf.concat([[g.Q, s[0]]]), variavel: [[g.Q, s[0]]] });
      els.push({ nome: "G + " + s[1], termos: Gk.concat([[1, s[0]]]), variavel: [[1, s[0]]] });
      Ws.forEach(function (w) {
        elu.push({ nome: "1,35 G + 1,5 " + s[1] + " + 1,5 × " + String(psiW).replace(".", ",") + " " + w, termos: Gdesf.concat([[g.Q, s[0]], [g.Q * psiW, w]]), variavel: [[g.Q, s[0]], [g.Q * psiW, w]], w: w });
        els.push({ nome: "G + " + s[1] + " + " + String(psiW).replace(".", ",") + " " + w, termos: Gk.concat([[1, s[0]], [psiW, w]]), variavel: [[1, s[0]], [psiW, w]], w: w });
      });
    });
    Ws.forEach(function (w) {
      elu.push({ nome: "1,35 G + 1,5 " + w, termos: Gdesf.concat([[g.Q, w]]), variavel: [[g.Q, w]], w: w });
      elu.push({ nome: "1,0 G + 1,5 " + w, termos: Gfav.concat([[g.Q, w]]), variavel: [[g.Q, w]], w: w });
      els.push({ nome: "G + " + w, termos: Gk.concat([[1, w]]), variavel: [[1, w]], w: w });
      els.push({ nome: "G (sem instalações) + " + w, termos: GkFav.concat([[1, w]]), variavel: [[1, w]], w: w });
      Ss.forEach(function (s) {
        elu.push({ nome: "1,35 G + 1,5 " + w + " + 1,5 × " + String(psiS).replace(".", ",") + " " + s[1], termos: Gdesf.concat([[g.Q, w], [g.Q * psiS, s[0]]]), variavel: [[g.Q, w], [g.Q * psiS, s[0]]], w: w });
        els.push({ nome: "G + " + w + " + " + String(psiS).replace(".", ",") + " " + s[1], termos: Gk.concat([[1, w], [psiS, s[0]]]), variavel: [[1, w], [psiS, s[0]]], w: w });
      });
    });
    return { elu: elu, els: els };
  }

  // ----- Verificação das secções e dos elementos (NP EN 1993-1-1) -----
  function chiFlexao(lambda, curva) {
    if (lambda <= 0.2) return 1;
    var a = ALFA_CURVA[curva], phi = 0.5 * (1 + a * (lambda - 0.2) + lambda * lambda);
    return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lambda * lambda)));
  }
  // Quadro 6.2, perfis I laminados (S235 a S420)
  function curvas(p) {
    if (p.h / p.b > 1.2) return p.tf <= 40 ? { y: "a", z: "b" } : { y: "b", z: "c" };
    return p.tf <= 100 ? { y: "b", z: "c" } : { y: "d", z: "d" };
  }

  // Classe da secção sob compressão C (kN, ≥ 0) e momento M (kN·m) (Quadro 5.2; alma com α e ψ).
  function classe(p, pr, fy, C, M) {
    var cl = Seccao.classificar(p, fy), eps = cl.eps;
    var c = p.h - 2 * p.tf - 2 * p.r, tw = p.tw;
    var alfa = Math.min(1, 0.5 + C * 1e3 / (2 * c * tw * fy));
    var r = c / tw, alma;
    if (alfa <= 0) alma = 1;
    else if (alfa > 0.5) alma = r <= 396 * eps / (13 * alfa - 1) ? 1 : r <= 456 * eps / (13 * alfa - 1) ? 2 : 3;
    else alma = r <= 36 * eps / alfa ? 1 : r <= 41.5 * eps / alfa ? 2 : 3;
    if (alma === 3) {
      var s1 = C * 1e3 / (pr.A * 1e2) + Math.abs(M) * 1e6 / (pr.Wely * 1e3), s2 = C * 1e3 / (pr.A * 1e2) - Math.abs(M) * 1e6 / (pr.Wely * 1e3);
      var psi = s2 / s1;
      var lim = psi > -1 ? 42 * eps / (0.67 + 0.33 * psi) : 62 * eps * (1 - psi) * Math.sqrt(-psi);
      alma = r <= lim ? 3 : 4;
    }
    return Math.max(cl.banzo.classe, alma);
  }

  // Resistência da secção (6.2): utilização para N, V e M em conjunto (6.2.8 e 6.2.9).
  function verificarSeccao(p, pr, fy, N, V, M) {
    var C = Math.max(0, -N), cls = classe(p, pr, fy, C, M);
    var A = pr.A * 1e2, Npl = A * fy / 1e3, Vpl = pr.Avz * 1e2 * fy / Math.sqrt(3) / 1e3;
    var hw = p.h - 2 * p.tf, rho = Math.abs(V) > 0.5 * Vpl ? Math.pow(2 * Math.abs(V) / Vpl - 1, 2) : 0;
    var uV = Math.abs(V) / Vpl, u;
    if (cls <= 2) {
      var Mpl = (pr.Wply * 1e3 - rho * Math.pow(hw * p.tw, 2) / (4 * p.tw)) * fy / 1e6;
      var nN = Math.abs(N) / Npl, a = Math.min((A - 2 * p.b * p.tf) / A, 0.5);
      var semReducao = Math.abs(N) <= 0.25 * Npl && Math.abs(N) <= 0.5 * hw * p.tw * fy / 1e3;
      var MN = semReducao ? Mpl : Math.min(Mpl, Mpl * (1 - nN) / (1 - 0.5 * a));
      u = Math.max(nN, MN > 0 ? Math.abs(M) / MN : Infinity, uV);
    } else if (cls === 3) {
      var fr = fy * (1 - rho);
      u = Math.max((Math.abs(N) * 1e3 / A + Math.abs(M) * 1e6 / (pr.Wely * 1e3)) / fr, uV);
    } else {
      u = Infinity;
    }
    return { u: u, classe: cls, N: N, V: V, M: M };
  }

  /*
   * Encurvadura de um troço entre travamentos (6.3.3, método 2, com Cmy = CmLT = 1,0 do lado da segurança).
   * t: { C (compressão máx., kN), M (|M| máx.), Lcry, Lcrz, LcrLT, C1, classe }
   */
  function verificarEstabilidade(p, pr, fy, t) {
    var A = pr.A * 1e2, NRk = A * fy / 1e3;
    var W = t.classe <= 2 ? pr.Wply : pr.Wely, MRk = W * 1e3 * fy / 1e6;
    var l1 = Math.PI * Math.sqrt(E / fy), cv = curvas(p);
    var ly = t.Lcry * 1000 / (pr.iy * 10) / l1, lz = t.Lcrz * 1000 / (pr.iz * 10) / l1;
    var chiY = chiFlexao(ly, cv.y), chiZ = chiFlexao(lz, cv.z);
    var Mcr = Madres.momentoCritico(p, pr, t.LcrLT, t.C1);
    var lt = Madres.chiLT(p, W, fy, Mcr);
    var ny = t.C / (chiY * NRk), nz = t.C / (chiZ * NRk), Cm = 1.0;
    var kyy, kzy;
    if (t.classe <= 2) {
      kyy = Math.min(Cm * (1 + (ly - 0.2) * ny), Cm * (1 + 0.8 * ny));
      kzy = lz < 0.4 ? Math.min(0.6 + lz, 1 - 0.1 * lz * nz / (Cm - 0.25))
        : Math.max(1 - 0.1 * lz * nz / (Cm - 0.25), 1 - 0.1 * nz / (Cm - 0.25));
    } else {
      kyy = Math.min(Cm * (1 + 0.6 * ly * ny), Cm * (1 + 0.6 * ny));
      kzy = Math.max(1 - 0.05 * lz * nz / (Cm - 0.25), 1 - 0.05 * nz / (Cm - 0.25));
    }
    var mb = t.M / (lt.chi * MRk);
    var u61 = ny + kyy * mb, u62 = nz + kzy * mb;
    return { u: Math.max(u61, u62), u61: u61, u62: u62, chiY: chiY, chiZ: chiZ, chiLT: lt.chi, lambdaY: ly, lambdaZ: lz, lambdaLT: lt.lambda, Mcr: Mcr, kyy: kyy, kzy: kzy };
  }

  // C1 para um troço: fórmula em ψ quando o diagrama é praticamente linear; senão 1,0.
  function fatorC1(Ms) {
    var M1 = Ms[0], M2 = Ms[Ms.length - 1], n = Ms.length;
    var mx = Math.max(Math.abs(M1), Math.abs(M2));
    if (mx < 1e-9) return 1;
    for (var i = 0; i < n; i++) {
      var lin = M1 + (M2 - M1) * i / (n - 1);
      if (Math.abs(Ms[i] - lin) > 0.05 * mx) return 1;
    }
    var psi = Math.abs(M1) >= Math.abs(M2) ? M2 / M1 : M1 / M2;
    return Math.min(1.88 - 1.40 * psi + 0.52 * psi * psi, 2.7);
  }

  /*
   * Verifica o pórtico para um par de perfis.
   * dados: { g (geometria), acoes (para casosCarga), altitude, travamentos: { pilar: n (0, 1, 2),
   *          travessaEscoras: k (0 = sem escoras; senão de k em k madres), espacamentoMadres (m) } }
   */
  function verificar(dados, perfilPilar, perfilTravessa, aco) {
    var g = dados.g, pp = Seccao.propriedades(perfilPilar), pt = Seccao.propriedades(perfilTravessa);
    var fyP = Seccao.tensoes(aco, perfilPilar.tf).fy, fyT = Seccao.tensoes(aco, perfilTravessa.tf).fy;
    var zv = dados.acoes.zonas;
    var nP = dados.travamentos.pilar;
    var cortesP = []; for (var i = 1; i <= nP; i++) cortesP.push(i / (nP + 1));
    var m = malha({ W: g.W, hb: g.hb, hc: g.hc, nPilar: 8, nTravessa: 16, cortes: cortesVento(zv), cortesPilar: cortesP });
    var mod = modelo(m, { pilar: pp, travessa: pt });
    var casos = casosCarga(m, dados.acoes, { pilar: pp.G * 9.81 / 1000, travessa: pt.G * 9.81 / 1000 });
    var res = {};
    ["Gp", "Gr", "Gi", "Qa", "Qe", "Qd", "Si", "Sii", "Siii", "H"].forEach(function (k) { res[k] = resolver(mod, casos[k]); });
    casos.W.forEach(function (c, k) { res["W" + k] = resolver(mod, c); });
    var comb = combinacoes(casos.W.length, dados.altitude);

    // αcr (5.2): deslocamento do beirado com 1 kN horizontal no total
    var dH = Math.max(Math.abs(res.H.u[3 * m.beirados[0]]), Math.abs(res.H.u[3 * m.beirados[1]]));
    var phi = 1 / 200 * Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(g.hb))) * Math.sqrt(0.5 * (1 + 1 / 2));

    // Troços entre travamentos de cada membro (posições ao longo do membro, no sentido do percurso)
    var Lp = m.comprimento.pilar, Lt = m.comprimento.travessa;
    var restrP = [0, Lp]; cortesP.forEach(function (f) { restrP.push(f * Lp); });
    var madres = [], s = dados.travamentos.espacamentoMadres;
    for (var x = 0; x < Lt - s * 0.25; x += s) madres.push(x);
    madres.push(Lt);
    var k = dados.travamentos.travessaEscoras, restrT = [0, Lt];
    if (k > 0) madres.forEach(function (xm, idx) { if (idx % k === 0) restrT.push(xm); });
    function ordenar(l) { return l.slice().sort(function (a, b) { return a - b; }).filter(function (v, i, a2) { return i === 0 || v - a2[i - 1] > 1e-6; }); }
    restrP = ordenar(restrP); restrT = ordenar(restrT);
    var membros = {
      pilarE: { perfil: perfilPilar, pr: pp, fy: fyP, L: Lp, restr: restrP, inverso: false },
      travE: { perfil: perfilTravessa, pr: pt, fy: fyT, L: Lt, restr: restrT, inverso: false },
      travD: { perfil: perfilTravessa, pr: pt, fy: fyT, L: Lt, restr: restrT, inverso: true },
      pilarD: { perfil: perfilPilar, pr: pp, fy: fyP, L: Lp, restr: restrP, inverso: true }
    };
    // Estações de cada membro: índice e posição (medida a partir do beirado na travessa D e da base no pilar D)
    Object.keys(membros).forEach(function (id) { membros[id].est = []; });
    m.elementos.forEach(function (e, ke) {
      [0, 0.5, 1].forEach(function (t, q) {
        var sp = e.s0 + t * e.L, mb = membros[e.membro];
        mb.est.push({ i: 3 * ke + q, s: mb.inverso ? mb.L - sp : sp });
      });
    });

    var pior = {
      pilarSeccao: { u: 0 }, pilarEstab: { u: 0 }, travSeccao: { u: 0 }, travEstab: { u: 0 },
      alfaCr: { u: 0 }, deslH: { u: 0 }, flecha: { u: 0 }, flechaVar: { u: 0 }
    };
    function registar(ch, u, extra) { if (u > pior[ch].u || !pior[ch].comb) pior[ch] = Object.assign({ u: u }, extra); }
    var envM = { max: new Float64Array(3 * m.elementos.length).fill(-Infinity), min: new Float64Array(3 * m.elementos.length).fill(Infinity) };
    var envR = { max: new Float64Array(6).fill(-Infinity), min: new Float64Array(6).fill(Infinity) };
    var alfaMin = Infinity, axialSignificativo = false;
    var NcrTrav = Math.PI * Math.PI * E * pt.Iy * 1e4 / Math.pow(2 * Lt * 1000, 2) / 1000;   // travessa completa

    comb.elu.forEach(function (c) {
      var r1 = combinar(c.termos.map(function (t) { return [t[0], res[t[1]]]; }));
      var V = r1.R[1] + r1.R[4];
      var alfaCr = V > 1e-6 ? g.hb / (V * dH) : Infinity;
      alfaMin = Math.min(alfaMin, alfaCr);
      var kAmp = alfaCr >= 10 ? 1 : alfaCr >= 3 ? 1 / (1 - 1 / alfaCr) : NaN;
      // Utilização 3/αcr: acima de 1, a amplificação de 5.2.2(5)B deixa de ser válida (é preciso uma análise de 2.ª ordem).
      registar("alfaCr", 3 / alfaCr, { comb: c.nome, alfaCr: alfaCr, k: isNaN(kAmp) ? null : kAmp });
      if (isNaN(kAmp)) kAmp = 1.5;
      // Imperfeição global: φ·V em forças horizontais nos beirados (no sentido do vento, se houver)
      var r2 = combinar([[1, r1], [phi * Math.max(V, 0), res.H]]);
      var r = amplificar(r2, kAmp, m);
      for (var q = 0; q < r.M.length; q++) { envM.max[q] = Math.max(envM.max[q], r.M[q]); envM.min[q] = Math.min(envM.min[q], r.M[q]); }
      for (var q2 = 0; q2 < 6; q2++) { envR.max[q2] = Math.max(envR.max[q2], r.R[q2]); envR.min[q2] = Math.min(envR.min[q2], r.R[q2]); }

      Object.keys(membros).forEach(function (id) {
        var mb = membros[id], pilar = id.indexOf("pilar") === 0;
        // Secções
        mb.est.forEach(function (st) {
          var vs = verificarSeccao(mb.perfil, mb.pr, mb.fy, r.N[st.i], r.V[st.i], r.M[st.i]);
          registar(pilar ? "pilarSeccao" : "travSeccao", vs.u, { comb: c.nome, membro: id, s: st.s, N: vs.N, V: vs.V, M: vs.M, classe: vs.classe });
          if (!pilar && -r.N[st.i] > 0.09 * NcrTrav) axialSignificativo = true;
        });
        // Troços entre travamentos
        for (var t = 0; t < mb.restr.length - 1; t++) {
          var a0 = mb.restr[t] - 1e-9, a1 = mb.restr[t + 1] + 1e-9;
          var ests = mb.est.filter(function (st) { return st.s >= a0 && st.s <= a1; }).sort(function (x, y) { return x.s - y.s; });
          if (!ests.length) continue;
          var C = 0, Mmax = 0, Mz = 0, Ms = [];
          ests.forEach(function (st) {
            C = Math.max(C, -r.N[st.i]);
            if (Math.abs(r.M[st.i]) > Math.abs(Mmax)) Mmax = r.M[st.i];
            Ms.push(r.M[st.i]);
          });
          var Lseg = mb.restr[t + 1] - mb.restr[t];
          // Banzo comprimido: M < 0 comprime o banzo interior (inferior na travessa). Na travessa com M > 0
          // comprime-se o banzo superior, travado pelas madres.
          var LcrLT = !pilar && Mmax > 0 ? Math.min(Lseg, s) : Lseg;
          var cls = classe(mb.perfil, mb.pr, mb.fy, C, Mmax);
          if (cls === 4) { registar(pilar ? "pilarEstab" : "travEstab", Infinity, { comb: c.nome, membro: id, classe: 4 }); continue; }
          var ve = verificarEstabilidade(mb.perfil, mb.pr, mb.fy, { C: C, M: Math.abs(Mmax), Lcry: mb.L, Lcrz: Lseg, LcrLT: LcrLT, C1: fatorC1(Ms), classe: cls });
          registar(pilar ? "pilarEstab" : "travEstab", ve.u, Object.assign({ comb: c.nome, membro: id, troco: [mb.restr[t], mb.restr[t + 1]], C: C, M: Mmax, Lcrz: Lseg, LcrLT: LcrLT, classe: cls }, ve));
        }
      });
    });

    // Estados limites de utilização (sem amplificação): beirado h/150, cumeeira vão/200 e vão/250.
    var limH = g.hb / 150, limV = g.W / 200, limV2 = g.W / 250;
    comb.els.forEach(function (c) {
      var r = combinar(c.termos.map(function (t) { return [t[0], res[t[1]]]; }));
      var rv = combinar(c.variavel.map(function (t) { return [t[0], res[t[1]]]; }));
      var ux = Math.max(Math.abs(r.u[3 * m.beirados[0]]), Math.abs(r.u[3 * m.beirados[1]]));
      registar("deslH", ux / limH, { comb: c.nome, d: ux * 1000, lim: limH * 1000 });
      function flecha(rr) { return -(rr.u[3 * m.cumeeira + 1] - (rr.u[3 * m.beirados[0] + 1] + rr.u[3 * m.beirados[1] + 1]) / 2); }
      var f = Math.abs(flecha(r)), f2 = Math.abs(flecha(rv));
      registar("flecha", f / limV, { comb: c.nome, d: f * 1000, lim: limV * 1000 });
      registar("flechaVar", f2 / limV2, { comb: c.nome, d: f2 * 1000, lim: limV2 * 1000 });
    });

    var chaves = ["pilarSeccao", "pilarEstab", "travSeccao", "travEstab", "alfaCr", "deslH", "flecha", "flechaVar"];
    var uMax = Math.max.apply(null, chaves.map(function (kk) { return pior[kk].u; }));
    var peso = 2 * Lp * pp.G + 2 * Lt * pt.G;   // kg por pórtico
    // Reações características por caso elementar (para as fundações)
    var reacoes = { G: combinar([[1, res.Gp], [1, res.Gr], [1, res.Gi]]).R, Q: res.Qa.R, S: res.Si.R, Sii: res.Sii.R, Siii: res.Siii.R };
    casos.W.forEach(function (c, kk) { reacoes["W" + kk] = res["W" + kk].R; });
    return {
      aco: aco, pilar: { perfil: perfilPilar, props: pp, fy: fyP }, travessa: { perfil: perfilTravessa, props: pt, fy: fyT },
      malha: m, verificacoes: pior, uMax: uMax, ok: uMax <= 1, peso: peso,
      alfaCrMin: alfaMin, axialSignificativo: axialSignificativo, phi: phi, envM: envM, envR: envR,
      reacoes: reacoes, nomesVento: casos.W.map(function (c) { return c.nome; }), combinacoes: comb
    };
  }

  /*
   * Escolhe o par de perfis mais leve que verifica, percorrendo os pares por peso crescente.
   * Devolve também os pares vizinhos analisados, para comparação.
   */
  function dimensionar(dados, pilares, travessas, aco) {
    var g = dados.g, Lt = Math.hypot(g.W / 2, g.hc - g.hb), pares = [];
    pilares.forEach(function (pc) {
      var gp = Seccao.propriedades(pc).G;
      travessas.forEach(function (tr) { pares.push({ pc: pc, tr: tr, peso: 2 * g.hb * gp + 2 * Lt * Seccao.propriedades(tr).G }); });
    });
    pares.sort(function (a, b) { return a.peso - b.peso; });
    var analisados = [], escolhido = null;
    for (var i = 0; i < pares.length; i++) {
      var r = verificar(dados, pares[i].pc, pares[i].tr, aco);
      analisados.push(r);
      if (r.ok && !escolhido) escolhido = r;
      if (escolhido && analisados.length >= analisados.indexOf(escolhido) + 6) break;
      if (!escolhido && analisados.length >= 400) break;
    }
    return { escolhido: escolhido, analisados: analisados };
  }

  return {
    E: E, malha: malha, modelo: modelo, resolver: resolver, combinar: combinar, amplificar: amplificar,
    zonasVento: zonasVento, cortesVento: cortesVento, casosCarga: casosCarga, combinacoes: combinacoes,
    chiFlexao: chiFlexao, curvas: curvas, classe: classe, verificarSeccao: verificarSeccao,
    verificarEstabilidade: verificarEstabilidade, fatorC1: fatorC1, verificar: verificar, dimensionar: dimensionar
  };
})();

if (typeof module !== "undefined") module.exports = Portico;
