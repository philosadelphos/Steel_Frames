/*
 * Interface: identificação de perfis por medidas e catálogo.
 * Depende de perfis.js, perfis-u.js, perfis-lt.js, seccao.js e enformados.js.
 */
(function () {
  var FAMILIAS = Object.keys(PERFIS);
  var TODOS = Seccao.todos();
  var TODOS_U = Seccao.todosU();
  var FAMILIAS_U = Object.keys(PERFIS_U);
  var TODOS_LT = Seccao.todosLT();
  var FAMILIAS_LT = ["Liguais", "Ldesiguais", "T"];
  var EXEMPLO = { h: 300, b: 150 };

  var estado = {
    familias: FAMILIAS.slice(),
    // I ou H laminado, U laminado, enformado a frio ("omega", "C", "Z"), cantoneira ("Liguais", "Ldesiguais"),
    // perfil T ("T") ou "qualquer" (procura em todas as séries).
    forma: "I",
    aco: "S355",
    escolhido: null,        // perfil escolhido à mão na lista de candidatos
    medidas: {},            // medidas guardadas de cada forma (texto dos campos)
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

  // ----- Formas e campos -----
  // Campo do formulário: nome, rótulo, símbolo, principal (necessário para confirmar a identificação) e o texto da
  // sugestão "meça …". As medidas secundárias (espessuras, reforço) pesam metade no desvio: medem-se pior.
  function campo(nome, rotulo, sim, principal, meca) {
    return { nome: nome, rotulo: rotulo, sim: sim, principal: principal, peso: principal ? 1 : 0.5, esp: /^t/.test(nome), meca: meca };
  }
  var CAMPOS_IU = [campo("h", "Altura", "h", true, "a altura h"), campo("b", "Largura", "b", true, "a largura b"),
    campo("tw", "Alma", "t<sub>w</sub>", false, "a espessura da alma t<sub>w</sub>"),
    campo("tf", "Banzo", "t<sub>f</sub>", false, "a espessura do banzo t<sub>f</sub>")];
  var CAMPOS_ENF = [campo("h", "Altura", "h", true, "a altura h"), campo("b", "Largura", "b", true, "a largura b"),
    campo("t", "Espessura", "t", false, "a espessura t")];
  var CAMPOS_CZ = CAMPOS_ENF.concat([campo("a", "Reforço", "a", false, "o reforço a")]);
  // semOrdem: par de medidas que se compara por qualquer ordem (a maior com a maior).
  var FORMAS = {
    I: { curto: "I/H", nome: "I ou H", campos: CAMPOS_IU },
    U: { curto: "U", nome: "U", campos: CAMPOS_IU },
    omega: { curto: "Ω", nome: "ómega", campos: CAMPOS_ENF, familia: "Superomega" },
    C: { curto: "C", nome: "C", campos: CAMPOS_CZ, familia: "C" },
    Z: { curto: "Z", nome: "Z", campos: CAMPOS_CZ, familia: "Z" },
    Liguais: { curto: "L", nome: "L de abas iguais", campos: [campo("a", "Aba", "a", true, "a aba a"), campo("t", "Espessura", "t", false, "a espessura t")] },
    Ldesiguais: { curto: "L", nome: "L de abas desiguais", semOrdem: ["a", "b"], campos: [campo("a", "Aba", "a", true, "a aba a"),
      campo("b", "Outra aba", "b", true, "a outra aba b"), campo("t", "Espessura", "t", false, "a espessura t")] },
    T: { curto: "T", nome: "T", campos: [campo("h", "Altura", "h", true, "a altura h"), campo("b", "Largura do banzo", "b", true, "a largura do banzo b"),
      campo("t", "Espessura", "t", false, "a espessura t")] },
    qualquer: { curto: "", nome: "qualquer forma", semOrdem: ["h", "b"], campos: [campo("h", "Dimensão maior", "D", true, "a dimensão maior D"),
      campo("b", "Dimensão menor", "d", true, "a dimensão menor d"), campo("t", "Espessura", "t", false, "a espessura de uma parede t")] }
  };
  var ENFORMADOS = ["omega", "C", "Z"];
  var LT = ["Liguais", "Ldesiguais", "T"];
  var NOMES_CAMPOS = ["h", "b", "tw", "tf", "t", "a"];
  function campoDe(forma, nome) { return FORMAS[forma].campos.filter(function (k) { return k.nome === nome; })[0]; }

  // Medidas introduzidas nos campos da forma (só as válidas).
  function lerMedidas(forma) {
    var m = {};
    FORMAS[forma].campos.forEach(function (k) {
      var txt = String(form.elements[k.nome].value).trim().replace(",", ".");
      var v = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(txt) ? parseFloat(txt) : NaN;
      if (isFinite(v) && v > 0) m[k.nome] = v;
    });
    return m;
  }

  // ----- Candidatos -----
  // Cada candidato: tipo de cálculo (I, U, enf, L, T), forma, família, perfil, G e as dimensões nominais de cada campo;
  // D e d são a maior e a menor dimensão exterior e esp as espessuras das paredes (para "qualquer forma").
  var cacheCandidatos = {};
  function candidatos(forma) {
    if (cacheCandidatos[forma]) return cacheCandidatos[forma];
    var l = [], todas = forma === "qualquer";
    if (forma === "I" || todas) TODOS.forEach(function (p) {
      l.push({ tipo: "I", forma: "I", familia: p.familia, nome: p.nome, perfil: p, G: Seccao.propriedades(p).G, dims: { h: p.h, b: p.b, tw: p.tw, tf: p.tf }, esp: [p.tw, p.tf] });
    });
    if (forma === "U" || todas) TODOS_U.forEach(function (p) {
      l.push({ tipo: "U", forma: "U", familia: p.familia, nome: p.nome, perfil: p, G: Seccao.propriedadesU(p).G, dims: { h: p.h, b: p.b, tw: p.tw, tf: p.tf }, esp: [p.tw, p.tf] });
    });
    ENFORMADOS.forEach(function (f) {
      if (forma !== f && !todas) return;
      Enformados.seccoes(FORMAS[f].familia).forEach(function (s) {
        l.push({ tipo: "enf", forma: f, familia: FORMAS[f].familia, nome: s.nome, perfil: s, G: s.G, dims: { h: s.h, b: s.b, t: s.t, a: s.a || undefined }, esp: [s.t] });
      });
    });
    TODOS_LT.forEach(function (p) {
      if (forma !== p.familia && !todas) return;
      l.push({ tipo: p.tipo, forma: p.familia, familia: p.familia, nome: p.nome, perfil: p, G: Seccao.propriedadesLT(p).G,
        dims: p.tipo === "L" ? { a: p.a, b: p.b, t: p.t } : { h: p.h, b: p.b, t: p.t }, esp: [p.t] });
    });
    l.forEach(function (c) { var d1 = c.dims.h || c.dims.a; c.D = Math.max(d1, c.dims.b); c.d = Math.min(d1, c.dims.b); });
    return (cacheCandidatos[forma] = l);
  }

  // Tolerância de compatibilidade de cada medida: laminagem mais erro de medição.
  function tolerancia(nominal, esp) { return esp ? Math.max(0.25, 0.1 * nominal) : Math.max(1.5, 0.03 * nominal); }
  function maisPerto(v, lista) { return lista.reduce(function (a, b) { return Math.abs(v - b) / b < Math.abs(v - a) / a ? b : a; }); }

  // Compara as medidas introduzidas com um candidato: desvio relativo médio quadrático só nas medidas introduzidas,
  // compatibilidade (todas dentro da tolerância), termos (medida, valor nominal comparado) e as dimensões nominais
  // dos campos ainda por medir (para sugerir a medida que distingue os candidatos).
  function comparar(forma, m, c) {
    var F = FORMAS[forma], termos = [], restantes = {}, feitos = {};
    var nominal = forma === "qualquer" ? { h: c.D, b: c.d, t: c.esp } : c.dims;
    function termo(nome, medido, p) { termos.push({ campo: campoDe(forma, nome), m: medido, p: p }); }
    if (F.semOrdem) {
      var n1 = F.semOrdem[0], n2 = F.semOrdem[1], p1 = nominal[n1], p2 = nominal[n2];   // p1 ≥ p2
      if (m[n1] && m[n2]) {
        var trocado = m[n1] < m[n2];
        termo(trocado ? n2 : n1, Math.max(m[n1], m[n2]), p1);
        termo(trocado ? n1 : n2, Math.min(m[n1], m[n2]), p2);
      } else if (m[n1] || m[n2]) {
        // Uma só medida: na cantoneira, compara com a aba mais parecida; em "qualquer forma", a dimensão maior com a
        // maior e a menor com a menor, como diz o rótulo.
        var nm = m[n1] ? n1 : n2, outro = nm === n1 ? n2 : n1, v = m[nm];
        var p = forma === "qualquer" ? nominal[nm] : maisPerto(v, [p1, p2]);
        termo(nm, v, p);
        restantes[outro] = forma === "qualquer" ? nominal[outro] : p === p1 ? p2 : p1;
      } else { restantes[n1] = p1; restantes[n2] = p2; }
      feitos[n1] = feitos[n2] = true;
    }
    F.campos.forEach(function (k) {
      var p = nominal[k.nome];
      if (feitos[k.nome] || p === undefined) return;
      if (m[k.nome]) termo(k.nome, m[k.nome], Array.isArray(p) ? maisPerto(m[k.nome], p) : p);
      else restantes[k.nome] = p;
    });
    var soma = 0, peso = 0, compativel = true;
    termos.forEach(function (x) {
      var d = (x.m - x.p) / x.p;
      soma += x.campo.peso * d * d; peso += x.campo.peso;
      if (Math.abs(x.m - x.p) > tolerancia(x.p, x.campo.esp)) compativel = false;
    });
    return { desvio: peso ? Math.sqrt(soma / peso) : 0, compativel: compativel, termos: termos, restantes: restantes };
  }

  // Compatíveis primeiro, depois pelo desvio e, com o mesmo desvio, o mais leve.
  function procurar(forma, m) {
    return candidatos(forma)
      .filter(function (c) { return c.tipo !== "I" || forma === "qualquer" || estado.familias.indexOf(c.familia) !== -1; })
      .map(function (c) { return { c: c, r: comparar(forma, m, c) }; })
      .sort(function (x, y) { return (y.r.compativel - x.r.compativel) || (x.r.desvio - y.r.desvio) || (x.c.G - y.c.G); });
  }

  // Valores com as mesmas casas decimais; com decimais, separados por ponto e vírgula (a vírgula é a decimal).
  function listaValores(vals) {
    vals = vals.slice().sort(function (a, b) { return a - b; });
    var casas = vals.some(function (v) { return Math.abs(v * 10 - Math.round(v * 10)) > 1e-9; }) ? 2 : vals.some(function (v) { return v % 1; }) ? 1 : 0;
    var f = vals.map(function (v) { return fmt(v, casas); }), sep = casas ? "; " : ", ";
    if (f.length > 6) return "de " + f[0] + " a " + f[f.length - 1] + " mm (" + f.length + " valores)";
    return (f.length > 1 ? f.slice(0, -1).join(sep) + " ou " + f[f.length - 1] : f[0]) + " mm";
  }

  // Medida por introduzir com mais valores nominais diferentes entre os compatíveis (a que mais encurta a lista),
  // dando preferência às dimensões exteriores, que se medem melhor do que as espessuras.
  function sugestao(forma, compat, m) {
    var melhor = null, formas = [], familias = [], txt = [];
    FORMAS[forma].campos.forEach(function (k) {
      if (m[k.nome]) return;
      var vals = [];
      compat.forEach(function (x) { [].concat(x.r.restantes[k.nome]).forEach(function (v) { if (v && vals.indexOf(v) < 0) vals.push(v); }); });
      if (vals.length < 2) return;
      if (!melhor || (k.principal && !melhor.k.principal) || (k.principal === melhor.k.principal && vals.length > melhor.vals.length)) melhor = { k: k, vals: vals };
    });
    compat.forEach(function (x) {
      if (formas.indexOf(x.c.forma) < 0) formas.push(x.c.forma);
      if (familias.indexOf(x.c.familia) < 0) familias.push(x.c.familia);
    });
    if (melhor) txt.push("Para os distinguir, meça " + melhor.k.meca + ": " + listaValores(melhor.vals) + ".");
    if (formas.length > 1) txt.push("Há candidatos de formas diferentes (" + formas.map(function (f) { return FORMAS[f].nome; }).join(", ") + "): escolher a forma no seletor também encurta a lista.");
    else if (familias.indexOf("UPN") >= 0 && familias.indexOf("UPE") >= 0) txt.push("Veja se as faces interiores dos banzos são inclinadas (UPN) ou paralelas (UPE).");
    if (!txt.length) txt.push("Têm as mesmas medidas nominais: confirme a série pela marcação, pelo projeto ou pelo fornecedor.");
    return txt.join(" ");
  }

  // ----- Forma escolhida: campos, esquema e classes de aço -----
  function acosForma(forma) {
    return ENFORMADOS.indexOf(forma) >= 0 ? Enformados.FAMILIAS[FORMAS[forma].familia].acos : Object.keys(Seccao.ACOS);
  }
  var NOTAS_FORMA = {
    U: "UPN (banzos inclinados, t<sub>f</sub> medida a meio do banzo) e UPE (banzos paralelos), da EN 10365. A C enformada a frio, com reforços nas pontas dos banzos, é outra série.",
    omega: "Meça a altura total h e a largura total b, nas pontas das abas inferiores.",
    C: "Meça a largura b do banzo e a altura a do reforço por fora. As madres C e Z da O Feliz têm as mesmas dimensões: é a forma que distingue as duas séries.",
    Liguais: "Meça a aba a por fora, do dorso à ponta, e a espessura t perto da ponta. Gama da Masterferro (aço S275JR), com os raios da EN 10056-1.",
    Ldesiguais: "As abas podem ser introduzidas por qualquer ordem. Gama da Masterferro (aço S275JR), com os raios da EN 10056-1.",
    T: "Altura h do banzo à ponta da alma e largura b do banzo; nos T da EN 10055, h = b e o banzo e a alma têm a mesma espessura t. Banzo e alma são ligeiramente inclinados: meça t a meio. Gama da Masterferro (S275JR).",
    qualquer: "Procura em todas as séries: I/H, U, ómega, C, Z, cantoneiras e T. As duas dimensões exteriores podem ir por qualquer ordem; a espessura é a de uma parede qualquer (alma, banzo ou aba)."
  };
  NOTAS_FORMA.Z = NOTAS_FORMA.C;

  // Mostra os campos, o esboço e as classes de aço da forma escolhida. Ao mudar para cantoneira ou T, propõe o aço
  // do catálogo (S275).
  function atualizarForma(forma, aco, mudou) {
    estado.forma = forma;
    var lista = acosForma(forma), enf = ENFORMADOS.indexOf(forma) >= 0, lt = LT.indexOf(forma) >= 0;
    var padrao = enf ? "S350GD" : lt ? "S275" : "S355";
    estado.aco = lista.indexOf(aco) >= 0 && !(mudou && lt) ? aco : padrao;
    $("in-aco").innerHTML = lista.map(function (a) {
      return '<option value="' + a + '"' + (a === estado.aco ? " selected" : "") + ">" + a + (Seccao.ACOS[a] ? " · " + Seccao.ACOS[a].norma : " · EN 10346") + "</option>";
    }).join("");
    // Os campos da forma passam para a frente, pela ordem da forma (é também a ordem do teclado).
    var caixa = $("campo-h").parentNode;
    FORMAS[forma].campos.slice().reverse().forEach(function (k) { caixa.insertBefore($("campo-" + k.nome), caixa.firstChild); });
    NOMES_CAMPOS.forEach(function (n) {
      var k = campoDe(forma, n), el = $("campo-" + n), input = form.elements[n];
      el.hidden = !k;
      input.required = !!(k && k.principal);
      if (k) el.querySelector(".rotulo").innerHTML = k.rotulo + " <i>" + k.sim + "</i>" + (k.principal ? "" : " <small>opcional</small>");
    });
    $("grupo-familias").hidden = forma !== "I";
    // Num SVG, a propriedade hidden não existe: é preciso mudar o atributo.
    Array.prototype.forEach.call(document.querySelectorAll(".esquema svg[data-forma]"), function (svg) {
      svg.toggleAttribute("hidden", svg.getAttribute("data-forma") !== forma);
    });
    $("nota-forma").hidden = !NOTAS_FORMA[forma];
    $("nota-forma").innerHTML = NOTAS_FORMA[forma] || "";
  }

  // Cada forma guarda as suas medidas: ao trocar, guardam-se as da forma anterior e repõem-se as da nova.
  function guardarMedidasForma() {
    var v = {};
    FORMAS[estado.forma].campos.forEach(function (k) { if (form.elements[k.nome].value) v[k.nome] = form.elements[k.nome].value; });
    estado.medidas[estado.forma] = v;
  }
  function trocarForma(forma, valores) {
    guardarMedidasForma();
    form.elements.forma.value = forma;
    atualizarForma(forma, estado.aco, true);
    var v = valores || estado.medidas[forma] || {};
    NOMES_CAMPOS.forEach(function (n) { form.elements[n].value = v[n] === undefined ? "" : v[n]; });
    estado.escolhido = null;
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

  // Perfil U à escala, a partir do contorno calculado (unidades do SVG = mm; y para baixo no desenho).
  function desenhoU(p, pr) {
    var B = p.b, H = p.h, M = Math.max(B, H), fs = M * 0.05, tr = fs * 0.35, x0 = -B / 2;
    var d = pr.contorno.map(function (q, i) { return (i ? "L" : "M") + (q[0] + x0).toFixed(2) + " " + (-q[1]).toFixed(2); }).join("") + "Z";
    var cb = -H / 2 - M * 0.16, ch = -B / 2 - M * 0.16, xc = x0 + pr.ys * 10;
    function traco(x, y) { return "M" + (x - tr) + " " + (y + tr) + "L" + (x + tr) + " " + (y - tr); }
    var cotas = "M" + (-B / 2) + " " + (-H / 2 - M * 0.03) + "V" + (cb - M * 0.03) + "M" + (B / 2) + " " + (-H / 2 - M * 0.03) + "V" + (cb - M * 0.03) +
      "M" + (-B / 2) + " " + cb + "H" + (B / 2) + "M" + (-B / 2 - M * 0.03) + " " + (-H / 2) + "H" + (ch - M * 0.03) + "M" + (-B / 2 - M * 0.03) + " " + (H / 2) + "H" + (ch - M * 0.03) +
      "M" + ch + " " + (-H / 2) + "V" + (H / 2) + traco(-B / 2, cb) + traco(B / 2, cb) + traco(ch, -H / 2) + traco(ch, H / 2);
    var eixos = "M" + (-B / 2 - M * 0.08) + " 0H" + (B / 2 + M * 0.08) + "M" + xc + " " + (-H / 2 - M * 0.08) + "V" + (H / 2 + M * 0.08);
    var vb = [-B / 2 - M * 0.27, -H / 2 - M * 0.27, B + M * 0.27 + M * 0.36, H + M * 0.27 + M * 0.2];
    return '<svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Secção ' + p.nome + ' à escala">' +
      '<path class="sec-forma" d="' + d + '"/><path class="sec-eixo" d="' + eixos + '"/><path class="sec-cota" d="' + cotas + '"/>' +
      '<text class="sec-txt" x="0" y="' + (cb - fs * 0.45) + '" font-size="' + fs + '" text-anchor="middle">' + fmt(B, 0) + "</text>" +
      '<text class="sec-txt" font-size="' + fs + '" text-anchor="middle" transform="translate(' + (ch - fs * 0.45) + ' 0) rotate(-90)">' + fmt(H, 0) + "</text>" +
      '<text class="sec-txt-eixo" x="' + (B / 2 + M * 0.1) + '" y="' + fs * 0.35 + '" font-size="' + fs + '">y</text>' +
      '<text class="sec-txt-eixo" x="' + xc + '" y="' + (H / 2 + M * 0.1 + fs * 0.7) + '" font-size="' + fs + '" text-anchor="middle">z</text>' +
      "</svg>";
  }

  function blocoPropriedadesU(p, pr) {
    return '<div class="grupos-props">' +
      '<div class="grupo-props"><h3>Geometria</h3><dl class="lista-props">' +
        linhaProp("h", p.h, "mm", 0) + linhaProp("b", p.b, "mm", 0) + linhaProp("t<sub>w</sub>", p.tw, "mm", 1) + linhaProp("t<sub>f</sub>", p.tf, "mm", 1) +
        linhaProp(p.r2 ? "r<sub>1</sub>" : "r", p.r, "mm", 1) + (p.r2 ? linhaProp("r<sub>2</sub>", p.r2, "mm", 1) : "") +
        linhaProp("A", pr.A, "cm²") + linhaProp("G", pr.G, "kg/m", 1) + "</dl></div>" +
      '<div class="grupo-props"><h3>Eixo forte y-y</h3><dl class="lista-props">' +
        linhaProp("I<sub>y</sub>", pr.Iy, "cm⁴") + linhaProp("W<sub>el,y</sub>", pr.Wely, "cm³") + linhaProp("W<sub>pl,y</sub>", pr.Wply, "cm³") +
        linhaProp("i<sub>y</sub>", pr.iy, "cm") + linhaProp("A<sub>v,z</sub>", pr.Avz, "cm²") + "</dl></div>" +
      '<div class="grupo-props"><h3>Eixo fraco z-z</h3><dl class="lista-props">' +
        linhaProp("I<sub>z</sub>", pr.Iz, "cm⁴") + linhaProp("W<sub>el,z</sub>", pr.Welz, "cm³") + linhaProp("W<sub>pl,z</sub>", pr.Wplz, "cm³") +
        linhaProp("i<sub>z</sub>", pr.iz, "cm") + linhaProp("y<sub>s</sub>", pr.ys, "cm", 2) + "</dl></div>" +
      '<div class="grupo-props"><h3>Torção (aprox.)</h3><dl class="lista-props">' +
        linhaProp("I<sub>t</sub>", pr.It, "cm⁴") + linhaProp("I<sub>w</sub>", pr.Iw / 1e3, "×10³ cm⁶") + linhaProp("y<sub>M</sub>", pr.eCorte, "cm", 2) + "</dl></div>" +
      "</div>";
  }

  function blocoEC3U(p, pr) {
    var tens = Seccao.tensoes(estado.aco, p.tf), fy = tens.fy, cl = Seccao.classificarU(p, fy);
    function classe(c) { return '<span class="classe' + (c === 4 ? " classe-4" : "") + '">' + c + "</span>"; }
    var W = cl.flexao <= 2 ? pr.Wply : pr.Wely, Wz = cl.banzo.classe <= 2 ? pr.Wplz : pr.Welz;
    function kN(v, un, nota, ok) {
      return !ok ? '<div class="valor-grande">—</div><p>Secção de classe 4: a resistência exige propriedades efetivas (EN 1993-1-5).</p>'
        : '<div class="valor-grande">' + fmt(v, 0) + " <small>" + un + "</small></div><p>" + nota + "</p>";
    }
    return '<section class="cartao"><h2>Verificação da secção · ' + estado.aco + "</h2>" +
      '<div class="ec3">' +
        '<div class="ec3-item"><h3>Aço</h3><div class="valor-grande">f<sub>y</sub> = ' + fy + " <small>MPa</small></div><p>f<sub>u</sub> = " + tens.fu + " MPa · t<sub>f</sub> = " + fmt(p.tf, 1) + " mm · ε = " + fmt(cl.eps, 3) + "</p></div>" +
        '<div class="ec3-item"><h3>Classe à flexão</h3><div class="valor-grande">' + classe(cl.flexao) + "</div><p>Banzo c/t = " + fmt(cl.banzo.c_t, 1) + " (c = b − t<sub>w</sub> − r) · Alma c/t = " + fmt(cl.alma.c_t, 1) + "</p></div>" +
        '<div class="ec3-item"><h3>Classe à compressão</h3><div class="valor-grande">' + classe(cl.compressao) + "</div><p>Alma comprimida: limites 33ε / 38ε / 42ε</p></div>" +
        '<div class="ec3-item"><h3>Flexão <span class="sym">M<sub>c,y,Rd</sub></span></h3>' + kN(W * fy / 1e3, "kN·m", (cl.flexao <= 2 ? "W<sub>pl,y</sub>" : "W<sub>el,y</sub>") + " · f<sub>y</sub> / γ<sub>M0</sub> (6.2.5)", cl.flexao <= 3) + "</div>" +
        '<div class="ec3-item"><h3>Flexão <span class="sym">M<sub>c,z,Rd</sub></span></h3>' + kN(Wz * fy / 1e3, "kN·m", (cl.banzo.classe <= 2 ? "W<sub>pl,z</sub>" : "W<sub>el,z</sub> mínimo") + " · f<sub>y</sub> / γ<sub>M0</sub>", cl.banzo.classe <= 3) + "</div>" +
        '<div class="ec3-item"><h3>Compressão <span class="sym">N<sub>pl,Rd</sub></span></h3>' + kN(pr.A * 1e2 * fy / 1e3, "kN", "A · f<sub>y</sub> / γ<sub>M0</sub>, sem encurvadura (6.2.4)", cl.compressao <= 3) + "</div>" +
        '<div class="ec3-item"><h3>Corte <span class="sym">V<sub>pl,z,Rd</sub></span></h3>' + kN(pr.Avz * 1e2 * fy / Math.sqrt(3) / 1e3, "kN", "A<sub>v,z</sub> = A − 2bt<sub>f</sub> + (t<sub>w</sub> + r)t<sub>f</sub> (6.2.6(3)c)", true) + "</div>" +
      "</div>" +
      '<p class="nota">O centro de corte fica fora da alma (y<sub>M</sub> a partir da linha média): uma carga aplicada no plano da alma provoca torção. Os valores acima não contam com essa torção nem com a encurvadura.</p>' +
      "</section>";
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

  // ----- Cantoneiras e perfis T -----
  // Desenho à escala a partir do contorno calculado (mm; no SVG o y cresce para baixo). Cantoneira com o dorso das abas
  // à esquerda e em baixo; T com o banzo em cima. Eixos y-y e z-z por G e, nas cantoneiras, os principais u-u e v-v.
  function desenhoLT(p, pr) {
    var L = p.tipo === "L", B = p.b, H = L ? p.a : p.h, M = Math.max(B, H), fs = M * 0.05, tr = fs * 0.35;
    var x0 = L ? 0 : -B / 2, xc = pr.xc, yc = -pr.yc, caixa = [x0, -H, x0 + B, 0];
    function junta(x, y) { caixa[0] = Math.min(caixa[0], x); caixa[1] = Math.min(caixa[1], y); caixa[2] = Math.max(caixa[2], x); caixa[3] = Math.max(caixa[3], y); }
    function traco(x, y) { return "M" + (x - tr) + " " + (y + tr) + "L" + (x + tr) + " " + (y - tr); }
    function texto(cls, x, y, t, extra) { junta(x - fs, y - fs); junta(x + fs, y + fs * 0.4); return '<text class="' + cls + '" x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" font-size="' + fs.toFixed(2) + '"' + (extra || "") + ">" + t + "</text>"; }
    var d = pr.contorno.map(function (q, i) { return (i ? "L" : "M") + q[0].toFixed(2) + " " + (-q[1]).toFixed(2); }).join("") + "Z";
    // Cota horizontal (b) em baixo na cantoneira e em cima no T; cota vertical (a ou h) à esquerda.
    var cb = L ? M * 0.16 : -H - M * 0.16, yb = L ? 0 : -H, sb = L ? 1 : -1, ch = x0 - M * 0.16;
    var cotas = "M" + x0 + " " + (yb + sb * M * 0.03) + "V" + (cb + sb * M * 0.03) + "M" + (x0 + B) + " " + (yb + sb * M * 0.03) + "V" + (cb + sb * M * 0.03) +
      "M" + x0 + " " + cb + "H" + (x0 + B) + "M" + (x0 - M * 0.03) + " " + (-H) + "H" + (ch - M * 0.03) + "M" + (x0 - M * 0.03) + " 0H" + (ch - M * 0.03) +
      "M" + ch + " " + (-H) + "V0" + traco(x0, cb) + traco(x0 + B, cb) + traco(ch, -H) + traco(ch, 0);
    junta(ch - M * 0.03, cb);
    var txt = texto("sec-txt", x0 + B / 2, L ? cb + fs * 1.1 : cb - fs * 0.45, fmt(B, 0), ' text-anchor="middle"');
    junta(ch - fs * 1.2, -H / 2);
    txt += '<text class="sec-txt" font-size="' + fs.toFixed(2) + '" text-anchor="middle" transform="translate(' + (ch - fs * 0.45).toFixed(2) + " " + (-H / 2).toFixed(2) + ') rotate(-90)">' + fmt(H, 0) + "</text>";
    // Espessura: junto à aba vertical da cantoneira, ou à alma do T.
    var xt = L ? p.t + M * 0.04 : p.t / 2 + M * 0.04, yt = L ? -H + M * 0.1 : -H * 0.3;
    txt += texto("sec-txt", xt, yt, "t " + fmt(p.t, p.t % 1 ? 1 : 0), ' font-style="italic"');
    var e = M * 0.08, eixos = "M" + (x0 - e) + " " + yc + "H" + (x0 + B + e) + "M" + xc + " " + (-H - e) + "V" + e;
    junta(x0 - e, yc); junta(x0 + B + e, yc); junta(xc, -H - e); junta(xc, e);
    txt += texto("sec-txt-eixo", x0 + B + M * 0.1, yc + fs * 0.35, "y") + texto("sec-txt-eixo", xc, L ? -H - M * 0.1 : e + fs * 1.1, "z", ' text-anchor="middle"');
    var principais = "";
    if (L) {
      var l = M * 0.45, c = Math.cos(pr.alfa), s = Math.sin(pr.alfa), lt = l + fs * 0.8;
      // u = (cos α, sen α) e v = (−sen α, cos α), com y para cima; no SVG o sinal de y troca.
      principais = "M" + (xc - l * c) + " " + (yc + l * s) + "L" + (xc + l * c) + " " + (yc - l * s) +
        "M" + (xc + l * s) + " " + (yc + l * c) + "L" + (xc - l * s) + " " + (yc - l * c);
      txt += texto("sec-txt-eixo-p", xc + lt * c, yc - lt * s + fs * 0.35, "u", ' text-anchor="middle"') +
        texto("sec-txt-eixo-p", xc - lt * s, yc - lt * c + fs * 0.35, "v", ' text-anchor="middle"');
    }
    var mg = M * 0.04, vb = [caixa[0] - mg, caixa[1] - mg, caixa[2] - caixa[0] + 2 * mg, caixa[3] - caixa[1] + 2 * mg];
    return '<svg viewBox="' + vb.map(function (v) { return v.toFixed(2); }).join(" ") + '" role="img" aria-label="Secção ' + p.nome + ' à escala">' +
      '<path class="sec-forma" d="' + d + '"/>' + (principais ? '<path class="sec-eixo-p" d="' + principais + '"/>' : "") +
      '<path class="sec-eixo" d="' + eixos + '"/><path class="sec-cota" d="' + cotas + '"/>' + txt + "</svg>";
  }

  var ORIGEM_RAIOS = {
    aba: "secção fora da lista da norma: raios da mesma aba",
    estimado: "aba que a norma não tem: raios estimados"
  };

  function blocoPropriedadesLT(p, pr) {
    var L = p.tipo === "L", iguais = p.familia === "Liguais";
    var geo = (L ? linhaProp("a", p.a, "mm", 0) + (iguais ? "" : linhaProp("b", p.b, "mm", 0)) : linhaProp("h", p.h, "mm", 0) + linhaProp("b", p.b, "mm", 0)) +
      linhaProp("t", p.t, "mm", p.t % 1 ? 1 : 0) + linhaProp("r<sub>1</sub>", p.r1, "mm", 1) + linhaProp("r<sub>2</sub>", p.r2, "mm", 2) +
      (L ? "" : linhaProp("r<sub>3</sub>", p.r3, "mm", 1)) + linhaProp("A", pr.A, "cm²") + linhaProp("G", pr.G, "kg/m", 2);
    var y = linhaProp("I<sub>y</sub>", pr.Iy, "cm⁴") + linhaProp("W<sub>el,y</sub>", pr.Wely, "cm³") + linhaProp("i<sub>y</sub>", pr.iy, "cm") +
      (L ? linhaProp("c<sub>z</sub>", pr.cz, "cm", 2) : linhaProp("e", pr.e, "cm", 2));
    var z = linhaProp("I<sub>z</sub>", pr.Iz, "cm⁴") + linhaProp("W<sub>el,z</sub>", pr.Welz, "cm³") + linhaProp("i<sub>z</sub>", pr.iz, "cm") +
      (L ? linhaProp("c<sub>y</sub>", pr.cy, "cm", 2) : "");
    var grupos = '<div class="grupo-props"><h3>Geometria</h3><dl class="lista-props">' + geo + "</dl></div>" +
      (iguais ? '<div class="grupo-props"><h3>Eixos y-y = z-z</h3><dl class="lista-props">' + y + "</dl></div>"
        : '<div class="grupo-props"><h3>Eixo y-y</h3><dl class="lista-props">' + y + "</dl></div>" +
          '<div class="grupo-props"><h3>Eixo z-z</h3><dl class="lista-props">' + z + "</dl></div>");
    if (L) {
      grupos += '<div class="grupo-props"><h3>Eixos principais</h3><dl class="lista-props">' +
        linhaProp("I<sub>u</sub>", pr.Iu, "cm⁴") + linhaProp("W<sub>el,u</sub>", pr.Welu, "cm³") + linhaProp("i<sub>u</sub>", pr.iu, "cm") +
        linhaProp("I<sub>v</sub>", pr.Iv, "cm⁴") + linhaProp("W<sub>el,v</sub>", pr.Welv, "cm³") + linhaProp("i<sub>v</sub>", pr.iv, "cm") +
        linhaProp("tg α", pr.tanAlfa, "", 3) + linhaProp("α", pr.alfa * 180 / Math.PI, "°", 1) + "</dl></div>";
    }
    return '<div class="grupos-props">' + grupos + "</div>";
  }

  // Primeira versão: classe à compressão e N_pl,Rd da secção (tração e compressão), sem flexão nem encurvadura.
  function blocoEC3LT(p, pr) {
    var L = p.tipo === "L", tens = Seccao.tensoes(estado.aco, p.t), fy = tens.fy, cl = Seccao.classificarLT(p, fy);
    var N = pr.A * 1e2 * fy / Seccao.GAMMA_M0 / 1e3;
    function classe(c) { return '<span class="classe' + (c === 4 ? " classe-4" : "") + '">' + c + "</span>"; }
    var regra = L
      ? "Abas em consola: c/t = " + fmt(cl.c_t, 1) + " (c = a − t − r<sub>1</sub>; 9ε / 10ε / 14ε). Cantoneira: h/t = " + fmt(cl.h_t, 1) +
        (cl.h_t <= 15 * cl.eps ? " ≤ " : " > ") + "15ε = " + fmt(15 * cl.eps, 1) + " e (b + h)/2t = " + fmt(cl.bh_2t, 1) +
        (cl.bh_2t <= 11.5 * cl.eps ? " ≤ " : " > ") + "11,5ε = " + fmt(11.5 * cl.eps, 1)
      : "Banzo c/t = " + fmt(cl.banzo.c_t, 1) + " (c = b/2 − t/2 − r<sub>1</sub>) · Alma c/t = " + fmt(cl.alma.c_t, 1) + " (c = h − t − r<sub>1</sub>); consolas: 9ε / 10ε / 14ε";
    var comp = cl.compressao <= 3
      ? '<div class="valor-grande">' + fmt(N, 0) + " <small>kN</small></div><p>A · f<sub>y</sub> / γ<sub>M0</sub> (6.2.4), sem encurvadura</p>"
      : '<div class="valor-grande">—</div><p>Secção de classe 4: a resistência exige a área efetiva (EN 1993-1-5), ainda não calculada.</p>';
    return '<section class="cartao"><h2>Verificação da secção · ' + estado.aco + "</h2>" +
      '<div class="ec3">' +
        '<div class="ec3-item"><h3>Aço</h3><div class="valor-grande">f<sub>y</sub> = ' + fy + " <small>MPa</small></div><p>f<sub>u</sub> = " + tens.fu +
          " MPa · t = " + fmt(p.t, p.t % 1 ? 1 : 0) + " mm (" + (tens.escalao[0] ? tens.escalao[0] + " < " : "") + "t ≤ " + tens.escalao[1] + ", " + Seccao.ACOS[estado.aco].norma + ") · ε = " + fmt(cl.eps, 3) + "</p></div>" +
        '<div class="ec3-item"><h3>Classe à compressão</h3><div class="valor-grande">' + classe(cl.compressao) + "</div><p>" + regra + "</p></div>" +
        '<div class="ec3-item"><h3>Tração <span class="sym">N<sub>pl,Rd</sub></span></h3><div class="valor-grande">' + fmt(N, 0) + " <small>kN</small></div><p>A · f<sub>y</sub> / γ<sub>M0</sub> (6.2.3(2)a), secção bruta</p></div>" +
        '<div class="ec3-item"><h3>Compressão <span class="sym">N<sub>c,Rd</sub></span></h3>' + comp + "</div>" +
      "</div>" +
      '<p class="nota">Primeira versão: sem flexão nem encurvadura' + (L ? " (a cantoneira isolada encurva em torno de v-v, com i<sub>v</sub> = " + fmt(pr.iv, 2) + " cm)" : "") +
        ". Na tração falta N<sub>u,Rd</sub> = 0,9 A<sub>net</sub> f<sub>u</sub> / γ<sub>M2</sub> (6.2.3(2)b), que depende da furação" +
        (L ? "; nas cantoneiras ligadas por uma só aba, ver a NP EN 1993-1-8, 3.10.3. A linha das cantoneiras do Quadro 5.2 não se aplica quando a cantoneira está em contacto contínuo com outros elementos." : ".") + "</p>" +
      "</section>";
  }

  // ----- Resultado: candidatos e perfil escolhido -----
  function descricaoMedidas(forma, m) {
    return FORMAS[forma].campos.filter(function (k) { return m[k.nome]; }).map(function (k) {
      return "<i>" + k.sim + "</i> = " + fmt(m[k.nome], m[k.nome] % 1 ? 1 : 0) + " mm";
    }).join(", ");
  }

  function resumo(c) {
    var p = c.perfil, d = c.dims;
    if (c.tipo === "I" || c.tipo === "U") return fmt(d.h, 0) + " × " + fmt(d.b, 0) + " · t<sub>w</sub> " + fmt(d.tw, 1) + " · t<sub>f</sub> " + fmt(d.tf, 1);
    if (c.tipo === "enf") return fmt(d.h, 0) + " × " + fmt(d.b, 0) + (d.a ? " · a " + fmt(d.a, 0) : "") + " · t " + fmt(d.t, 1) + " · " + fmt(c.G, 2) + " kg/m";
    return fmt(c.G, 2) + " kg/m" + (p.origem === "EN" ? "" : " · fora da " + PERFIS_LT[p.familia].norma);
  }

  function linhaCandidato(x, atual, qualquer) {
    var c = x.c, prox = Math.max(0, 1 - x.r.desvio / 0.15);
    return '<li><button type="button" class="candidato" data-nome="' + c.nome + '" aria-current="' + (c === atual.c) + '">' +
      '<span class="candidato-nome">' + c.nome + "</span>" +
      '<span class="candidato-dims">' + (qualquer ? '<span class="candidato-forma">' + FORMAS[c.forma].curto + "</span> " : "") + resumo(c) + "</span>" +
      '<span class="barra" title="Desvio médio ' + fmt(x.r.desvio * 100, 1) + ' %"><span style="width:' + (prox * 100).toFixed(0) + '%"></span></span>' +
      "</button></li>";
  }

  // Lista dos candidatos: com dois ou mais compatíveis, todos (até 12) e a medida que os distingue; senão, os mais próximos.
  function cartaoCandidatos(forma, lista, compat, m, atual) {
    var n = compat.length, mostrar = n >= 2 ? compat.slice(0, 12) : lista.slice(0, 6), med = descricaoMedidas(forma, m);
    var titulo = n >= 2 ? n + " perfis compatíveis" : "Perfis mais próximos";
    var sub = n >= 2 ? "Compatíveis com " + med + ", por ordem de desvio nas medidas introduzidas."
      : n === 1 ? "Só o primeiro é compatível com " + med + "."
      : "Nenhum perfil é compatível com " + med + ", dentro das tolerâncias de laminagem e de medição.";
    return '<section class="cartao"><h2>' + titulo + '</h2><p class="nota">' + sub + "</p>" +
      (n >= 2 ? '<p class="alerta">' + sugestao(forma, compat, m) + "</p>" : "") +
      '<ul class="candidatos">' + mostrar.map(function (x) { return linhaCandidato(x, atual, forma === "qualquer"); }).join("") + "</ul>" +
      (n > mostrar.length ? '<p class="nota">E mais ' + (n - mostrar.length) + ". Acrescente medidas para encurtar a lista.</p>" : "") +
      "</section>";
  }

  function selo(x, n, faltam) {
    if (!x.r.compativel) return x.r.desvio <= 0.08 ? { txt: "Próximo, fora da tolerância", cls: "selo-aviso" } : { txt: "Sem correspondência clara", cls: "selo-mau" };
    if (n > 1) return { txt: "Um de " + n + " compatíveis", cls: "selo-aviso" };
    if (faltam) return { txt: "Único compatível", cls: "selo-ok" };
    return avaliar(x.r.desvio);
  }

  // Cartão do perfil (cabeçalho, desenho e propriedades) e cartão das resistências, conforme o tipo.
  function cartoesDetalhe(x, n, faltam) {
    var c = x.c, p = c.perfil, sl = selo(x, n, faltam), descricao, figura, props, ec3, legenda = "Secção à escala, dimensões nominais em mm";
    if (c.tipo === "I") {
      var pr = Seccao.propriedades(p);
      descricao = PERFIS[p.familia].descricao; figura = desenho(p); props = blocoPropriedades(p, pr); ec3 = blocoEC3(p, pr);
    } else if (c.tipo === "U") {
      var pu = Seccao.propriedadesU(p);
      descricao = PERFIS_U[p.familia].descricao; figura = desenhoU(p, pu); props = blocoPropriedadesU(p, pu); ec3 = blocoEC3U(p, pu);
      if (p.inclinacao) legenda += "; faces interiores dos banzos com inclinação de " + fmt(p.inclinacao * 100, 0) + " %";
    } else if (c.tipo === "enf") {
      // Em "qualquer forma" o aço escolhido é de laminados: as madres O Feliz usam o seu (S350GD, se existir).
      var acos = Enformados.FAMILIAS[c.familia].acos, aco = acos.indexOf(estado.aco) >= 0 ? estado.aco : acos.indexOf("S350GD") >= 0 ? "S350GD" : acos[acos.length - 1];
      descricao = Enformados.FAMILIAS[c.familia].descricao; figura = desenhoEnformado(c.familia, p);
      props = blocoPropriedadesEnformado(c.familia, p, aco); ec3 = blocoEC3Enformado(c.familia, p, aco);
      legenda = "Secção à escala (linha média), dimensões nominais em mm";
    } else {
      var pl = Seccao.propriedadesLT(p);
      descricao = PERFIS_LT[p.familia].descricao + " · " + PERFIS_LT[p.familia].norma; figura = desenhoLT(p, pl); props = blocoPropriedadesLT(p, pl); ec3 = blocoEC3LT(p, pl);
      if (ORIGEM_RAIOS[p.origem]) legenda += "; " + ORIGEM_RAIOS[p.origem];
      if (c.tipo === "T") legenda += "; banzo e alma ligeiramente inclinados";
    }
    var desvios = '<div class="desvios">' + x.r.termos.map(function (t) {
      return "<span>" + t.campo.sim + " <b>" + fmt(t.p, t.p % 1 ? 1 : 0) + "</b> (" + fmtDelta(t.m - t.p) + " mm)</span>";
    }).join("") + "</div>";
    return '<section class="cartao">' +
        '<div class="cabeca-resultado"><h2 class="nome-perfil">' + c.nome + "</h2>" +
          '<span class="familia-perfil">' + descricao + "</span>" +
          '<span class="selo ' + sl.cls + '">' + sl.txt + "</span></div>" +
        desvios +
        '<div class="corpo-resultado">' +
          '<figure class="desenho">' + figura + "<figcaption>" + legenda + "</figcaption></figure>" + props +
        "</div>" +
      "</section>" + ec3;
  }

  function render() {
    var forma = estado.forma, m = lerMedidas(forma);
    if (!Object.keys(m).length) {
      resultado.innerHTML = '<section class="cartao"><p class="nota">Introduza pelo menos uma medida, em milímetros, para ver os perfis compatíveis. Cada medida a mais encurta a lista.</p></section>';
      return;
    }
    if (forma === "I" && !estado.familias.length) {
      resultado.innerHTML = '<section class="cartao"><p class="nota">Selecione pelo menos uma série de perfis.</p></section>';
      return;
    }
    var lista = procurar(forma, m), compat = lista.filter(function (x) { return x.r.compativel; });
    var atual = estado.escolhido && lista.filter(function (x) { return x.c.nome === estado.escolhido; })[0] || lista[0];
    var faltam = FORMAS[forma].campos.some(function (k) { return k.principal && !m[k.nome]; });
    var detalhe = cartoesDetalhe(atual, compat.length, faltam), cand = cartaoCandidatos(forma, lista, compat, m, atual);
    // Com vários compatíveis, a lista vem primeiro: ainda falta escolher.
    resultado.innerHTML = compat.length >= 2 ? cand + detalhe : detalhe + cand;
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

  function renderCatalogoU(fam) {
    $("catalogo-desc").textContent = fam + " · " + PERFIS_U[fam].descricao + " · dimensões segundo a EN 10365:2017 · I_t e I_w aproximados (paredes finas)";
    var upn = fam === "UPN";
    var colunas = [["Perfil", ""], ["h", "mm"], ["b", "mm"], ["t<sub>w</sub>", "mm"], ["t<sub>f</sub>", "mm"], [upn ? "r<sub>1</sub>" : "r", "mm"]].concat(upn ? [["r<sub>2</sub>", "mm"]] : []).concat([
      ["A", "cm²"], ["G", "kg/m"], ["I<sub>y</sub>", "cm⁴"], ["W<sub>pl,y</sub>", "cm³"], ["i<sub>y</sub>", "cm"],
      ["I<sub>z</sub>", "cm⁴"], ["W<sub>el,z</sub>", "cm³"], ["i<sub>z</sub>", "cm"], ["y<sub>s</sub>", "cm"], ["I<sub>t</sub>", "cm⁴"], ["I<sub>w</sub>", "×10³ cm⁶"]]);
    var cab = "<thead><tr>" + colunas.map(function (c) { return '<th scope="col">' + c[0] + (c[1] ? '<span class="un">' + c[1] + "</span>" : "") + "</th>"; }).join("") + "</tr></thead>";
    var corpo = TODOS_U.filter(function (p) { return p.familia === fam; }).map(function (p) {
      var pr = Seccao.propriedadesU(p);
      var v = [fmt(p.h, 0), fmt(p.b, 0), fmt(p.tw, 1), fmt(p.tf, 1), fmt(p.r, 1)].concat(upn ? [fmt(p.r2, 1)] : []).concat([fmt(pr.A), fmt(pr.G, 1),
        fmt(pr.Iy), fmt(pr.Wply), fmt(pr.iy), fmt(pr.Iz), fmt(pr.Welz), fmt(pr.iz), fmt(pr.ys, 2), fmt(pr.It), fmt(pr.Iw / 1e3)]);
      return '<tr data-nome="' + p.nome + '" data-familia="' + fam + '" tabindex="0"><td>' + p.nome + "</td><td>" + v.join("</td><td>") + "</td></tr>";
    }).join("");
    $("tabela-catalogo").innerHTML = cab + "<tbody>" + corpo + "</tbody>";
  }

  // Cantoneiras e T: propriedades calculadas (raios da norma; * fora da lista da norma).
  var ROTULOS_CATALOGO = { Liguais: "L iguais", Ldesiguais: "L desiguais", T: "T" };
  function renderCatalogoLT(fam) {
    var d = PERFIS_LT[fam], iguais = fam === "Liguais", desiguais = fam === "Ldesiguais";
    $("catalogo-desc").innerHTML = d.descricao + " · gama da Masterferro (S275JR) com os raios da " + d.norma +
      (fam === "T" ? " · forma ajustada aos valores publicados" : "") + " · * secção fora da lista da norma (raios da mesma aba ou estimados)";
    var colunas = iguais
      ? [["Perfil", ""], ["a", "mm"], ["t", "mm"], ["r<sub>1</sub>", "mm"], ["A", "cm²"], ["G", "kg/m"], ["c", "cm"], ["I<sub>y</sub> = I<sub>z</sub>", "cm⁴"],
        ["W<sub>el</sub>", "cm³"], ["i<sub>y</sub>", "cm"], ["I<sub>u</sub>", "cm⁴"], ["i<sub>u</sub>", "cm"], ["I<sub>v</sub>", "cm⁴"], ["i<sub>v</sub>", "cm"], ["W<sub>el,v</sub>", "cm³"]]
      : desiguais
      ? [["Perfil", ""], ["a", "mm"], ["b", "mm"], ["t", "mm"], ["r<sub>1</sub>", "mm"], ["A", "cm²"], ["G", "kg/m"], ["c<sub>z</sub>", "cm"], ["c<sub>y</sub>", "cm"],
        ["I<sub>y</sub>", "cm⁴"], ["W<sub>el,y</sub>", "cm³"], ["I<sub>z</sub>", "cm⁴"], ["W<sub>el,z</sub>", "cm³"], ["I<sub>u</sub>", "cm⁴"], ["I<sub>v</sub>", "cm⁴"], ["i<sub>v</sub>", "cm"], ["tg α", ""]]
      : [["Perfil", ""], ["h", "mm"], ["b", "mm"], ["t", "mm"], ["r<sub>1</sub>", "mm"], ["r<sub>2</sub>", "mm"], ["r<sub>3</sub>", "mm"], ["A", "cm²"], ["G", "kg/m"], ["e", "cm"],
        ["I<sub>y</sub>", "cm⁴"], ["W<sub>el,y</sub>", "cm³"], ["i<sub>y</sub>", "cm"], ["I<sub>z</sub>", "cm⁴"], ["W<sub>el,z</sub>", "cm³"], ["i<sub>z</sub>", "cm"]];
    var cab = "<thead><tr>" + colunas.map(function (c) { return '<th scope="col">' + c[0] + (c[1] ? '<span class="un">' + c[1] + "</span>" : "") + "</th>"; }).join("") + "</tr></thead>";
    var corpo = TODOS_LT.filter(function (p) { return p.familia === fam; }).map(function (p) {
      var pr = Seccao.propriedadesLT(p), t = fmt(p.t, p.t % 1 ? 1 : 0);
      var v = iguais
        ? [fmt(p.a, 0), t, fmt(p.r1, 1), fmt(pr.A), fmt(pr.G, 2), fmt(pr.cz, 2), fmt(pr.Iy), fmt(pr.Wely), fmt(pr.iy), fmt(pr.Iu), fmt(pr.iu), fmt(pr.Iv), fmt(pr.iv), fmt(pr.Welv)]
        : desiguais
        ? [fmt(p.a, 0), fmt(p.b, 0), t, fmt(p.r1, 1), fmt(pr.A), fmt(pr.G, 2), fmt(pr.cz, 2), fmt(pr.cy, 2), fmt(pr.Iy), fmt(pr.Wely), fmt(pr.Iz), fmt(pr.Welz), fmt(pr.Iu), fmt(pr.Iv), fmt(pr.iv), fmt(pr.tanAlfa, 3)]
        : [fmt(p.h, 0), fmt(p.b, 0), t, fmt(p.r1, 1), fmt(p.r2, 1), fmt(p.r3, 1), fmt(pr.A), fmt(pr.G, 2), fmt(pr.e, 2), fmt(pr.Iy), fmt(pr.Wely), fmt(pr.iy), fmt(pr.Iz), fmt(pr.Welz), fmt(pr.iz)];
      return '<tr data-nome="' + p.nome + '" data-familia="' + fam + '" tabindex="0"><td>' + p.nome + (p.origem === "EN" ? "" : " *") + "</td><td>" + v.join("</td><td>") + "</td></tr>";
    }).join("");
    $("tabela-catalogo").innerHTML = cab + "<tbody>" + corpo + "</tbody>";
  }

  function renderCatalogo() {
    var fam = estado.familiaCatalogo;
    if (FAMILIAS_U.indexOf(fam) >= 0) { renderCatalogoU(fam); return; }
    if (FAMILIAS_LT.indexOf(fam) >= 0) { renderCatalogoLT(fam); return; }
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
    var forma, valores, q;
    if (FAMILIAS_U.indexOf(familia) >= 0) {
      q = TODOS_U.filter(function (x) { return x.nome === nome; })[0];
      if (!q) return;
      forma = "U"; valores = { h: v(q.h), b: v(q.b), tw: v(q.tw), tf: v(q.tf) };
    } else if (FAMILIAS_OFELIZ.indexOf(familia) >= 0) {
      q = Enformados.seccoes(familia).filter(function (x) { return x.nome === nome; })[0];
      if (!q) return;
      forma = familia === "Superomega" ? "omega" : familia;
      valores = { h: v(q.h), b: v(q.b), t: v(q.t), a: q.a ? v(q.a) : undefined };
    } else if (FAMILIAS_LT.indexOf(familia) >= 0) {
      q = TODOS_LT.filter(function (x) { return x.nome === nome; })[0];
      if (!q) return;
      forma = familia;
      valores = q.tipo === "T" ? { h: v(q.h), b: v(q.b), t: v(q.t) } : familia === "Liguais" ? { a: v(q.a), t: v(q.t) } : { a: v(q.a), b: v(q.b), t: v(q.t) };
    } else {
      q = TODOS.filter(function (x) { return x.nome === nome; })[0];
      if (!q) return;
      forma = "I"; valores = { h: v(q.h), b: v(q.b), tw: v(q.tw), tf: v(q.tf) };
      if (estado.familias.indexOf(q.familia) === -1) {
        estado.familias.push(q.familia);
        document.querySelector('#fichas-familias input[value="' + q.familia + '"]').checked = true;
      }
    }
    trocarForma(forma, valores);
    estado.escolhido = nome;
    $("nota-exemplo").hidden = true;
    gravarIdentificar();
    mostrar("identificar");
    render();
    window.scrollTo(0, 0);
  }

  // Memória do Identificar: a forma, o aço e as medidas de cada forma.
  function gravarIdentificar() {
    guardarMedidasForma();
    Memoria.gravar("identificar", { campos: Memoria.doFormulario(form), medidas: estado.medidas, familias: estado.familias });
  }

  // ----- Vistas -----
  var VISTAS = ["identificar", "madres", "portico", "catalogo", "manual"];
  // O manual só existe no index.html gerado (src/manual.html é embutido por ferramentas/construir.js).
  function mostrar(vista, ancora) {
    if (!$("vista-" + vista)) return;
    VISTAS.forEach(function (v) {
      if (!$("vista-" + v)) return;
      $("vista-" + v).hidden = v !== vista;
      $("tab-" + v).setAttribute("aria-selected", String(v === vista));
    });
    try { history.replaceState(null, "", "#" + (ancora || vista)); } catch (e) { /* sem histórico disponível */ }
    Memoria.gravar("vista", vista);
  }

  // Ligações para uma secção do manual (href="#manual-…"), também a partir dos formulários.
  function abrirManual(id) {
    var alvo = $(id);
    if (!alvo) return;
    mostrar("manual", id);
    alvo.scrollIntoView();
  }

  // ----- Arranque -----
  function iniciar() {
    $("fichas-familias").innerHTML = FAMILIAS.map(function (f) {
      return '<label class="ficha"><input type="checkbox" value="' + f + '" checked>' + f + "</label>";
    }).join("");
    $("fichas-catalogo").innerHTML = FAMILIAS.concat(FAMILIAS_U, FAMILIAS_OFELIZ, FAMILIAS_LT).map(function (f) {
      return '<label class="ficha"><input type="radio" name="familia-catalogo" value="' + f + '"' + (f === estado.familiaCatalogo ? " checked" : "") + ">" + (ROTULOS_CATALOGO[f] || f) + "</label>";
    }).join("");
    atualizarForma("I", estado.aco);

    form.elements.h.value = EXEMPLO.h;
    form.elements.b.value = EXEMPLO.b;
    var padrao = Memoria.doFormulario(form);
    var guardado = Memoria.ler("identificar");
    function aplicar(v, familias, medidas) {
      Memoria.paraFormulario(form, v);
      // A lista das classes de aço e os campos dependem da forma guardada.
      atualizarForma(form.elements.forma.value, v.aco);
      estado.medidas = medidas || {};
      guardarMedidasForma();
      estado.familias = FAMILIAS.filter(function (f) { return !familias || familias.indexOf(f) !== -1; });
      Array.prototype.forEach.call(form.querySelectorAll("#fichas-familias input"), function (i) {
        i.checked = estado.familias.indexOf(i.value) !== -1;
      });
    }
    if (guardado) {
      aplicar(guardado.campos, guardado.familias, guardado.medidas);
      $("nota-exemplo").hidden = true;
    }
    $("repor-identificar").addEventListener("click", function () {
      aplicar(padrao, null, null);
      Memoria.apagar("identificar");
      estado.escolhido = null;
      $("nota-exemplo").hidden = false;
      render();
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function (e) {
      if (e.target.name === "aco") estado.aco = e.target.value;
      else if (e.target.name === "forma") trocarForma(e.target.value);
      else if (e.target.type === "checkbox") {
        estado.familias = Array.prototype.filter.call(form.querySelectorAll("#fichas-familias input"), function (i) { return i.checked; })
          .map(function (i) { return i.value; });
      } else {
        estado.escolhido = null;
        $("nota-exemplo").hidden = true;
      }
      gravarIdentificar();
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
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#manual-"]');
      if (!a) return;
      e.preventDefault();
      abrirManual(a.getAttribute("href").slice(1));
    });

    renderCatalogo();
    render();
    // Abre a vista do endereço; sem endereço (por exemplo, pelo ícone do ecrã principal), a última usada.
    var hash = location.hash.slice(1);
    if (/^manual-/.test(hash)) { abrirManual(hash); return; }
    var vista = VISTAS.indexOf(hash) >= 0 ? hash : Memoria.ler("vista");
    if (VISTAS.indexOf(vista) > 0) mostrar(vista);
  }

  iniciar();
  window.SteelFrames = { fmt: fmt, mostrar: mostrar, Memoria: Memoria };
})();
