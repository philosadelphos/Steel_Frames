/* Interface: identificação de perfis por medidas e catálogo. Depende de perfis.js, seccao.js e enformados.js. */
(function () {
  var FAMILIAS = Object.keys(PERFIS);
  var TODOS = Seccao.todos();
  var EXEMPLO = { h: 300, b: 150 };

  var estado = {
    familias: FAMILIAS.slice(),
    forma: "I",             // I ou H laminado, ou enformado a frio: "omega", "C", "Z"
    aco: "S355",
    escolhido: null,        // perfil escolhido à mão na lista de candidatos
    familiaCatalogo: "IPE"
  };

  var $ = function (id) { return document.getElementById(id); };

  // Últimos valores introduzidos, guardados só neste aparelho. Sem armazenamento disponível
  // (navegação privada, por exemplo) a app funciona na mesma, apenas sem memória.
  var Memoria = {
    ler: function (chave) {
      try { return JSON.parse(localStorage.getItem("steel-frames:" + chave) || "null"); } catch (e) { return null; }
    },
    gravar: function (chave, valor) {
      try { localStorage.setItem("steel-frames:" + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
    },
    apagar: function (chave) {
      try { localStorage.removeItem("steel-frames:" + chave); } catch (e) { /* sem armazenamento */ }
    },
    // Valores dos campos com nome de um formulário (texto, listas e caixas de seleção).
    doFormulario: function (form) {
      var v = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) v[el.name] = el.type === "checkbox" ? el.checked : el.value;
      });
      return v;
    },
    // Repõe os valores; numa lista, só aceita opções que existam (os dados podem ser de outra versão).
    paraFormulario: function (form, v) {
      Object.keys(v || {}).forEach(function (nome) {
        var el = form.elements[nome];
        if (!el || !el.tagName) return;
        if (el.type === "checkbox") el.checked = !!v[nome];
        else if (el.tagName === "SELECT") {
          if (Array.prototype.some.call(el.options, function (o) { return o.value === v[nome]; })) el.value = v[nome];
        } else el.value = v[nome];
      });
    }
  };
  var form = $("form-medidas");
  var resultado = $("resultado");

  // Formatação numérica à portuguesa
  var formatadores = {};
  function fmt(v, casas) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    if (casas === undefined) casas = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 1 ? 2 : 3;
    if (!formatadores[casas]) {
      formatadores[casas] = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    }
    return formatadores[casas].format(v);
  }
  function fmtDelta(v) {
    var s = fmt(Math.abs(v), Math.abs(v) < 10 ? 1 : 0);
    return (v > 0.05 ? "+" : v < -0.05 ? "−" : "±") + s;
  }

  // ----- Procura -----
  function lerMedidas() {
    function num(nome) {
      var txt = String(form.elements[nome].value).trim().replace(",", ".");
      var v = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(txt) ? parseFloat(txt) : NaN;
      return isFinite(v) && v > 0 ? v : null;
    }
    return { h: num("h"), b: num("b"), tw: num("tw"), tf: num("tf"), t: num("t"), a: num("a") };
  }

  // ----- Perfis enformados a frio (O Feliz) -----
  var FAMILIA_FORMA = { omega: "Superomega", C: "C", Z: "Z" };
  function acosForma(forma) {
    return forma === "I" ? Object.keys(Seccao.ACOS) : Enformados.FAMILIAS[FAMILIA_FORMA[forma]].acos;
  }
  // Mostra os campos, o esboço e as classes de aço da forma escolhida.
  function atualizarForma(forma, aco) {
    estado.forma = forma;
    var lista = acosForma(forma), padrao = forma === "I" ? "S355" : "S350GD";
    estado.aco = lista.indexOf(aco) >= 0 ? aco : padrao;
    $("in-aco").innerHTML = lista.map(function (a) {
      return '<option value="' + a + '"' + (a === estado.aco ? " selected" : "") + ">" + a + (Seccao.ACOS[a] ? " · " + Seccao.ACOS[a].norma : " · EN 10346") + "</option>";
    }).join("");
    var enf = forma !== "I";
    $("campo-tw").hidden = enf; $("campo-tf").hidden = enf; $("grupo-familias").hidden = enf;
    $("campo-t").hidden = !enf; $("campo-a").hidden = !(forma === "C" || forma === "Z");
    Array.prototype.forEach.call(document.querySelectorAll(".esquema svg[data-forma]"), function (svg) {
      svg.hidden = svg.getAttribute("data-forma") !== forma;
    });
    $("nota-forma").hidden = !enf;
    $("nota-forma").innerHTML = forma === "omega"
      ? "Meça a altura total h e a largura total b, nas pontas das abas inferiores."
      : "Meça a largura b do banzo e a altura a do reforço por fora. As madres C e Z da O Feliz têm as mesmas dimensões: é a forma que distingue as duas séries.";
  }

  // Desvio relativo médio quadrático, como nos laminados: espessura e reforço pesam metade.
  function procurarEnformado(m) {
    var fam = FAMILIA_FORMA[estado.forma];
    return Enformados.seccoes(fam).map(function (s) {
      var soma = Math.pow((m.h - s.h) / s.h, 2) + Math.pow((m.b - s.b) / s.b, 2), peso = 2;
      if (m.t) { soma += 0.5 * Math.pow((m.t - s.t) / s.t, 2); peso += 0.5; }
      if (m.a && s.a) { soma += 0.5 * Math.pow((m.a - s.a) / s.a, 2); peso += 0.5; }
      return { perfil: s, familia: fam, desvio: Math.sqrt(soma / peso) };
    }).sort(function (a, b) { return a.desvio - b.desvio || a.perfil.G - b.perfil.G; });
  }

  // Desvio relativo médio quadrático; as espessuras pesam metade (medição menos fiável).
  function procurar(m) {
    return TODOS
      .filter(function (p) { return estado.familias.indexOf(p.familia) !== -1; })
      .map(function (p) {
        var soma = Math.pow((m.h - p.h) / p.h, 2) + Math.pow((m.b - p.b) / p.b, 2), peso = 2;
        if (m.tw) { soma += 0.5 * Math.pow((m.tw - p.tw) / p.tw, 2); peso += 0.5; }
        if (m.tf) { soma += 0.5 * Math.pow((m.tf - p.tf) / p.tf, 2); peso += 0.5; }
        return { perfil: p, desvio: Math.sqrt(soma / peso) };
      })
      .sort(function (a, b) { return a.desvio - b.desvio; });
  }

  function avaliar(desvio) {
    if (desvio <= 0.01) return { txt: "Corresponde", cls: "selo-ok" };
    if (desvio <= 0.03) return { txt: "Muito próximo", cls: "selo-ok" };
    if (desvio <= 0.08) return { txt: "Próximo, confirme as espessuras", cls: "selo-aviso" };
    return { txt: "Sem correspondência clara", cls: "selo-mau" };
  }

  // ----- Desenho da secção (unidades do SVG = mm) -----
  function desenho(p) {
    var B = p.b, H = p.h, tw = p.tw, tf = p.tf, r = p.r;
    var M = Math.max(B, H), fs = M * 0.05, t = fs * 0.35;
    var y1 = -H / 2 + tf, y2 = H / 2 - tf, xw = tw / 2;
    var forma = [
      "M", -B / 2, -H / 2, "L", B / 2, -H / 2, "L", B / 2, y1, "L", xw + r, y1,
      "A", r, r, 0, 0, 0, xw, y1 + r, "L", xw, y2 - r,
      "A", r, r, 0, 0, 0, xw + r, y2, "L", B / 2, y2, "L", B / 2, H / 2, "L", -B / 2, H / 2,
      "L", -B / 2, y2, "L", -xw - r, y2, "A", r, r, 0, 0, 0, -xw, y2 - r, "L", -xw, y1 + r,
      "A", r, r, 0, 0, 0, -xw - r, y1, "L", -B / 2, y1, "Z"
    ].join(" ");

    var cb = -H / 2 - M * 0.16;   // linha de cota de b
    var ch = -B / 2 - M * 0.16;   // linha de cota de h
    function traco(x, y) { return "M" + (x - t) + " " + (y + t) + "L" + (x + t) + " " + (y - t); }
    var cotas = [
      "M", -B / 2, -H / 2 - M * 0.03, "V", cb - M * 0.03, "M", B / 2, -H / 2 - M * 0.03, "V", cb - M * 0.03,
      "M", -B / 2, cb, "H", B / 2,
      "M", -B / 2 - M * 0.03, -H / 2, "H", ch - M * 0.03, "M", -B / 2 - M * 0.03, H / 2, "H", ch - M * 0.03,
      "M", ch, -H / 2, "V", H / 2,
      "M", B / 2 + M * 0.01, y1 - tf / 2, "h", M * 0.05,
      "M", xw, H / 4, "h", M * 0.05
    ].join(" ") + traco(-B / 2, cb) + traco(B / 2, cb) + traco(ch, -H / 2) + traco(ch, H / 2);
    var eixos = "M" + (-B / 2 - M * 0.08) + " 0H" + (B / 2 + M * 0.08) + "M0 " + (-H / 2 - M * 0.08) + "V" + (H / 2 + M * 0.08);

    var vb = [-B / 2 - M * 0.27, -H / 2 - M * 0.27, B + M * 0.27 + M * 0.36, H + M * 0.27 + M * 0.2];
    return '<svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Secção ' + p.nome + ' à escala">' +
      '<path class="sec-forma" d="' + forma + '"/>' +
      '<path class="sec-eixo" d="' + eixos + '"/>' +
      '<path class="sec-cota" d="' + cotas + '"/>' +
      '<text class="sec-txt" x="0" y="' + (cb - fs * 0.45) + '" font-size="' + fs + '" text-anchor="middle">' + fmt(B, B % 1 ? 1 : 0) + '</text>' +
      '<text class="sec-txt" font-size="' + fs + '" text-anchor="middle" transform="translate(' + (ch - fs * 0.45) + ' 0) rotate(-90)">' + fmt(H, H % 1 ? 1 : 0) + '</text>' +
      '<text class="sec-txt" x="' + (B / 2 + M * 0.07) + '" y="' + (y1 - tf / 2 + fs * 0.35) + '" font-size="' + fs * 0.9 + '">t<tspan font-size="' + fs * 0.65 + '" dy="' + fs * 0.2 + '">f</tspan><tspan dy="' + (-fs * 0.2) + '"> ' + fmt(tf, 1) + '</tspan></text>' +
      '<text class="sec-txt" x="' + (xw + M * 0.065) + '" y="' + (H / 4 + fs * 0.35) + '" font-size="' + fs * 0.9 + '">t<tspan font-size="' + fs * 0.65 + '" dy="' + fs * 0.2 + '">w</tspan><tspan dy="' + (-fs * 0.2) + '"> ' + fmt(tw, 1) + '</tspan></text>' +
      '<text class="sec-txt-eixo" x="' + (B / 2 + M * 0.1) + '" y="' + fs * 0.35 + '" font-size="' + fs + '">y</text>' +
      '<text class="sec-txt-eixo" x="0" y="' + (H / 2 + M * 0.1 + fs * 0.7) + '" font-size="' + fs + '" text-anchor="middle">z</text>' +
      '</svg>';
  }

  // Secção enformada à escala: linha média com a espessura nominal (unidades do SVG = mm).
  function desenhoEnformado(fam, s) {
    var pts;
    if (fam === "Superomega") {
      var geo = OFELIZ.superomega.geo[s.h], xs = geo.linha.map(function (q) { return q[0]; }), ys = geo.linha.map(function (q) { return q[1]; });
      var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      pts = geo.linha.map(function (q) { return [q[0] - cx, cy - q[1]]; });
    } else {
      var hm = s.h - s.t, bm = s.b - s.t, am = s.a - s.t / 2;
      pts = fam === "C"
        ? [[bm / 2, -hm / 2 + am], [bm / 2, -hm / 2], [-bm / 2, -hm / 2], [-bm / 2, hm / 2], [bm / 2, hm / 2], [bm / 2, hm / 2 - am]]
        : [[bm, -hm / 2 + am], [bm, -hm / 2], [0, -hm / 2], [0, hm / 2], [-bm, hm / 2], [-bm, hm / 2 - am]];
    }
    var x0 = Math.min.apply(null, pts.map(function (q) { return q[0]; })), x1 = Math.max.apply(null, pts.map(function (q) { return q[0]; }));
    var y0 = Math.min.apply(null, pts.map(function (q) { return q[1]; })), y1 = Math.max.apply(null, pts.map(function (q) { return q[1]; }));
    var B = x1 - x0, H = y1 - y0, M = Math.max(B, H), fs = M * 0.05, tr = fs * 0.35;
    var esp = Math.max(s.t, M * 0.012);
    var d = pts.map(function (q, i) { return (i ? "L" : "M") + q[0].toFixed(2) + " " + q[1].toFixed(2); }).join("");
    var cb = y0 - M * 0.16, ch = x0 - M * 0.16;
    function traco(x, y) { return "M" + (x - tr) + " " + (y + tr) + "L" + (x + tr) + " " + (y - tr); }
    var cotas = "M" + x0 + " " + (y0 - M * 0.03) + "V" + (cb - M * 0.03) + "M" + x1 + " " + (y0 - M * 0.03) + "V" + (cb - M * 0.03) +
      "M" + x0 + " " + cb + "H" + x1 + "M" + (x0 - M * 0.03) + " " + y0 + "H" + (ch - M * 0.03) + "M" + (x0 - M * 0.03) + " " + y1 + "H" + (ch - M * 0.03) +
      "M" + ch + " " + y0 + "V" + y1 + traco(x0, cb) + traco(x1, cb) + traco(ch, y0) + traco(ch, y1);
    var vb = [x0 - M * 0.27, y0 - M * 0.27, B + M * 0.54, H + M * 0.4];
    return '<svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Secção ' + s.nome + ' à escala">' +
      '<path class="sec-fino" stroke-width="' + esp.toFixed(2) + '" d="' + d + '"/>' +
      '<path class="sec-cota" d="' + cotas + '"/>' +
      '<text class="sec-txt" x="' + ((x0 + x1) / 2) + '" y="' + (cb - fs * 0.45) + '" font-size="' + fs + '" text-anchor="middle">' + fmt(s.b, 0) + "</text>" +
      '<text class="sec-txt" font-size="' + fs + '" text-anchor="middle" transform="translate(' + (ch - fs * 0.45) + " " + ((y0 + y1) / 2) + ') rotate(-90)">' + fmt(s.h, 0) + "</text>" +
      "</svg>";
  }

  function blocoPropriedadesEnformado(fam, s, aco) {
    var e = s.ef[aco], so = fam === "Superomega";
    return '<div class="grupos-props">' +
      '<div class="grupo-props"><h3>Geometria</h3><dl class="lista-props">' +
        linhaProp("h", s.h, "mm", 0) + linhaProp("b", s.b, "mm", 0) + (so ? "" : linhaProp("a", s.a, "mm", 0)) +
        linhaProp("t", s.t, "mm", 2) + linhaProp("t<sub>eff</sub>", s.teff, "mm", 2) + linhaProp("A", s.A, "cm²") + linhaProp("G", s.G, "kg/m", 2) + "</dl></div>" +
      '<div class="grupo-props"><h3>Secção bruta</h3><dl class="lista-props">' +
        linhaProp("I<sub>y</sub>", s.Iy, "cm⁴") + linhaProp("I<sub>z</sub>", s.Iz, "cm⁴") +
        linhaProp("I<sub>t</sub>", s.It, "cm⁴", 4) + linhaProp("I<sub>w</sub>", s.Iw, "cm⁶") + "</dl></div>" +
      '<div class="grupo-props"><h3>Secção efetiva · ' + aco + '</h3><dl class="lista-props">' +
        linhaProp("A<sub>eff</sub>", e[0], "cm²") +
        (so ? linhaProp("W<sub>eff,y+</sub>", e[2], "cm³") + linhaProp("W<sub>eff,y−</sub>", e[4], "cm³") + linhaProp("I<sub>eff,y</sub>", Math.min(e[1], e[3]), "cm⁴") + linhaProp("W<sub>eff,z</sub>", e[6], "cm³")
          : linhaProp("W<sub>eff,y</sub>", e[2], "cm³") + linhaProp("I<sub>eff,y</sub>", e[1], "cm⁴") +
            linhaProp("W<sub>eff,z</sub>", fam === "C" ? Math.min(e[4], e[6]) : e[4], "cm³")) +
        "</dl></div>" +
      "</div>";
  }

  // Resistências da secção pela EN 1993-1-3 (6.1), com as propriedades de cálculo da app.
  function blocoEC3Enformado(fam, s, aco) {
    var p = Enformados.propriedades(fam, s, aco), fy = p.fy;
    function item(titulo, v, un, nota) {
      return '<div class="ec3-item"><h3>' + titulo + '</h3><div class="valor-grande">' + fmt(v, v < 10 ? 2 : 1) + " <small>" + un + "</small></div><p>" + nota + "</p></div>";
    }
    var vr = Enformados.corteResistente(p, Enformados.FAMILIAS[fam].esquadro);
    return '<section class="cartao"><h2>Resistência da secção · ' + aco + "</h2>" +
      '<div class="ec3">' +
        '<div class="ec3-item"><h3>Aço</h3><div class="valor-grande">f<sub>yb</sub> = ' + fy + " <small>MPa</small></div><p>EN 10346, chapa galvanizada; t<sub>eff</sub> = " + fmt(s.teff, 2) + " mm (sem o revestimento de zinco)</p></div>" +
        item("Compressão <span class=\"sym\">N<sub>c,Rd</sub></span>", p.Aeff * 1e2 * fy / 1e3, "kN", "A<sub>eff</sub> · f<sub>yb</sub> / γ<sub>M0</sub>, sem encurvadura (6.1.3)") +
        item("Flexão <span class=\"sym\">M<sub>c,y,Rd</sub></span>", p.Wpos * fy / 1e3, "kN·m", (fam === "Superomega" ? "banzo superior comprimido; com o inferior: " + fmt(p.Wneg * fy / 1e3, 2) + " kN·m. " : "") + "W<sub>eff,y</sub> · f<sub>yb</sub> / γ<sub>M0</sub> (6.1.4)") +
        item("Flexão <span class=\"sym\">M<sub>c,z,Rd</sub></span>", p.Wz * fy / 1e3, "kN·m", "W<sub>eff,z</sub> · f<sub>yb</sub> / γ<sub>M0</sub>, o menor dos dois sentidos") +
        item("Corte <span class=\"sym\">V<sub>b,Rd</sub></span>", vr.VbRd, "kN", "6.1.5, λ̄<sub>w</sub> = " + fmt(vr.lambda, 2) + (Enformados.FAMILIAS[fam].esquadro ? ", alma com esquadro no apoio" : ", alma sem reforço no apoio") + ", com a altura desenvolvida da alma") +
      "</div>" +
      '<p class="nota">γ<sub>M0</sub> = 1,0 (valor recomendado da EN 1993-1-3; não há Anexo Nacional português).' +
        (p.delta ? " Propriedades do fabricante reduzidas pelos cantos arredondados: δ = " + fmt(p.delta, 4) + " (5.1(4))." : "") +
        " Sem encurvadura global: para madres, ver o separador Madres.</p>" +
      "</section>";
  }

  function renderEnformado(m) {
    var lista = procurarEnformado(m), melhor = lista[0];
    var atual = estado.escolhido && lista.filter(function (c) { return c.perfil.nome === estado.escolhido; })[0] || melhor;
    var s = atual.perfil, fam = atual.familia, av = avaliar(atual.desvio);
    var desvios = '<div class="desvios">' +
      "<span>h <b>" + fmt(s.h, 0) + "</b> (" + fmtDelta(m.h - s.h) + " mm)</span>" +
      "<span>b <b>" + fmt(s.b, 0) + "</b> (" + fmtDelta(m.b - s.b) + " mm)</span>" +
      (m.t ? "<span>t <b>" + fmt(s.t, 1) + "</b> (" + fmtDelta(m.t - s.t) + " mm)</span>" : "") +
      (m.a && s.a ? "<span>a <b>" + fmt(s.a, 0) + "</b> (" + fmtDelta(m.a - s.a) + " mm)</span>" : "") +
      "</div>";
    var mesmas = lista.filter(function (c) { return c.perfil.h === s.h && c.perfil.b === s.b; });
    var alerta = !m.t && mesmas.length > 1
      ? '<p class="alerta">Há ' + mesmas.length + " espessuras com " + fmt(s.h, 0) + " × " + fmt(s.b, 0) + " mm (" + mesmas.map(function (c) { return fmt(c.perfil.t, 1); }).join(", ") + " mm). Meça a espessura t para escolher.</p>"
      : "";
    var candidatos = lista.slice(0, 6).map(function (c) {
      var q = c.perfil, prox = Math.max(0, 1 - c.desvio / 0.15);
      return '<li><button type="button" class="candidato" data-nome="' + q.nome + '" aria-current="' + (q === s) + '">' +
        '<span class="candidato-nome">' + q.nome + "</span>" +
        '<span class="candidato-dims">' + fmt(q.h, 0) + " × " + fmt(q.b, 0) + (q.a ? " · a " + fmt(q.a, 0) : "") + " · t " + fmt(q.t, 1) + " · " + fmt(q.G, 2) + " kg/m</span>" +
        '<span class="barra" title="Desvio médio ' + fmt(c.desvio * 100, 1) + ' %"><span style="width:' + (prox * 100).toFixed(0) + '%"></span></span>' +
        "</button></li>";
    }).join("");
    resultado.innerHTML =
      '<section class="cartao">' +
        '<div class="cabeca-resultado"><h2 class="nome-perfil">' + s.nome + "</h2>" +
          '<span class="familia-perfil">' + Enformados.FAMILIAS[fam].descricao + "</span>" +
          '<span class="selo ' + av.cls + '">' + av.txt + "</span></div>" +
        desvios + alerta +
        '<div class="corpo-resultado">' +
          '<figure class="desenho">' + desenhoEnformado(fam, s) + "<figcaption>Secção à escala (linha média), dimensões nominais em mm</figcaption></figure>" +
          blocoPropriedadesEnformado(fam, s, estado.aco) +
        "</div>" +
      "</section>" +
      blocoEC3Enformado(fam, s, estado.aco) +
      '<section class="cartao"><h2>Secções mais próximas</h2><ul class="candidatos">' + candidatos + "</ul></section>";
  }

  // ----- Resultado -----
  function linhaProp(simbolo, valor, unidade, casas) {
    return "<dt>" + simbolo + "</dt><dd>" + fmt(valor, casas) + '</dd><dd class="un">' + unidade + "</dd>";
  }

  function blocoPropriedades(p, pr) {
    return '<div class="grupos-props">' +
      '<div class="grupo-props"><h3>Geometria</h3><dl class="lista-props">' +
        linhaProp("h", p.h, "mm", 1) + linhaProp("b", p.b, "mm", 1) +
        linhaProp("t<sub>w</sub>", p.tw, "mm", 1) + linhaProp("t<sub>f</sub>", p.tf, "mm", 1) +
        linhaProp("r", p.r, "mm", 0) + linhaProp("A", pr.A, "cm²") + linhaProp("G", pr.G, "kg/m", 1) +
        linhaProp("A<sub>L</sub>", pr.AL, "m²/m", 3) + "</dl></div>" +
      '<div class="grupo-props"><h3>Eixo forte y-y</h3><dl class="lista-props">' +
        linhaProp("I<sub>y</sub>", pr.Iy, "cm⁴") + linhaProp("W<sub>el,y</sub>", pr.Wely, "cm³") +
        linhaProp("W<sub>pl,y</sub>", pr.Wply, "cm³") + linhaProp("i<sub>y</sub>", pr.iy, "cm") +
        linhaProp("A<sub>v,z</sub>", pr.Avz, "cm²") + "</dl></div>" +
      '<div class="grupo-props"><h3>Eixo fraco z-z</h3><dl class="lista-props">' +
        linhaProp("I<sub>z</sub>", pr.Iz, "cm⁴") + linhaProp("W<sub>el,z</sub>", pr.Welz, "cm³") +
        linhaProp("W<sub>pl,z</sub>", pr.Wplz, "cm³") + linhaProp("i<sub>z</sub>", pr.iz, "cm") + "</dl></div>" +
      '<div class="grupo-props"><h3>Torção</h3><dl class="lista-props">' +
        linhaProp("I<sub>t</sub>", pr.It, "cm⁴") + linhaProp("I<sub>w</sub>", pr.Iw / 1e3, "×10³ cm⁶") + "</dl></div>" +
      "</div>";
  }

  function blocoEC3(p, pr) {
    var tens = Seccao.tensoes(estado.aco, p.tf);
    var res = Seccao.resistencias(p, pr, tens.fy);
    var cl = res.classe;
    function classe(c) { return '<span class="classe' + (c === 4 ? " classe-4" : "") + '">' + c + "</span>"; }
    function kN(v, un, nota) {
      return v === null
        ? '<div class="valor-grande">—</div><p>Secção de classe 4: a resistência exige propriedades efetivas (EN 1993-1-5), ainda não calculadas.</p>'
        : '<div class="valor-grande">' + fmt(v, 0) + " <small>" + un + "</small></div><p>" + nota + "</p>";
    }
    return '<section class="cartao"><h2>Verificação da secção · ' + estado.aco + "</h2>" +
      '<div class="ec3">' +
        '<div class="ec3-item"><h3>Aço</h3><div class="valor-grande">f<sub>y</sub> = ' + tens.fy + " <small>MPa</small></div>" +
          "<p>f<sub>u</sub> = " + tens.fu + " MPa · t<sub>f</sub> = " + fmt(p.tf, 1) + " mm (" + (tens.escalao[0] ? tens.escalao[0] + " < " : "") + "t ≤ " + tens.escalao[1] + ", " + Seccao.ACOS[estado.aco].norma + ") · ε = " + fmt(cl.eps, 3) + "</p></div>" +
        '<div class="ec3-item"><h3>Classe à flexão</h3><div class="valor-grande">' + classe(cl.flexao) + "</div>" +
          "<p>Banzo c/t = " + fmt(cl.banzo.c_t, 1) + " · Alma c/t = " + fmt(cl.alma.c_t, 1) + "</p></div>" +
        '<div class="ec3-item"><h3>Classe à compressão</h3><div class="valor-grande">' + classe(cl.compressao) + "</div>" +
          "<p>Alma comprimida: limites 33ε / 38ε / 42ε</p></div>" +
        '<div class="ec3-item"><h3>Flexão <span class="sym">M<sub>c,y,Rd</sub></span></h3>' + kN(res.McyRd, "kN·m", (cl.flexao <= 2 ? "W<sub>pl,y</sub>" : "W<sub>el,y</sub>") + " · f<sub>y</sub> / γ<sub>M0</sub> (6.2.5)") + "</div>" +
        '<div class="ec3-item"><h3>Compressão <span class="sym">N<sub>pl,Rd</sub></span></h3>' + kN(res.NplRd, "kN", "A · f<sub>y</sub> / γ<sub>M0</sub>, sem encurvadura (6.2.4)") + "</div>" +
        '<div class="ec3-item"><h3>Corte <span class="sym">V<sub>pl,z,Rd</sub></span></h3>' + kN(res.VplzRd, "kN", "A<sub>v,z</sub> · f<sub>y</sub> / (√3 · γ<sub>M0</sub>) (6.2.6)") + "</div>" +
      "</div></section>";
  }

  function render() {
    var m = lerMedidas();
    if (!m.h || !m.b) {
      resultado.innerHTML = '<section class="cartao"><p class="nota">Introduza a altura e a largura do perfil para ver as séries que correspondem.</p></section>';
      return;
    }
    if (estado.forma !== "I") { renderEnformado(m); return; }
    if (!estado.familias.length) {
      resultado.innerHTML = '<section class="cartao"><p class="nota">Selecione pelo menos uma série de perfis.</p></section>';
      return;
    }
    var lista = procurar(m);
    var melhor = lista[0];
    var atual = estado.escolhido && lista.filter(function (c) { return c.perfil.nome === estado.escolhido; })[0] || melhor;
    var p = atual.perfil, pr = Seccao.propriedades(p), av = avaliar(atual.desvio);

    var desvios = '<div class="desvios">' +
      "<span>h <b>" + fmt(p.h, 0) + "</b> (" + fmtDelta(m.h - p.h) + " mm)</span>" +
      "<span>b <b>" + fmt(p.b, 0) + "</b> (" + fmtDelta(m.b - p.b) + " mm)</span>" +
      (m.tw ? "<span>t<sub>w</sub> <b>" + fmt(p.tw, 1) + "</b> (" + fmtDelta(m.tw - p.tw) + " mm)</span>" : "") +
      (m.tf ? "<span>t<sub>f</sub> <b>" + fmt(p.tf, 1) + "</b> (" + fmtDelta(m.tf - p.tf) + " mm)</span>" : "") +
      "</div>";

    var alerta = "";
    var segundo = lista[1];
    if (atual === melhor && segundo && !m.tf && segundo.desvio - melhor.desvio < 0.02) {
      alerta = '<p class="alerta">' + p.nome + " e " + segundo.perfil.nome +
        " têm dimensões exteriores parecidas. Meça a espessura do banzo (t<sub>f</sub> " + fmt(p.tf, 1) +
        " vs " + fmt(segundo.perfil.tf, 1) + " mm) para confirmar.</p>";
    }

    var candidatos = lista.slice(0, 6).map(function (c) {
      var q = c.perfil, prox = Math.max(0, 1 - c.desvio / 0.15);
      return '<li><button type="button" class="candidato" data-nome="' + q.nome + '" aria-current="' + (q === p) + '">' +
        '<span class="candidato-nome">' + q.nome + "</span>" +
        '<span class="candidato-dims">' + fmt(q.h, 0) + " × " + fmt(q.b, 0) + " · t<sub>w</sub> " + fmt(q.tw, 1) + " · t<sub>f</sub> " + fmt(q.tf, 1) + "</span>" +
        '<span class="barra" title="Desvio médio ' + fmt(c.desvio * 100, 1) + ' %"><span style="width:' + (prox * 100).toFixed(0) + '%"></span></span>' +
        "</button></li>";
    }).join("");

    resultado.innerHTML =
      '<section class="cartao">' +
        '<div class="cabeca-resultado"><h2 class="nome-perfil">' + p.nome + "</h2>" +
          '<span class="familia-perfil">' + PERFIS[p.familia].descricao + "</span>" +
          '<span class="selo ' + av.cls + '">' + av.txt + "</span></div>" +
        desvios + alerta +
        '<div class="corpo-resultado">' +
          '<figure class="desenho">' + desenho(p) + "<figcaption>Secção à escala, dimensões nominais em mm</figcaption></figure>" +
          blocoPropriedades(p, pr) +
        "</div>" +
      "</section>" +
      blocoEC3(p, pr) +
      '<section class="cartao"><h2>Perfis mais próximos</h2><ul class="candidatos">' + candidatos + "</ul></section>";
  }

  // ----- Catálogo -----
  // Tabela das madres O Feliz: valores do fabricante, sem cálculo (W efetivos em S350GD).
  var FAMILIAS_OFELIZ = ["Superomega", "C", "Z"];
  function renderCatalogoOFeliz(fam) {
    var so = fam === "Superomega";
    $("catalogo-desc").innerHTML = Enformados.FAMILIAS[fam].descricao + " · propriedades do fabricante, com a espessura de cálculo t<sub>eff</sub>" +
      " · W<sub>eff,y</sub> em S350GD" + (so ? " (+: banzo superior comprimido)" : "") +
      (so ? "" : " · na verificação, as propriedades são reduzidas pelo efeito dos cantos arredondados (EN 1993-1-3, 5.1(4))");
    var colunas = [["Secção", ""], ["h", "mm"], ["b", "mm"]].concat(so ? [] : [["a", "mm"]]).concat([
      ["t", "mm"], ["t<sub>eff</sub>", "mm"], ["G", "kg/m"], ["A", "cm²"], ["I<sub>y</sub>", "cm⁴"], ["I<sub>z</sub>", "cm⁴"],
      ["I<sub>t</sub>", "cm⁴"], ["I<sub>w</sub>", "cm⁶"]]).concat(so
      ? [["W<sub>eff,y+</sub>", "cm³"], ["W<sub>eff,y−</sub>", "cm³"]]
      : [["W<sub>eff,y</sub>", "cm³"]]);
    var cab = "<thead><tr>" + colunas.map(function (c) {
      return '<th scope="col">' + c[0] + (c[1] ? '<span class="un">' + c[1] + "</span>" : "") + "</th>";
    }).join("") + "</tr></thead>";
    var corpo = Enformados.seccoes(fam).map(function (s) {
      var ef = s.ef.S350GD;
      var v = [fmt(s.h, 0), fmt(s.b, 0)].concat(so ? [] : [fmt(s.a, 0)]).concat([fmt(s.t, 1), fmt(s.teff, 2), fmt(s.G, 2), fmt(s.A, 2),
        fmt(s.Iy), fmt(s.Iz), fmt(s.It, 4), fmt(s.Iw)]).concat(so ? [fmt(ef[2], 2), fmt(ef[4], 2)] : [fmt(ef[2], 2)]);
      return '<tr class="linha-omega" data-nome="' + s.nome + '" data-familia="' + fam + '" tabindex="0"><td>' + s.nome + "</td><td>" + v.join("</td><td>") + "</td></tr>";
    }).join("");
    $("tabela-catalogo").innerHTML = cab + "<tbody>" + corpo + "</tbody>";
  }

  function renderCatalogo() {
    var fam = estado.familiaCatalogo;
    var ofeliz = FAMILIAS_OFELIZ.indexOf(fam) >= 0;
    if (ofeliz) { renderCatalogoOFeliz(fam); return; }
    $("catalogo-desc").textContent = fam + " · " + PERFIS[fam].descricao + " · dimensões segundo a EN 10365:2017";
    var colunas = [
      ["Perfil", ""], ["h", "mm"], ["b", "mm"], ["t<sub>w</sub>", "mm"], ["t<sub>f</sub>", "mm"], ["r", "mm"],
      ["A", "cm²"], ["G", "kg/m"], ["I<sub>y</sub>", "cm⁴"], ["W<sub>pl,y</sub>", "cm³"], ["i<sub>y</sub>", "cm"],
      ["I<sub>z</sub>", "cm⁴"], ["W<sub>pl,z</sub>", "cm³"], ["i<sub>z</sub>", "cm"], ["I<sub>t</sub>", "cm⁴"],
      ["I<sub>w</sub>", "×10³ cm⁶"], ["A<sub>L</sub>", "m²/m"]
    ];
    var cab = "<thead><tr>" + colunas.map(function (c) {
      return '<th scope="col">' + c[0] + (c[1] ? '<span class="un">' + c[1] + "</span>" : "") + "</th>";
    }).join("") + "</tr></thead>";
    var corpo = TODOS.filter(function (p) { return p.familia === fam; }).map(function (p) {
      var pr = Seccao.propriedades(p);
      var v = [fmt(p.h, 0), fmt(p.b, 0), fmt(p.tw, 1), fmt(p.tf, 1), fmt(p.r, 0), fmt(pr.A), fmt(pr.G, 1),
        fmt(pr.Iy), fmt(pr.Wply), fmt(pr.iy), fmt(pr.Iz), fmt(pr.Wplz), fmt(pr.iz), fmt(pr.It), fmt(pr.Iw / 1e3), fmt(pr.AL, 3)];
      return '<tr data-nome="' + p.nome + '" tabindex="0"><td>' + p.nome + "</td><td>" + v.join("</td><td>") + "</td></tr>";
    }).join("");
    $("tabela-catalogo").innerHTML = cab + "<tbody>" + corpo + "</tbody>";
  }

  function abrirNoIdentificador(nome, familia) {
    function v(x) { return String(x).replace(".", ","); }
    if (FAMILIAS_OFELIZ.indexOf(familia) >= 0) {
      var s = Enformados.seccoes(familia).filter(function (q) { return q.nome === nome; })[0];
      if (!s) return;
      var forma = familia === "Superomega" ? "omega" : familia;
      form.elements.forma.value = forma;
      atualizarForma(forma, estado.aco);
      form.elements.h.value = v(s.h); form.elements.b.value = v(s.b); form.elements.t.value = v(s.t);
      form.elements.a.value = s.a ? v(s.a) : "";
      estado.escolhido = nome;
      $("nota-exemplo").hidden = true;
      mostrar("identificar");
      render();
      window.scrollTo(0, 0);
      return;
    }
    var p = TODOS.filter(function (q) { return q.nome === nome; })[0];
    if (!p) return;
    if (estado.forma !== "I") { form.elements.forma.value = "I"; atualizarForma("I", estado.aco); }
    form.elements.h.value = v(p.h); form.elements.b.value = v(p.b);
    form.elements.tw.value = v(p.tw); form.elements.tf.value = v(p.tf);
    if (estado.familias.indexOf(p.familia) === -1) {
      estado.familias.push(p.familia);
      document.querySelector('#fichas-familias input[value="' + p.familia + '"]').checked = true;
    }
    estado.escolhido = null;
    $("nota-exemplo").hidden = true;
    mostrar("identificar");
    render();
    window.scrollTo(0, 0);
  }

  // ----- Vistas -----
  function mostrar(vista) {
    ["identificar", "madres", "portico", "catalogo"].forEach(function (v) {
      $("vista-" + v).hidden = v !== vista;
      $("tab-" + v).setAttribute("aria-selected", String(v === vista));
    });
    try { history.replaceState(null, "", "#" + vista); } catch (e) { /* sem histórico disponível */ }
    Memoria.gravar("vista", vista);
  }

  // ----- Arranque -----
  function iniciar() {
    $("fichas-familias").innerHTML = FAMILIAS.map(function (f) {
      return '<label class="ficha"><input type="checkbox" value="' + f + '" checked>' + f + "</label>";
    }).join("");
    $("fichas-catalogo").innerHTML = FAMILIAS.concat(FAMILIAS_OFELIZ).map(function (f) {
      return '<label class="ficha"><input type="radio" name="familia-catalogo" value="' + f + '"' + (f === estado.familiaCatalogo ? " checked" : "") + ">" + f + "</label>";
    }).join("");
    atualizarForma("I", estado.aco);

    form.elements.h.value = EXEMPLO.h;
    form.elements.b.value = EXEMPLO.b;
    var padrao = Memoria.doFormulario(form);
    var guardado = Memoria.ler("identificar");
    function aplicar(v, familias) {
      Memoria.paraFormulario(form, v);
      // A lista das classes de aço depende da forma guardada.
      atualizarForma(form.elements.forma.value, v.aco);
      estado.familias = FAMILIAS.filter(function (f) { return !familias || familias.indexOf(f) !== -1; });
      Array.prototype.forEach.call(form.querySelectorAll("#fichas-familias input"), function (i) {
        i.checked = estado.familias.indexOf(i.value) !== -1;
      });
    }
    if (guardado) {
      aplicar(guardado.campos, guardado.familias);
      $("nota-exemplo").hidden = true;
    }
    function gravar() { Memoria.gravar("identificar", { campos: Memoria.doFormulario(form), familias: estado.familias }); }
    $("repor-identificar").addEventListener("click", function () {
      aplicar(padrao, null);
      Memoria.apagar("identificar");
      estado.escolhido = null;
      $("nota-exemplo").hidden = false;
      render();
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function (e) {
      if (e.target.name === "aco") estado.aco = e.target.value;
      else if (e.target.name === "forma") { atualizarForma(e.target.value, estado.aco); estado.escolhido = null; }
      else if (e.target.type === "checkbox") {
        estado.familias = Array.prototype.filter.call(form.querySelectorAll("#fichas-familias input"), function (i) { return i.checked; })
          .map(function (i) { return i.value; });
      } else {
        estado.escolhido = null;
        $("nota-exemplo").hidden = true;
      }
      gravar();
      render();
    });
    resultado.addEventListener("click", function (e) {
      var b = e.target.closest(".candidato");
      if (!b) return;
      estado.escolhido = b.getAttribute("data-nome");
      render();
      var mesmo = resultado.querySelector('.candidato[data-nome="' + estado.escolhido + '"]');
      if (mesmo) mesmo.focus();
    });

    $("fichas-catalogo").addEventListener("change", function (e) {
      estado.familiaCatalogo = e.target.value;
      renderCatalogo();
    });
    var tabela = $("tabela-catalogo");
    tabela.addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-nome]");
      if (tr) abrirNoIdentificador(tr.getAttribute("data-nome"), tr.getAttribute("data-familia"));
    });
    tabela.addEventListener("keydown", function (e) {
      var tr = e.target.closest("tr[data-nome]");
      if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirNoIdentificador(tr.getAttribute("data-nome"), tr.getAttribute("data-familia")); }
    });

    Array.prototype.forEach.call(document.querySelectorAll(".separador"), function (b) {
      b.addEventListener("click", function () { mostrar(b.getAttribute("data-vista")); window.scrollTo(0, 0); });
    });

    renderCatalogo();
    render();
    // Abre a vista do endereço; sem endereço (por exemplo, pelo ícone do ecrã principal), a última usada.
    var VISTAS = ["identificar", "madres", "portico", "catalogo"];
    var vista = VISTAS.indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : Memoria.ler("vista");
    if (VISTAS.indexOf(vista) > 0) mostrar(vista);
  }

  iniciar();
  window.SteelFrames = { fmt: fmt, mostrar: mostrar, Memoria: Memoria };
})();
