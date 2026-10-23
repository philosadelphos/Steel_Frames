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
    classificar: classificar, resistencias: resistencias
  };
})();

if (typeof module !== "undefined") module.exports = Seccao;
