/*
 * Verificação do painel de revestimento da cobertura contra a tabela de cargas do fabricante (paineis.js).
 * O vão do painel é o espaçamento entre madres, medido na pendente. As tabelas dão cargas uniformes admissíveis
 * normais ao painel, além do peso próprio (e, na O Feliz, da temperatura): comparam-se com as ações variáveis em
 * combinação característica (NP EN 1990, 6.14b), que é como as tabelas se usam, e sem interpolar entre vãos — usa-se
 * o valor do vão tabelado imediatamente acima, do lado da segurança.
 */
var Revestimento = (function () {
  var TOL = 1e-9;
  // Face exterior de cor escura (até 80 °C): a O Feliz manda reduzir a carga ascendente admissível, até cerca de 30 %
  // nas menores espessuras. Aplica-se 30 % a todas, do lado da segurança.
  var FATOR_COR_ESCURA = 0.7;

  function produto(nome) { return PAINEIS[nome]; }

  // Tabela de um painel: { vaos, desc, asc } para a espessura, as chapas e o apoio escolhidos (null se não houver).
  function tabela(sel) {
    var p = produto(sel.produto);
    var f = p && p.faces[sel.faces];
    var t = f && f[sel.apoio];
    var c = t && t.cargas[String(sel.espessura)];
    if (!c) return null;
    var asc = sel.escura ? c.asc.map(function (x) { return x * FATOR_COR_ESCURA; }) : c.asc;
    return { vaos: t.vaos, desc: c.desc, asc: asc };
  }

  // Peso do painel (kg/m²) pela espessura e pelas chapas.
  function peso(sel) {
    var p = produto(sel.produto), f = p && p.faces[sel.faces];
    var i = p ? p.espessuras.indexOf(+sel.espessura) : -1;
    return f && i >= 0 ? f.pesos[i] : NaN;
  }

  /*
   * Carga admissível ao vão s: o valor do menor vão tabelado ≥ s (abaixo do primeiro vão, o do primeiro).
   * Devolve { q, vao } ou null quando o fabricante não admite esse vão.
   */
  function admissivel(vaos, valores, s) {
    for (var i = 0; i < valores.length; i++) {
      if (vaos[i] >= s - TOL) return { q: valores[i], vao: vaos[i] };
    }
    return null;
  }

  /*
   * Ações características normais ao painel (kN/m² de painel), sem o peso próprio.
   * a: { alfa (°), qk e s (kN/m² em projeção horizontal), wPressao (≥ 0) e wSuccao (≤ 0) normais à cobertura, psiS, psiW }
   * Descendente: o maior de Q, S + ψ0 Wp e Wp + ψ0 S (a sobrecarga não se combina com a neve nem com o vento);
   * ascendente: a sucção.
   */
  function acoes(a) {
    var c2 = Math.pow(Math.cos(a.alfa * Math.PI / 180), 2);
    var lista = [
      { id: "Q", nome: "Sobrecarga", q: a.qk * c2 },
      { id: "S", nome: "Neve + ψ₀ vento em pressão", q: a.s * c2 + a.psiW * a.wPressao },
      { id: "Wp", nome: "Vento em pressão + ψ₀ neve", q: a.wPressao + a.psiS * a.s * c2 }
    ];
    var desc = lista.reduce(function (m, x) { return x.q > m.q ? x : m; });
    return { desc: desc, lista: lista, asc: { id: "Ws", nome: "Vento em sucção", q: Math.max(-a.wSuccao, 0) } };
  }

  function sentido(vaos, valores, s, q) {
    var adm = admissivel(vaos, valores, s);
    return adm ? { q: q, adm: adm.q, vao: adm.vao, u: q / adm.q, ok: q <= adm.q + TOL } : { q: q, adm: null, vao: null, u: Infinity, ok: false, foraDaTabela: true };
  }

  /*
   * sel: { produto, faces, espessura, apoio } (catálogo) ou { manual: true, desc, asc } (cargas admissíveis da tabela
   * do fabricante ao vão s, introduzidas pelo utilizador). acoesPara(s) devolve as ações para o vão s (a sucção depende
   * da área carregada). Devolve as utilizações nos dois sentidos, o maior espaçamento admitido e a espessura mínima.
   */
  function verificar(sel, s, acoesPara) {
    var a = acoesPara(s);
    if (sel.manual) {
      var admAsc = sel.escura ? sel.asc * FATOR_COR_ESCURA : sel.asc;
      var dm = { q: a.desc.q, adm: sel.desc, u: a.desc.q / sel.desc, ok: a.desc.q <= sel.desc + TOL };
      var am = { q: a.asc.q, adm: admAsc, u: a.asc.q / admAsc, ok: a.asc.q <= admAsc + TOL };
      return { manual: true, acoes: a, desc: dm, asc: am, ok: dm.ok && am.ok, u: Math.max(dm.u, am.u) };
    }
    var t = tabela(sel);
    if (!t) return { semTabela: true, ok: false, acoes: a };
    var d = sentido(t.vaos, t.desc, s, a.desc.q), u = sentido(t.vaos, t.asc, s, a.asc.q);
    // Maior vão tabelado até ao qual o painel cumpre os dois sentidos (as ações recalculam-se para cada vão).
    var sMax = null;
    t.vaos.every(function (v) {
      var av = acoesPara(v), dv = admissivel(t.vaos, t.desc, v), uv = admissivel(t.vaos, t.asc, v);
      if (!(dv && uv && av.desc.q <= dv.q + TOL && av.asc.q <= uv.q + TOL)) return false;
      sMax = v;
      return true;
    });
    // Menor espessura do mesmo painel (mesmas chapas e apoio) que cumpre ao vão s.
    var p = produto(sel.produto), minima = null;
    p.espessuras.some(function (e) {
      var te = tabela({ produto: sel.produto, faces: sel.faces, apoio: sel.apoio, espessura: e, escura: sel.escura });
      if (!te) return false;
      if (sentido(te.vaos, te.desc, s, a.desc.q).ok && sentido(te.vaos, te.asc, s, a.asc.q).ok) { minima = e; return true; }
      return false;
    });
    return { acoes: a, desc: d, asc: u, ok: d.ok && u.ok, u: Math.max(d.u, u.u), sMax: sMax, espessuraMinima: minima,
      indicativo: p.indicativo, vaoMin: t.vaos[0], abaixoDaTabela: s < t.vaos[0] - TOL };
  }

  return { FATOR_COR_ESCURA: FATOR_COR_ESCURA, tabela: tabela, peso: peso, admissivel: admissivel, acoes: acoes, verificar: verificar };
})();

if (typeof module !== "undefined") module.exports = Revestimento;
