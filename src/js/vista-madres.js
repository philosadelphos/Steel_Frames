/* Vista "Madres": formulário, esquiços e resultados. Depende de acoes.js, madres.js e app.js. */
(function () {
  var fmt = window.SteelFrames.fmt;
  var $ = function (id) { return document.getElementById(id); };
  var form = $("form-madres");
  var saida = $("resultado-madres");
  var IPE = Seccao.todos().filter(function (p) { return p.familia === "IPE"; });

  // Pesos indicativos, arredondados por excesso a partir de fichas de fabricantes (O Feliz, Kingspan,
  // Hiansa): painel sandwich 8,7 a 11,5 kg/m², chapa simples 4,5 a 7,4 kg/m², fibrocimento cerca de 14 kg/m².
  var REVESTIMENTOS = [
    { id: "sandwich40", nome: "Painel sandwich 40 mm", g: 0.10 },
    { id: "sandwich60", nome: "Painel sandwich 60 mm", g: 0.11 },
    { id: "sandwich80", nome: "Painel sandwich 80 mm", g: 0.12 },
    { id: "chapa", nome: "Chapa perfilada simples", g: 0.08 },
    { id: "chapadupla", nome: "Chapa dupla com isolamento", g: 0.15 },
    { id: "fibrocimento", nome: "Placas de fibrocimento", g: 0.18 },
    { id: "outro", nome: "Outro (introduzir o peso)", g: null }
  ];

  var ESPESSURA_COBERTURA = 0.15; // m, por excesso, para passar da face inferior ao topo da cobertura

  var estado = { escolhido: null };

  // ----- Leitura e cálculo -----
  function num(nome) {
    var txt = String(form.elements[nome].value).trim().replace(",", ".").replace("−", "-");
    var v = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(txt) ? parseFloat(txt) : NaN;
    return isFinite(v) ? v : NaN;
  }

  function ler() {
    return {
      largura: num("largura"), comprimento: num("comprimento"), beirado: num("beirado"), meio: num("meio"),
      L: num("vao"), s: num("espacamento"),
      tipo: form.elements.tipo.value,
      esquema: form.elements.esquema.value, tirantes: parseInt(form.elements.tirantes.value, 10),
      posicao: form.elements.posicao.value,
      gRev: num("grev"), gInst: num("ginst"), qk: num("qk"),
      altitude: num("altitude"), altitudeAmbigua: /^\d{1,3}[.,\s\u00a0\u202f]\d{3}$/.test(String(form.elements.altitude.value).trim()), zonaNeve: form.elements.zonaNeve.value, exposicao: form.elements.exposicao.value,
      terreno: form.elements.terreno.value, costa: form.elements.costa.checked, orografia: form.elements.orografia.checked,
      cpiMax: num("cpiMax"), cpiMin: num("cpiMin"),
      aco: form.elements.aco.value
    };
  }

  // Inclinação de cada água a partir das alturas no pilar e a meio vão (medidas do pavimento
  // à face inferior da cobertura).
  function inclinacao(d) {
    if (!(d.largura > 0) || !(d.beirado > 0) || !(d.meio >= d.beirado)) return NaN;
    return Math.atan((d.meio - d.beirado) / (d.largura / 2)) * 180 / Math.PI;
  }

  function validar(d) {
    var erros = [];
    function pos(v, nome) { if (!(v > 0)) erros.push(nome + " tem de ser um número positivo."); }
    pos(d.largura, "O vão do pórtico"); pos(d.comprimento, "O comprimento"); pos(d.beirado, "A altura no pilar");
    pos(d.meio, "A altura a meio vão");
    pos(d.L, "O espaçamento entre pórticos"); pos(d.s, "O espaçamento entre madres");
    function entre(v, min, max, nome, un) { if (v > 0 && !(v >= min && v <= max)) erros.push(nome + " tem de estar entre " + fmt(min, min % 1 ? 1 : 0) + " e " + fmt(max, 0) + " " + un + "."); }
    entre(d.largura, 3, 100, "O vão do pórtico", "m"); entre(d.comprimento, 3, 500, "O comprimento", "m");
    entre(d.beirado, 2, 40, "A altura no pilar", "m"); entre(d.meio, 2, 60, "A altura a meio vão", "m");
    entre(d.L, 1, 20, "O espaçamento entre pórticos", "m");
    entre(d.s, 0.3, 6, "O espaçamento entre madres", "m");
    if (d.L > 0 && d.comprimento > 0 && d.L > d.comprimento) erros.push("O espaçamento entre pórticos é maior do que o comprimento do pavilhão.");
    if (d.beirado > 0 && d.meio > 0 && d.meio < d.beirado) erros.push("A altura a meio vão não pode ser inferior à altura no pilar.");
    if (d.alfa > 30) erros.push("A inclinação resultante (" + fmt(d.alfa, 2) + "°) é superior a 30°, o limite desta verificação.");
    if (!(d.gRev >= 0) || !(d.gInst >= 0) || !(d.qk >= 0)) erros.push("As cargas têm de ser números iguais ou superiores a zero.");
    if (!(d.altitude >= 0 && d.altitude <= 1500)) erros.push("A altitude tem de estar entre 0 e 1500 m (limite da NP EN 1991-1-3).");
    if (d.largura > 0 && d.s > d.largura / 2) erros.push("O espaçamento entre madres é maior do que a meia largura do pavilhão.");
    if (!(d.cpiMax >= d.cpiMin) || !(d.cpiMax >= -1.5 && d.cpiMax <= 1) || !(d.cpiMin >= -1.5 && d.cpiMin <= 1)) erros.push("Os coeficientes de pressão interior têm de estar entre −1,5 e +1,0, com o máximo maior ou igual ao mínimo.");
    if (d.esquema === "continua2" && d.comprimento < 2 * d.L) erros.push("Uma madre contínua de 2 vãos precisa de pelo menos 2 vãos entre pórticos (comprimento ≥ 2 L).");
    if (d.esquema === "continua3" && d.comprimento < 3 * d.L) erros.push("Uma madre contínua de 3 ou mais vãos precisa de pelo menos 3 vãos entre pórticos (comprimento ≥ 3 L).");
    if (d.altitudeAmbigua) erros.push("Escreva a altitude sem separador de milhares (por exemplo, 1200).");
    return erros;
  }

  function calcular(d) {
    var a = d.alfa * Math.PI / 180;
    var hCumeeira = d.meio;
    // z_e = altura do topo da cobertura: altura medida à face inferior mais a espessura do revestimento,
    // tomada por excesso (painel e nervuras).
    var ze = d.meio + ESPESSURA_COBERTURA;
    var zonaVento = d.costa || d.orografia || d.altitude > 600 ? "B" : "A";
    var area = d.s * d.L;
    var vento = Acoes.vento(zonaVento, d.terreno, ze, d.alfa, d.posicao, area, [d.cpiMax, d.cpiMin]);
    var neve = Acoes.neve(d.zonaNeve, d.altitude, d.exposicao, d.alfa);
    var cargas = Acoes.cargasMadre({
      espacamento: d.s, alfa: d.alfa, gRev: d.gRev, gInst: d.gInst, qH: d.qk, s: neve.s,
      wPressao: vento.pressao.w, wSuccao: vento.succao.w
    });
    var comb = Acoes.combinacoes(cargas, d.altitude);
    var cfg = {
      L: d.L, esquema: d.esquema, tirantes: d.tirantes,
      cosAlfa: Math.cos(a), senAlfa: Math.sin(a), combELU: comb.elu, combELS: comb.els
    };
    var dim;
    if (d.tipo === "IPE") {
      // Todos os IPE têm tf ≤ 40 mm, por isso fy é o mesmo para toda a série (Quadro 3.1).
      cfg.fy = Seccao.tensoes(d.aco, 40).fy;
      dim = Madres.dimensionar(IPE, cfg);
    } else {
      dim = Madres.dimensionarOmegas(OMEGAS[d.tipo], cfg);
    }
    return { d: d, hCumeeira: hCumeeira, ze: ze, zonaVento: zonaVento, area: area, vento: vento, neve: neve, cargas: cargas, comb: comb, dim: dim };
  }

  // ----- Esquiços (unidades do SVG = metros) -----
  function seta(x1, y1, x2, y2, cab, cls) {
    var ang = Math.atan2(y2 - y1, x2 - x1), a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
    return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
      '<polygon class="' + cls + '-cab" points="' + x2 + "," + y2 + " " + (x2 + cab * Math.cos(a1)) + "," + (y2 + cab * Math.sin(a1)) +
      " " + (x2 + cab * Math.cos(a2)) + "," + (y2 + cab * Math.sin(a2)) + '"/>';
  }
  // O contorno da cor do fundo (paint-order) mantém o texto legível por cima das linhas.
  function texto(x, y, fs, conteudo, extra) {
    return '<text class="esq-txt" x="' + x + '" y="' + y + '" font-size="' + fs + '" stroke-width="' + fs * 0.28 + '"' + (extra || "") + ">" + conteudo + "</text>";
  }

  function posicoesMadres(pendente, s) {
    var lista = [];
    for (var x = 0; x < pendente - s * 0.25; x += s) lista.push(x);
    lista.push(pendente);
    return lista;
  }

  function esquicoPlanta(r) {
    var d = r.d, C = d.comprimento, W = d.largura, a = d.alfa * Math.PI / 180;
    var pendente = W / 2 / Math.cos(a);
    var M = Math.max(C, W), fs = M * 0.036, pad = M * 0.1;
    // Pórticos ao espaçamento L a partir da empena; o último vão fica com o que sobra.
    var xs = [];
    for (var xp = 0; xp < C - d.L * 0.05; xp += d.L) xs.push(xp);
    xs.push(C);
    var nPorticos = xs.length - 1;
    var madres = posicoesMadres(pendente, d.s);
    var g = "";
    // Faixa de influência da madre analisada
    var iMadre = d.posicao === "bordadura" ? 1 : Math.min(madres.length - 2, Math.max(1, Math.floor(madres.length / 2)));
    var yMadre = madres[iMadre] * Math.cos(a);
    var vao = d.posicao === "bordadura" ? 0 : Math.min(Math.floor(nPorticos / 2), nPorticos - 1);
    var x0 = xs[vao], x1 = xs[vao + 1];
    var meia = d.s * Math.cos(a) / 2;
    var yf0 = Math.max(0, yMadre - meia), yf1 = Math.min(W / 2, yMadre + meia);
    g += '<rect class="esq-faixa" x="' + x0 + '" y="' + yf0 + '" width="' + (x1 - x0) + '" height="' + (yf1 - yf0) + '"/>';
    // Madres nas duas águas
    madres.forEach(function (m) {
      [m * Math.cos(a), W - m * Math.cos(a)].forEach(function (y) {
        g += '<line class="esq-madre" x1="0" y1="' + y + '" x2="' + C + '" y2="' + y + '"/>';
      });
    });
    // Pórticos
    xs.forEach(function (x) {
      g += '<line class="esq-portico" x1="' + x + '" y1="0" x2="' + x + '" y2="' + W + '"/>';
    });
    g += '<line class="esq-cumeeira" x1="0" y1="' + W / 2 + '" x2="' + C + '" y2="' + W / 2 + '"/>';
    g += '<line class="esq-madre-ativa" x1="' + x0 + '" y1="' + yMadre + '" x2="' + x1 + '" y2="' + yMadre + '"/>';
    // Cotas
    var yc = W + pad * 0.45;
    g += '<path class="esq-cota" d="M' + x0 + " " + (W + pad * 0.15) + "V" + (yc + pad * 0.1) + "M" + x1 + " " + (W + pad * 0.15) + "V" + (yc + pad * 0.1) + "M" + x0 + " " + yc + "H" + x1 + '"/>';
    g += texto(Math.max((x0 + x1) / 2, -pad + fs * 3.4), yc + fs * 1.15, fs, "L = " + fmt(d.L, 2) + " m", ' text-anchor="middle"');
    var xs = C + pad * 0.35;
    g += '<path class="esq-cota" d="M' + C + " " + (yMadre - meia) + "H" + (xs + pad * 0.1) + "M" + C + " " + (yMadre + meia) + "H" + (xs + pad * 0.1) + "M" + xs + " " + (yMadre - meia) + "V" + (yMadre + meia) + '"/>';
    g += texto(xs + fs * 0.4, yMadre + fs * 0.35, fs, "s", "");
    g += texto(C / 2, W / 2 - fs * 0.4, fs * 0.85, "cumeeira", ' text-anchor="middle" fill-opacity="0.75"');
    if (W > fs * 4) g += texto(-pad * 0.2, W / 2, fs * 0.85, "empena", ' text-anchor="middle" transform="rotate(-90 ' + (-pad * 0.2) + " " + W / 2 + ')"');
    var vb = [-pad, -pad * 0.4, C + 2 * pad, W + pad * 1.6];
    return '<svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Planta da cobertura com a faixa de influência da madre">' + g + "</svg>";
  }

  function esquicoCorte(r) {
    var d = r.d, W = d.largura, hb = d.beirado, hc = r.hCumeeira, a = d.alfa * Math.PI / 180;
    var M = Math.max(W, hc), fs = M * 0.042, pad = M * 0.12;
    function Y(y) { return hc - y; }
    var g = "";
    g += '<line class="esq-solo" x1="' + (-pad * 0.5) + '" y1="' + Y(0) + '" x2="' + (W + pad * 0.5) + '" y2="' + Y(0) + '"/>';
    g += '<path class="esq-estrutura" d="M0 ' + Y(0) + "V" + Y(hb) + "L" + W / 2 + " " + Y(hc) + "L" + W + " " + Y(hb) + "V" + Y(0) + '"/>';
    var pendente = W / 2 / Math.cos(a);
    var madres = posicoesMadres(pendente, d.s);
    var lado = Math.max(W * 0.012, 0.12);
    var iMadre = d.posicao === "bordadura" ? 1 : Math.min(madres.length - 2, Math.max(1, Math.floor(madres.length / 2)));
    madres.forEach(function (m, i) {
      [[m * Math.cos(a), hb + m * Math.sin(a)], [W - m * Math.cos(a), hb + m * Math.sin(a)]].forEach(function (pt, lado2) {
        var ativa = lado2 === 0 && i === iMadre;
        // A linha da cobertura é a face inferior do revestimento: as madres ficam por baixo dela.
        var rot = (lado2 === 0 ? -1 : 1) * d.alfa;
        g += '<rect class="' + (ativa ? "esq-madre-sec-ativa" : "esq-madre-sec") + '" x="' + (pt[0] - lado) + '" y="' + Y(pt[1]) + '" width="' + 2 * lado + '" height="' + 2 * lado +
          '" transform="rotate(' + rot + " " + pt[0] + " " + Y(pt[1]) + ')"/>';
      });
    });
    // Cargas na madre analisada: gravidade para baixo, sucção para cima.
    var mx = madres[iMadre] * Math.cos(a), my = hb + madres[iMadre] * Math.sin(a);
    var comp = Math.max(hc * 0.22, fs * 2.5), cab = fs * 0.5;
    g += seta(mx - fs * 0.6, Y(my) - comp - 2 * lado, mx - fs * 0.6, Y(my) - 0.4 * lado, cab, "esq-seta-g");
    g += seta(mx + fs * 0.6, Y(my) - 0.4 * lado, mx + fs * 0.6, Y(my) - comp - 2 * lado, cab, "esq-seta-w");
    g += texto(mx - fs * 1.0, Y(my) - comp - 2 * lado - fs * 0.3, fs * 0.85, "G, Q, S", ' text-anchor="end"');
    g += texto(mx + fs * 1.0, Y(my) - comp - 2 * lado - fs * 0.3, fs * 0.85, "W sucção", "");
    // Cotas
    var yc = Y(0) + pad * 0.45;
    g += '<path class="esq-cota" d="M0 ' + (Y(0) + pad * 0.1) + "V" + (yc + pad * 0.1) + "M" + W + " " + (Y(0) + pad * 0.1) + "V" + (yc + pad * 0.1) + "M0 " + yc + "H" + W + '"/>';
    g += texto(W / 2, yc + fs * 1.15, fs, fmt(W, 1) + " m", ' text-anchor="middle"');
    var xc = -pad * 0.4;
    g += '<path class="esq-cota" d="M' + (-pad * 0.1) + " " + Y(0) + "H" + (xc - pad * 0.1) + "M" + (-pad * 0.1) + " " + Y(hb) + "H" + (xc - pad * 0.1) + "M" + xc + " " + Y(0) + "V" + Y(hb) + '"/>';
    g += texto(xc - fs * 0.35, Y(hb / 2), fs, fmt(hb, 2) + " m", ' text-anchor="middle" transform="rotate(-90 ' + (xc - fs * 0.35) + " " + Y(hb / 2) + ')"');
    var xh = W + pad * 0.45;
    g += '<path class="esq-cota" d="M' + (W / 2 + pad * 0.1) + " " + Y(hc) + "H" + (xh + pad * 0.1) + "M" + (W + pad * 0.1) + " " + Y(0) + "H" + (xh + pad * 0.1) + "M" + xh + " " + Y(0) + "V" + Y(hc) + '"/>';
    g += texto(xh + fs * 1.0, Y(hc / 2), fs, fmt(hc, 2) + " m", ' text-anchor="middle" transform="rotate(-90 ' + (xh + fs * 1.0) + " " + Y(hc / 2) + ')"');
    g += texto(W / 2, Y(hc) + fs * 2.4, fs * 0.85, "α = " + fmt(d.alfa, 1) + "°", ' text-anchor="middle"');
    var topo = comp + 2 * lado + fs * 1.6;
    // A etiqueta "G, Q, S" fica à esquerda da madre: alarga-se a margem quando a madre está junto ao beirado.
    var esquerda = Math.min(-pad, mx - fs * 4.8);
    var direita = Math.max(W + pad * 1.1, mx + fs * 6);
    var vb = [esquerda, -topo, direita - esquerda, hc + topo + pad];
    return '<svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Corte transversal do pavilhão com as cargas na madre">' + g + "</svg>";
  }

  // ----- Apresentação -----
  var NOMES_VERIF = {
    seccao: { nome: "Flexão da secção", det: function (v) { return "M<sub>y,Ed</sub> = " + fmt(v.My, 2) + " · M<sub>z,Ed</sub> = " + fmt(v.Mz, 2) + " kN·m"; } },
    bambeamento: { nome: "Bambeamento do banzo inferior", det: function (v) { return "M<sub>y,Ed</sub> = " + fmt(v.My, 2) + " kN·m com o banzo inferior comprimido"; } },
    corte: { nome: "Esforço transverso", det: function (v) { return "V<sub>Ed</sub> = " + fmt(v.V, 2) + " kN"; } },
    flecha: { nome: "Flecha total", det: function (v) { return fmt(v.d, 1) + " mm ≤ L/" + Madres.LIMITES_FLECHA.max + " = " + fmt(v.lim, 1) + " mm"; } },
    flechaVar: { nome: "Flecha das ações variáveis", det: function (v) { return fmt(v.d, 1) + " mm ≤ L/" + Madres.LIMITES_FLECHA.variaveis + " = " + fmt(v.lim, 1) + " mm"; } }
  };

  var NOMES_OMEGA = {
    seccao: { nome: "Tensões na secção bruta", det: function (v) {
      return "σ = " + fmt(v.sigma, 0) + " MPa " + (v.noApoio ? "sobre o apoio (secção sobreposta)" : "no vão") + " · limite f<sub>yb</sub>/γ<sub>M0</sub>";
    } }
  };

  // Coeficiente com sinal explícito e sinal de menos tipográfico (+0,20, −0,30).
  function coef(v) {
    if (Math.abs(v) < 0.005) v = 0;
    return (v > 0 ? "+" : "") + fmt(v, 2);
  }

  function nomeComb(r, id) {
    var c = r.comb.elu.filter(function (x) { return x.id === id; })[0];
    return c ? c.nome.toLowerCase() : "";
  }

  function barra(u) {
    var cls = u > 1 ? "mau" : u > 0.9 ? "aviso" : "ok";
    return '<span class="util util-' + cls + '"><span style="width:' + Math.min(100, u * 100).toFixed(0) + '%"></span></span>';
  }

  function linhaVerif(r, k, x) {
    var nome = (x.naoAvaliado || !r.d || r.d.tipo === "IPE") ? NOMES_VERIF[k].nome : (NOMES_OMEGA[k] || NOMES_VERIF[k]).nome;
    if (x.naoAvaliado) {
      return '<li class="verif verif-nao"><span class="verif-nome">' + nome + '</span><span class="verif-u">—</span>' + barra(0) +
        '<span class="verif-det">Não avaliado: exige as propriedades efetivas da secção (EN 1993-1-3), que o catálogo não dá.</span></li>';
    }
    if (k === "bambeamento" && !x.comb) {
      return '<li class="verif"><span class="verif-nome">' + nome + '</span><span class="verif-u">—</span>' + barra(0) +
        '<span class="verif-det">O banzo inferior não fica comprimido em nenhuma combinação.</span></li>';
    }
    var det = (r.d.tipo !== "IPE" && NOMES_OMEGA[k] ? NOMES_OMEGA[k] : NOMES_VERIF[k]).det(x);
    return '<li class="verif"><span class="verif-nome">' + nome + '</span><span class="verif-u">' + fmt(x.u * 100, 0) + " %</span>" + barra(x.u) +
      '<span class="verif-det">' + det + " · " + nomeComb(r, x.comb) + "</span></li>";
  }

  function cartaoResultado(r, v) {
    var d = r.d, omega = d.tipo !== "IPE";
    if (!v) {
      var maior = omega ? OMEGAS[d.tipo].seccoes[OMEGAS[d.tipo].seccoes.length - 1].nome : "IPE 600";
      return '<section class="cartao"><h2>Resultado</h2><p class="alerta">Nenhuma secção até à ' + maior + " verifica estas condições. Reduza o espaçamento entre pórticos ou entre madres" + (omega ? "." : ", ou acrescente tirantes.") + "</p></section>";
    }
    var linhas = Object.keys(NOMES_VERIF).map(function (k) { return linhaVerif(r, k, v.verificacoes[k]); }).join("");
    var condiciona = Object.keys(v.verificacoes).reduce(function (a, b) { return v.verificacoes[a].u >= v.verificacoes[b].u ? a : b; });
    var nomeCond = (omega && NOMES_OMEGA[condiciona] ? NOMES_OMEGA[condiciona] : NOMES_VERIF[condiciona]).nome.toLowerCase();
    var kgm2 = v.props.G / d.s;
    var selo = !v.ok
      ? '<span class="selo selo-mau">Não verifica · ' + fmt(v.uMax * 100, 0) + " %</span>"
      : omega ? '<span class="selo selo-aviso">Pré-seleção · ' + fmt(v.uMax * 100, 0) + " %</span>"
      : '<span class="selo selo-ok">Verifica · ' + fmt(v.uMax * 100, 0) + " %</span>";
    var manual = estado.escolhido && v !== r.dim.escolhido;
    var sub = omega
      ? OMEGAS[d.tipo].fabricante + " · " + OMEGAS[d.tipo].aco + " · " + Madres.ESQUEMAS[d.esquema].nome.toLowerCase() + (v.sobreposta ? ", sobreposta nos apoios" : "")
      : d.aco + " · " + Madres.ESQUEMAS[d.esquema].nome.toLowerCase();
    var notaFinal = omega
      ? '<p class="alerta">Pré-seleção com as propriedades da <b>secção bruta</b> do catálogo ' + OMEGAS[d.tipo].fabricante + ". As secções em ómega de paredes finas são de classe 4: a resistência real é inferior à da secção bruta e depende da encurvadura local e distorcional, que o catálogo não considera. As flechas também foram calculadas com o I<sub>y</sub> bruto, pelo que as reais serão maiores. Confirme a madre com as tabelas de carga ou as propriedades efetivas do fabricante (setor técnico da " + OMEGAS[d.tipo].fabricante + ").</p>"
      : '<p class="nota">Bambeamento: L<sub>cr</sub> = ' + fmt(v.Lseg, 2) + " m entre travamentos, C<sub>1</sub> = " + fmt(v.C1, 3) +
        ", M<sub>cr</sub> = " + fmt(v.Mcr, 1) + " kN·m, λ̄<sub>LT</sub> = " + fmt(v.lt.lambda, 2) + ", curva " + v.lt.curva +
        ", χ<sub>LT</sub> = " + fmt(v.lt.chi, 3) + ", M<sub>b,Rd</sub> = " + fmt(v.MbRd, 1) + " kN·m.</p>";
    return '<section class="cartao">' +
      '<div class="cabeca-resultado"><h2 class="nome-perfil">' + v.perfil.nome + "</h2>" +
        '<span class="familia-perfil">' + sub + "</span>" + selo + "</div>" +
      (manual ? '<p class="alerta">Secção escolhida à mão. ' + (r.dim.escolhido
        ? "A mais leve " + (omega ? "pré-selecionada" : "que verifica") + " é a " + r.dim.escolhido.perfil.nome + "."
        : "Nenhuma secção da série verifica estas condições.") + "</p>" : "") +
      '<div class="numeros">' +
        '<div><span class="valor-grande">' + fmt(v.props.G, 2) + " <small>kg/m</small></span><p>peso da madre</p></div>" +
        '<div><span class="valor-grande">' + fmt(kgm2, 1) + " <small>kg/m²</small></span><p>de cobertura, só em madres</p></div>" +
        '<div><span class="valor-grande">' + fmt(v.uMax * 100, 0) + " <small>%</small></span><p>condiciona: " + nomeCond + "</p></div>" +
      "</div>" +
      '<ul class="verifs">' + linhas + "</ul>" + notaFinal +
      "</section>";
  }

  function cartaoEsquicos(r) {
    return '<section class="cartao"><h2>Esquiços</h2><div class="esquicos">' +
      '<figure class="esquico">' + esquicoPlanta(r) + "<figcaption>Planta da cobertura: a faixa a cor é a área que descarrega na madre analisada (L × s).</figcaption></figure>" +
      '<figure class="esquico">' + esquicoCorte(r) + "<figcaption>Corte transversal, com as alturas no pilar e a meio vão medidas do pavimento. A gravidade comprime o banzo superior, travado pelo revestimento" +
        (r.d.esquema === "simples" ? "" : ", e também o banzo inferior sobre os apoios, por a madre ser contínua") +
        "; a sucção do vento comprime o banzo inferior, livre entre tirantes.</figcaption></figure>" +
      "</div></section>";
  }

  function cartaoAcoes(r) {
    var d = r.d, n = r.neve, w = r.vento, p = w.pico, k = r.cargas;
    function linha(nome, simbolo, x) {
      return "<tr><th scope=\"row\">" + nome + "</th><td>" + simbolo + "</td><td>" + fmt(x.n, 3) + "</td><td>" + fmt(x.t, 3) + "</td></tr>";
    }
    var zonaNota = r.zonaVento === "B"
      ? (d.costa ? "faixa costeira de 5 km" : d.orografia ? "exposição orográfica desfavorável" : "altitude superior a 600 m")
      : "generalidade do território";
    return '<section class="cartao"><h2>Ações</h2><div class="acoes">' +
      '<div class="acao"><h3>Permanentes</h3><p>Revestimento ' + fmt(d.gRev, 2) + " + instalações " + fmt(d.gInst, 2) +
        " = <b>" + fmt(d.gRev + d.gInst, 2) + " kN/m²</b> de cobertura, mais o peso próprio da madre.</p></div>" +
      '<div class="acao"><h3>Sobrecarga (categoria H)</h3><p>q<sub>k</sub> = <b>' + fmt(d.qk, 2) + " kN/m²</b> em projeção horizontal. Não se combina com a neve nem com o vento.</p></div>" +
      '<div class="acao"><h3>Neve · zona ' + d.zonaNeve + "</h3><p>s<sub>k</sub> = C<sub>z</sub> [1 + (H/500)²] = " + fmt(Acoes.NEVE_CZ[d.zonaNeve], 2) +
        " × [1 + (" + fmt(d.altitude, 0) + "/500)²] = " + fmt(n.sk, 3) + " kN/m²<br>s = μ<sub>1</sub> C<sub>e</sub> C<sub>t</sub> s<sub>k</sub> = " +
        fmt(n.mu1, 2) + " × " + fmt(n.Ce, 1) + " × " + fmt(n.Ct, 1) + " × " + fmt(n.sk, 3) + " = <b>" + fmt(n.s, 3) + " kN/m²</b> em projeção horizontal</p></div>" +
      '<div class="acao"><h3>Vento · zona ' + r.zonaVento + "</h3><p>" + zonaNota + ": v<sub>b</sub> = " + p.vb + " m/s · terreno " + d.terreno +
        " · z<sub>e</sub> = " + fmt(r.hCumeeira, 2) + " + " + fmt(ESPESSURA_COBERTURA, 2) + " = " + fmt(r.ze, 2) + " m" + (p.z > r.ze ? " (inferior a z<sub>min</sub>: usa-se z = " + fmt(p.z, 0) + " m)" : "") +
        "<br>c<sub>r</sub> = " + fmt(p.cr, 3) + " · I<sub>v</sub> = " + fmt(p.Iv, 3) +
        " · q<sub>p</sub> = <b>" + fmt(p.qp, 3) + " kN/m²</b><br>Área carregada A = s × L = " + fmt(r.area, 1) + " m²<br>" +
        "Sucção: c<sub>pe</sub> = " + fmt(w.succao.cpe, 2) + " (zona " + w.succao.zona + ", θ = " + w.succao.direcao + "), c<sub>pi</sub> = " + coef(w.succao.cpi) +
        " → <b>" + fmt(w.succao.w, 3) + " kN/m²</b><br>" +
        "Pressão: c<sub>pe</sub> = " + fmt(w.pressao.cpe, 2) + " (zona " + w.pressao.zona + "), c<sub>pi</sub> = " + coef(w.pressao.cpi) +
        " → <b>" + fmt(w.pressao.w, 3) + " kN/m²</b></p></div>" +
      "</div>" +
      (d.zonaNeve === "Z1" ? '<p class="alerta">Em alguns concelhos da zona Z1 (Aguiar da Beira, Fornos de Algodres, Mangualde, Nelas, Penalva do Castelo, Sátão e Viseu), o Anexo Nacional exige também a situação acidental de queda excecional de neve. Essa situação não está incluída aqui.</p>' : "") +
      '<h3 class="sub">Por metro de madre (espaçamento s = ' + fmt(d.s, 2) + ' m)</h3>' +
      '<div class="tabela-rolo tabela-baixa"><table class="tabela tabela-simples"><thead><tr><th scope="col">Ação</th><th scope="col"></th><th scope="col">Normal<span class="un">kN/m</span></th><th scope="col">No plano<span class="un">kN/m</span></th></tr></thead><tbody>' +
        linha("Permanentes (sem a madre)", "G", k.G) + linha("Sobrecarga", "Q", k.Q) + linha("Neve", "S", k.S) +
        linha("Vento em pressão", "W<sub>p</sub>", k.Wp) + linha("Vento em sucção", "W<sub>s</sub>", k.Ws) +
      "</tbody></table></div>" +
      '<p class="nota">Componente normal positiva para baixo. A componente no plano da cobertura é resistida pela madre em flexão em torno do eixo fraco, entre tirantes.</p>' +
      "</section>";
  }

  function cartaoCombinacoes(r, v) {
    if (!v) return "";
    var e = Madres.ESQUEMAS[r.d.esquema], L = r.d.L, a = r.d.alfa * Math.PI / 180;
    var gM = v.props.G * 9.81 / 1000;
    var psi = r.comb.psi0;
    var formulas = {
      Q: "1,35 G + 1,5 Q",
      S: "1,35 G + 1,5 S + 1,5 × " + fmt(psi.W, 1) + " W<sub>p</sub>",
      Wp: "1,35 G + 1,5 W<sub>p</sub> + 1,5 × " + fmt(psi.S, 1) + " S",
      Ws: "1,0 G<sub>rev</sub> + 1,5 W<sub>s</sub>"
    };
    var linhas = r.comb.elu.map(function (c) {
      var qn = c.qn + gM * c.gamaG * Math.cos(a), qt = c.qt + gM * c.gamaG * Math.sin(a);
      var es = Madres.esforcos(e, qn, c.qnQ || 0, L);
      return "<tr><th scope=\"row\">" + formulas[c.id] + "</th><td>" + fmt(qn, 3) + "</td><td>" + fmt(qt, 3) + "</td><td>" +
        fmt(es.mVao, 2) + "</td><td>" + (e.mApoio ? fmt(-es.mApoio, 2) : "—") + "</td><td>" + fmt(es.V, 2) + "</td></tr>";
    }).join("");
    return '<section class="cartao"><h2>Combinações de ações · ' + v.perfil.nome + "</h2>" +
      '<div class="tabela-rolo tabela-baixa"><table class="tabela tabela-simples"><thead><tr><th scope="col">ELU (NP EN 1990, 6.10)</th>' +
      '<th scope="col">q<sub>n,Ed</sub><span class="un">kN/m</span></th><th scope="col">q<sub>t,Ed</sub><span class="un">kN/m</span></th>' +
      '<th scope="col">M<sub>vão</sub><span class="un">kN·m</span></th><th scope="col">M<sub>apoio</sub><span class="un">kN·m</span></th><th scope="col">V<sub>Ed</sub><span class="un">kN</span></th></tr></thead><tbody>' +
      linhas + "</tbody></table></div>" +
      '<p class="nota">Inclui o peso próprio do ' + v.perfil.nome + " (" + fmt(gM, 3) + " kN/m). Momento positivo comprime o banzo superior. Para a flecha usam-se as mesmas combinações com coeficientes 1,0 (combinação característica).</p>" +
      "</section>";
  }

  function cartaoComparacao(r, v) {
    // Janela de 10 secções à volta da que está a ser mostrada (a escolhida ou a mais leve que verifica).
    var lista = r.dim.lista, i = lista.indexOf(v);
    if (i < 0) i = lista.reduce(function (m, x, k) { return x.uMax < lista[m].uMax ? k : m; }, 0);
    var inicio = Math.max(0, Math.min(i - 4, lista.length - 10));
    var itens = lista.slice(inicio, inicio + 10).map(function (x) {
      var cond = Object.keys(x.verificacoes).reduce(function (a, b) { return x.verificacoes[a].u >= x.verificacoes[b].u ? a : b; });
      return '<li><button type="button" class="candidato candidato-madre" data-nome="' + x.perfil.nome + '" aria-current="' + (x === v) + '">' +
        '<span class="candidato-nome">' + x.perfil.nome + "</span>" +
        '<span class="candidato-dims">' + fmt(x.props.G, 2) + " kg/m · " + (x.ok ? (x.omega ? "pré-seleção" : "verifica") : "não verifica") + " · " + ((x.omega && NOMES_OMEGA[cond]) ? NOMES_OMEGA[cond] : NOMES_VERIF[cond]).nome.toLowerCase() + "</span>" +
        '<span class="candidato-u">' + (x.uMax > 9.99 ? ">999%" : fmt(x.uMax * 100, 0) + "\u00a0%") + "</span>" + barra(x.uMax) + "</button></li>";
    }).join("");
    var titulo = r.d.tipo === "IPE" ? "Perfis IPE comparados" : "Secções " + r.d.tipo + " comparadas";
    return '<section class="cartao"><h2>' + titulo + '</h2><ul class="candidatos">' + itens + "</ul></section>";
  }

  function cartaoHipoteses(r) {
    var d = r.d;
    return '<section class="cartao"><h2>Hipóteses</h2><ul class="hipoteses">' +
      (d.tipo === "IPE"
        ? "<li>Madres de perfis IPE laminados, com o eixo forte normal à cobertura e o revestimento fixado ao banzo superior, que fica travado lateralmente.</li>" +
          "<li>Bambeamento do banzo inferior verificado pelo caso geral da EC3 (6.3.2.2) entre travamentos (tirantes ou escoras), com z<sub>g</sub> = 0 e sem contar com a restrição do revestimento. São hipóteses do lado da segurança.</li>"
        : "<li>Madres " + d.tipo + " (" + OMEGAS[d.tipo].fabricante + ", " + OMEGAS[d.tipo].aco + ", f<sub>yb</sub> = " + OMEGAS[d.tipo].fyb + " MPa) com as propriedades da secção bruta do catálogo. Nas madres contínuas, a secção sobreposta resiste ao momento sobre os apoios" + (OMEGAS[d.tipo].seccoes[0].sobreposta ? "" : " (sem dados de sobreposição neste catálogo, usa-se a secção simples)") + ".</li>" +
          "<li>Flechas calculadas com o I<sub>y</sub> bruto da secção simples. A componente no plano da cobertura é resistida por flexão em torno de z (W<sub>z,min</sub>) entre travamentos.</li>" +
          "<li>Não avaliados: encurvadura local e distorcional, bambeamento do banzo inferior sob sucção (EN 1993-1-3, 10.1), esforço transverso, esmagamento da alma nos apoios e ligações aparafusadas.</li>") +
      "<li>Madres contínuas: cargas permanentes, neve e vento em todos os vãos; a sobrecarga de cobertura nos vãos mais desfavoráveis (alternância).</li>" +
      "<li>Na combinação com o vento em sucção só o revestimento e a madre contam como carga permanente favorável; as instalações suspensas não.</li>" +
      (d.tipo !== "IPE" && d.esquema !== "simples" ? "<li>Sobreposição sobre os apoios de pelo menos " + (d.esquema === "continua2" ? "0,10 L" : "0,05 L") + " para cada lado. Com sobreposições menores, a secção simples no fim da sobreposição tem de ser verificada à parte.</li>" : "") +
      "<li>Vento: c<sub>pe</sub> dos Quadros 7.2 e 7.4 da NP EN 1991-1-4 para as zonas " + Acoes.POSICOES[d.posicao].zonas.join(", ") +
        ", interpolados para A = s × L. c<sub>pi</sub> = " + coef(d.cpiMax) + " e " + coef(d.cpiMin) + ". Os valores +0,2 e −0,3 só valem sem face dominante (7.2.9(6)): com portões grandes que possam ficar abertos, c<sub>pi</sub> calcula-se pela 7.2.9(5). c<sub>s</sub>c<sub>d</sub> = 1, c<sub>0</sub> = 1.</li>" +
      "<li>Alturas medidas do pavimento à face inferior da cobertura. Para o vento, z<sub>e</sub> = altura a meio vão + " + fmt(ESPESSURA_COBERTURA, 2) + " m, uma espessura do revestimento tomada por excesso.</li>" +
      "<li>Neve sem acumulações junto a platibandas, desníveis ou edifícios contíguos.</li>" +
      (r.ze > 15 ? "<li><b>A altura do pavilhão (" + fmt(r.ze, 1) + " m) é superior a 15 m:</b> o valor c<sub>s</sub>c<sub>d</sub> = 1 deixa de estar garantido pela NP EN 1991-1-4, 6.2(1)a e tem de ser justificado.</li>" : "") +
      "<li>Os coeficientes de pressão exterior foram conferidos com os Quadros 7.2, 7.4a e 7.4b da NP EN 1991-1-4. Os restantes valores dos Anexos Nacionais foram confirmados em fontes secundárias.</li>" +
      "</ul></section>";
  }

  function render() {
    var d = ler();
    d.alfa = inclinacao(d);
    $("m-inclinacao").innerHTML = (isFinite(d.alfa)
      ? "Inclinação calculada: <b>α = " + fmt(d.alfa, 1) + "°</b>\u00a0(" + fmt(Math.tan(d.alfa * Math.PI / 180) * 100, 1) + "\u00a0%). "
      : "") + "Alturas medidas do pavimento à face inferior da cobertura.";
    $("m-campo-aco").hidden = d.tipo !== "IPE";
    var erros = validar(d);
    var zona = d.costa || d.orografia || d.altitude > 600 ? "B" : "A";
    $("m-zona-vento").innerHTML = "Zona de vento <b>" + zona + "</b> (v<sub>b,0</sub> = " + Acoes.VENTO_VB0[zona] + " m/s). A zona B aplica-se a menos de 5 km da costa ou acima de 600 m de altitude.";
    if (erros.length) {
      saida.innerHTML = '<section class="cartao"><h2>Dados por corrigir</h2><ul class="hipoteses">' + erros.map(function (e) { return "<li>" + e + "</li>"; }).join("") + "</ul></section>";
      return;
    }
    var r = calcular(d);
    var v = estado.escolhido && r.dim.lista.filter(function (x) { return x.perfil.nome === estado.escolhido; })[0] || r.dim.escolhido;
    saida.innerHTML = cartaoResultado(r, v) + cartaoEsquicos(r) + cartaoAcoes(r) + cartaoCombinacoes(r, v) + cartaoComparacao(r, v) + cartaoHipoteses(r);
  }

  function iniciar() {
    $("m-esquema").innerHTML = Object.keys(Madres.ESQUEMAS).map(function (k) {
      return '<option value="' + k + '">' + Madres.ESQUEMAS[k].nome + "</option>";
    }).join("");
    $("m-posicao").innerHTML = Object.keys(Acoes.POSICOES).map(function (k) {
      return '<option value="' + k + '">' + Acoes.POSICOES[k].nome + " (zonas " + Acoes.POSICOES[k].zonas.join(", ") + ")</option>";
    }).join("");
    $("m-revestimento").innerHTML = REVESTIMENTOS.map(function (x) {
      return '<option value="' + x.id + '">' + x.nome + (x.g !== null ? " · " + fmt(x.g, 2) + " kN/m²" : "") + "</option>";
    }).join("");
    $("m-aco").innerHTML = ["S235", "S275", "S355"].map(function (a) {
      return '<option value="' + a + '"' + (a === "S275" ? " selected" : "") + ">" + a + "</option>";
    }).join("");
    form.elements.grev.value = REVESTIMENTOS[0].g.toFixed(2).replace(".", ",");

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function (e) {
      if (e.target.name === "revestimento") {
        var rev = REVESTIMENTOS.filter(function (x) { return x.id === e.target.value; })[0];
        if (rev.g !== null) form.elements.grev.value = rev.g.toFixed(2).replace(".", ",");
        else form.elements.grev.focus();
      }
      if (e.target.name === "grev") form.elements.revestimento.value = "outro";
      estado.escolhido = null;
      $("m-nota-exemplo").hidden = true;
      render();
    });
    saida.addEventListener("click", function (e) {
      var b = e.target.closest(".candidato-madre");
      if (!b) return;
      estado.escolhido = b.getAttribute("data-nome");
      render();
      var titulo = saida.querySelector(".nome-perfil");
      var topo = document.querySelector(".topo");
      if (titulo) {
        titulo.setAttribute("tabindex", "-1");
        titulo.focus({ preventScroll: true });
        window.scrollTo(0, saida.getBoundingClientRect().top + window.scrollY - (topo ? topo.offsetHeight : 0) - 12);
      }
    });
    render();
  }

  iniciar();
})();
