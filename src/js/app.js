/* Interface: identificação de perfis por medidas e catálogo. Depende de perfis.js e seccao.js. */
(function () {
  var FAMILIAS = Object.keys(PERFIS);
  var TODOS = Seccao.todos();
  var EXEMPLO = { h: 300, b: 150 };

  var estado = {
    familias: FAMILIAS.slice(),
    aco: "S355",
    escolhido: null,        // perfil escolhido à mão na lista de candidatos
    familiaCatalogo: "IPE"
  };

  var $ = function (id) { return document.getElementById(id); };
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
      var v = parseFloat(String(form.elements[nome].value).replace(",", "."));
      return isFinite(v) && v > 0 ? v : null;
    }
    return { h: num("h"), b: num("b"), tw: num("tw"), tf: num("tf") };
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
          "<p>f<sub>u</sub> = " + tens.fu + " MPa · t<sub>f</sub> " + (p.tf <= 40 ? "≤ 40" : "> 40") + " mm · ε = " + fmt(cl.eps, 3) + "</p></div>" +
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
  // Tabela das madres em ómega: valores do catálogo do fabricante, sem cálculo.
  function renderCatalogoOmega(fam) {
    var f = OMEGAS[fam];
    $("catalogo-desc").textContent = fam + " · " + f.descricao + " · " + f.fabricante +
      " · propriedades da secção bruta, tal como no catálogo (sem efeitos de encurvadura)";
    var colunas = [
      ["Secção", ""], ["Disposição", ""], ["H", "mm"], ["b<sub>1</sub>", "mm"], ["b<sub>2</sub>", "mm"], ["b<sub>3</sub>", "mm"],
      ["t", "mm"], ["G", "kg/m"], ["A", "cm²"], ["I<sub>y</sub>", "cm⁴"], ["W<sub>y,min</sub>", "cm³"], ["i<sub>y</sub>", "cm"],
      ["I<sub>z</sub>", "cm⁴"], ["W<sub>z,min</sub>", "cm³"], ["i<sub>z</sub>", "cm"]
    ];
    var NOMES = { simples: "simples", sobreposta: "sobreposta", dupla: "dupla" };
    var cab = "<thead><tr>" + colunas.map(function (c) {
      return '<th scope="col">' + c[0] + (c[1] ? '<span class="un">' + c[1] + "</span>" : "") + "</th>";
    }).join("") + "</tr></thead>";
    function valor(v, casas) { return v === null || v === undefined ? "—" : fmt(v, casas); }
    var corpo = f.seccoes.map(function (sec) {
      return ["simples", "sobreposta", "dupla"].filter(function (k) { return sec[k]; }).map(function (k, i) {
        var x = sec[k];
        return '<tr class="linha-omega"><td>' + (i === 0 ? sec.nome : "") + "</td><td>" + NOMES[k] + "</td><td>" +
          [valor(x.H, 1), valor(x.b1, 1), valor(x.b2, 1), valor(x.b3, 1), valor(x.t, 1), valor(x.G, 2), valor(x.A / 100, 2),
            valor(x.Iy, 2), valor(x.Wy, 2), valor(x.iy, 2), valor(x.Iz, 2), valor(x.Wz, 2), valor(x.iz, 2)].join("</td><td>") + "</td></tr>";
      }).join("");
    }).join("");
    $("tabela-catalogo").innerHTML = cab + "<tbody>" + corpo + "</tbody>";
  }

  function renderCatalogo() {
    var fam = estado.familiaCatalogo;
    $("catalogo-ajuda").hidden = !!OMEGAS[fam];
    if (OMEGAS[fam]) { renderCatalogoOmega(fam); return; }
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

  function abrirNoIdentificador(nome) {
    var p = TODOS.filter(function (q) { return q.nome === nome; })[0];
    if (!p) return;
    form.elements.h.value = p.h; form.elements.b.value = p.b;
    form.elements.tw.value = p.tw; form.elements.tf.value = p.tf;
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
    ["identificar", "madres", "catalogo"].forEach(function (v) {
      $("vista-" + v).hidden = v !== vista;
      $("tab-" + v).setAttribute("aria-selected", String(v === vista));
    });
    try { history.replaceState(null, "", "#" + vista); } catch (e) { /* sem histórico disponível */ }
  }

  // ----- Arranque -----
  function iniciar() {
    $("fichas-familias").innerHTML = FAMILIAS.map(function (f) {
      return '<label class="ficha"><input type="checkbox" value="' + f + '" checked>' + f + "</label>";
    }).join("");
    $("fichas-catalogo").innerHTML = FAMILIAS.concat(Object.keys(OMEGAS)).map(function (f) {
      return '<label class="ficha"><input type="radio" name="familia-catalogo" value="' + f + '"' + (f === estado.familiaCatalogo ? " checked" : "") + ">" + f + "</label>";
    }).join("");
    $("in-aco").innerHTML = Object.keys(Seccao.ACOS).map(function (a) {
      return '<option value="' + a + '"' + (a === estado.aco ? " selected" : "") + ">" + a + " · " + Seccao.ACOS[a].norma + "</option>";
    }).join("");

    form.elements.h.value = EXEMPLO.h;
    form.elements.b.value = EXEMPLO.b;

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function (e) {
      if (e.target.name === "aco") estado.aco = e.target.value;
      else if (e.target.type === "checkbox") {
        estado.familias = Array.prototype.filter.call(form.querySelectorAll("#fichas-familias input"), function (i) { return i.checked; })
          .map(function (i) { return i.value; });
      } else {
        estado.escolhido = null;
        $("nota-exemplo").hidden = true;
      }
      render();
    });
    resultado.addEventListener("click", function (e) {
      var b = e.target.closest(".candidato");
      if (!b) return;
      estado.escolhido = b.getAttribute("data-nome");
      render();
    });

    $("fichas-catalogo").addEventListener("change", function (e) {
      estado.familiaCatalogo = e.target.value;
      renderCatalogo();
    });
    var tabela = $("tabela-catalogo");
    tabela.addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-nome]");
      if (tr) abrirNoIdentificador(tr.getAttribute("data-nome"));
    });
    tabela.addEventListener("keydown", function (e) {
      var tr = e.target.closest("tr[data-nome]");
      if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirNoIdentificador(tr.getAttribute("data-nome")); }
    });

    Array.prototype.forEach.call(document.querySelectorAll(".separador"), function (b) {
      b.addEventListener("click", function () { mostrar(b.getAttribute("data-vista")); window.scrollTo(0, 0); });
    });

    renderCatalogo();
    render();
    if (location.hash === "#catalogo" || location.hash === "#madres") mostrar(location.hash.slice(1));
  }

  iniciar();
  window.SteelFrames = { fmt: fmt, mostrar: mostrar };
})();
