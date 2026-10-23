/* Vista "Madres": formulário, esquiços e resultados. Depende de acoes.js, paineis.js, revestimento.js, madres.js e app.js. */
(function () {
  var fmt = window.SteelFrames.fmt, Memoria = window.SteelFrames.Memoria;
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
    { id: "painel", nome: "O painel escolhido abaixo (peso do fabricante)", g: null },
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
      distrito: form.elements.distrito.value, concelho: form.elements.concelho.value,
      terreno: form.elements.terreno.value, costa: form.elements.costa.checked,
      orografia: form.elements.orografia.value, c0Manual: num("c0"),
      oro: { H: num("oroH"), Lu: num("oroLu"), Ld: num("oroLd"), x: num("oroX") },
      cpiMax: num("cpiMax"), cpiMin: num("cpiMin"),
      aco: form.elements.aco.value,
      ligacao: form.elements.ligacao.value, sobreposicao: opcional("sobreposicao"),
      restricao: form.elements.restricao.value, fixacoes: num("fixacoes"), CD: num("cd"), apoio: num("apoio"),
      painel: form.elements.painel.value, painelFaces: form.elements.painelFaces.value,
      painelEspessura: parseInt(form.elements.painelEspessura.value, 10), painelApoio: form.elements.painelApoio.value,
      painelDesc: num("painelDesc"), painelAsc: num("painelAsc"), painelEscura: form.elements.painelEscura.checked
    };
  }

  // ----- Painel de revestimento (tabelas de cargas dos fabricantes, paineis.js) -----
  function nomePainel(n) { return n.replace("Topcover", "Topcover®").replace(/^PSG /, "Painel "); }

  function opcoesPainel() {
    var grupos = {};
    Object.keys(PAINEIS).forEach(function (n) {
      var f = PAINEIS[n].fabricante + (PAINEIS[n].indicativo ? " (valores indicativos)" : "");
      (grupos[f] = grupos[f] || []).push(n);
    });
    $("m-painel").innerHTML = '<option value="">Não verificar o painel</option>' + Object.keys(grupos).map(function (f) {
      return '<optgroup label="' + f + '">' + grupos[f].map(function (n) { return '<option value="' + n + '">' + nomePainel(n) + "</option>"; }).join("") + "</optgroup>";
    }).join("") + '<option value="manual">Outro painel: introduzir as cargas admissíveis</option>';
  }

  // Chapas e espessuras do painel escolhido; mantém as escolhidas quando existem.
  function opcoesDoPainel(produto, faces, espessura) {
    var p = PAINEIS[produto];
    if (!p) return;
    var lf = Object.keys(p.faces), f = lf.indexOf(faces) >= 0 ? faces : lf[lf.length - 1];
    $("m-painel-faces").innerHTML = lf.map(function (x) {
      return '<option value="' + x + '"' + (x === f ? " selected" : "") + ">" + (x === "não indicada" ? "Não indicadas na ficha" : x + " mm") + "</option>";
    }).join("");
    var le = p.espessuras.map(String), e = le.indexOf(String(espessura)) >= 0 ? String(espessura) : le.indexOf("40") >= 0 ? "40" : le[0];
    $("m-painel-espessura").innerHTML = le.map(function (x, i) {
      return '<option value="' + x + '"' + (x === e ? " selected" : "") + ">" + x + " mm · " + fmt(p.faces[f].pesos[i], 1) + " kg/m²</option>";
    }).join("");
  }

  // Peso do painel escolhido no formulário, em kN/m² (NaN sem painel de catálogo).
  function pesoPainel() {
    var kg = Revestimento.peso({ produto: form.elements.painel.value, faces: form.elements.painelFaces.value, espessura: form.elements.painelEspessura.value });
    return kg * 9.81 / 1000;
  }
  function kNm2(v) { return (Math.ceil(v * 100 - 1e-9) / 100).toFixed(2).replace(".", ","); }

  // Campo que pode ficar vazio (valor desconhecido): devolve 0 nesse caso.
  function opcional(nome) {
    return String(form.elements[nome].value).trim() === "" ? 0 : num(nome);
  }

  // Classes de aço disponíveis para cada tipo de madre.
  var ACOS_IPE = ["S235", "S275", "S355"];
  function opcoesAco(tipo, valor) {
    var lista = tipo === "IPE" ? ACOS_IPE : Enformados.FAMILIAS[tipo].acos;
    var padrao = tipo === "IPE" ? "S275" : "S350GD";
    var escolhido = lista.indexOf(valor) >= 0 ? valor : padrao;
    $("m-aco").innerHTML = lista.map(function (a) {
      return '<option value="' + a + '"' + (a === escolhido ? " selected" : "") + ">" + a + "</option>";
    }).join("");
  }

  // Distritos e concelhos para a zona de neve (NA–4.1(1) da NP EN 1991-1-3).
  function opcoesDistrito() {
    $("m-distrito").innerHTML = '<option value="">— escolher a zona à mão —</option>' +
      Object.keys(Acoes.NEVE_DISTRITOS).map(function (x) { return '<option value="' + x + '">' + x + "</option>"; }).join("");
  }
  function opcoesConcelho(distrito, valor) {
    var lista = Acoes.concelhosDistrito(distrito);
    var primeira = distrito === "Guarda" ? "Outro concelho do distrito" : "— escolher o concelho —";
    $("m-concelho").innerHTML = '<option value="">' + primeira + "</option>" + lista.map(function (x) {
      return '<option value="' + x + '"' + (x === valor ? " selected" : "") + ">" + x + "</option>";
    }).join("");
  }

  // Zona de neve pelo distrito e concelho, quando indicados; senão a escolhida à mão.
  function resolverNeve(d) {
    d.casoNeve = null;
    d.zonaPorConcelho = null;
    if (!d.distrito) return;
    var z = Acoes.zonaNeve(d.distrito, d.concelho);
    d.zonaPorConcelho = z.zona;
    if (z.zona) { d.zonaNeve = z.zona; d.casoNeve = z.caso; }
  }

  // c0 do local: 1 em terreno plano, pelo Anexo A.3 em colinas e escarpas, ou o valor introduzido.
  function resolverOrografia(d) {
    d.oroCalc = null;
    if (d.orografia === "manual") { d.c0 = d.c0Manual; return; }
    if (d.orografia !== "colina" && d.orografia !== "escarpa") { d.c0 = 1; return; }
    var o = d.oro, ok = o.H > 0 && o.Lu > 0 && isFinite(o.x) && (d.orografia === "escarpa" || o.Ld > 0) && d.meio > 0;
    if (!ok) { d.c0 = NaN; return; }
    d.oroCalc = Acoes.coeficienteOrografia({ tipo: d.orografia, H: o.H, Lu: o.Lu, Ld: o.Ld, x: o.x }, d.meio + ESPESSURA_COBERTURA);
    d.c0 = d.oroCalc.c0;
  }

  // Mostra só os campos que se aplicam ao tipo de madre, ao esquema e à restrição escolhidos.
  function atualizarCampos(d) {
    var enformado = d.tipo !== "IPE";
    $("m-grupo-enformados").hidden = !enformado;
    $("m-campos-continuidade").hidden = d.esquema === "simples";
    $("m-campo-sobreposicao").hidden = d.ligacao !== "sobreposicao";
    $("m-nota-sobreposicao").hidden = d.ligacao !== "sobreposicao";
    $("m-campo-fixacoes").hidden = d.restricao !== "chapa";
    $("m-campo-cd").hidden = d.restricao !== "cd";
    $("m-campo-apoio").hidden = d.tipo !== "Superomega";
    var nota = d.restricao === "nenhuma"
      ? "Sem contar com o revestimento, o banzo livre comprimido pela sucção só fica travado nos tirantes: as madres enformadas precisam, em geral, de tirantes ou de um C<sub>D</sub> justificado."
      : d.restricao === "chapa"
        ? "Válido com chapa trapezoidal de espessura nominal ≥ 0,66 mm, banzo de fixação ≤ 120 mm e no máximo uma fixação por onda (10.1.5.2(7)). " +
          (d.tipo === "Superomega" ? "No Superomega não se aplica: o banzo superior tem 44 mm e a fixação fica a menos de 25 mm da alma." : "")
        : "Rigidez de rotação da ligação revestimento–madre, por metro (10.1.5.2). Para painel sandwich, peça-a ao fabricante do painel.";
    $("m-nota-restricao").innerHTML = nota;

    // Neve: concelho só quando o distrito o exige; a zona fica fixa quando sai do concelho.
    var concelhos = Acoes.concelhosDistrito(d.distrito);
    $("m-campo-concelho").hidden = !concelhos.length;
    form.elements.zonaNeve.disabled = !!d.zonaPorConcelho;
    if (d.zonaPorConcelho) form.elements.zonaNeve.value = d.zonaPorConcelho;
    $("m-nota-neve").innerHTML = !d.distrito
      ? "Escolha o distrito para a zona sair do Anexo Nacional (NA–4.1(1)), ou indique-a à mão."
      : d.zonaPorConcelho
        ? "Zona " + d.zonaPorConcelho + " (NA–4.1(1)): distrito de " + d.distrito + (d.concelho ? ", concelho de " + d.concelho : "") + "."
        : "No distrito de " + d.distrito + " a zona depende do concelho.";

    // Orografia
    var a3 = d.orografia === "colina" || d.orografia === "escarpa";
    $("m-campos-orografia").hidden = !a3;
    $("m-campo-oro-ld").hidden = d.orografia !== "colina";
    $("m-campo-c0").hidden = d.orografia !== "manual";

    // Painel de revestimento
    $("m-campos-painel").hidden = !PAINEIS[d.painel];
    $("m-campos-painel-manual").hidden = d.painel !== "manual";
    $("m-campo-painel-escura").hidden = !d.painel;
    var o = d.oroCalc;
    $("m-nota-orografia").innerHTML = d.orografia === "plano"
      ? "Terreno plano: declive médio a barlavento inferior a 3° (NP EN 1991-1-4, 4.3.3(2))."
      : d.orografia === "manual"
        ? "Vales com afunilamento do vento ou orografia complexa: a norma remete para parecer técnico ou ensaio (A.3(4) e NA–4.3.3(1)). A app aceita um c<sub>0</sub> que esteja justificado."
        : (o ? "Φ = H/L<sub>u</sub> = " + fmt(o.phi, 3) + ", L<sub>e</sub> = " + fmt(o.Le, 0) + " m, " + o.seccao + ", s = " + fmt(o.s, 3) + " → <b>c<sub>0</sub> = " + fmt(o.c0, 3) + "</b> à altura z<sub>e</sub>. " : "") +
          "x é a distância horizontal do pavilhão à crista: negativa a barlavento, positiva a sotavento. Considere a direção do vento em que o relevo fica a barlavento.";
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
    if (d.orografia === "manual" && !(d.c0 >= 1 && d.c0 <= 2)) erros.push("O coeficiente de orografia c₀ tem de estar entre 1,0 e 2,0.");
    if ((d.orografia === "colina" || d.orografia === "escarpa") && !(d.c0 >= 1)) erros.push("Para o Anexo A.3 indique H e L<sub>u</sub> positivos" + (d.orografia === "colina" ? ", L<sub>d</sub> positivo" : "") + " e a distância à crista x.");
    if (d.distrito && !d.zonaPorConcelho) erros.push("Escolha o concelho: no distrito de " + d.distrito + " a zona de neve depende do concelho.");
    if (!(d.cpiMax >= d.cpiMin) || !(d.cpiMax >= -1.5 && d.cpiMax <= 1) || !(d.cpiMin >= -1.5 && d.cpiMin <= 1)) erros.push("Os coeficientes de pressão interior têm de estar entre −1,5 e +1,0, com o máximo maior ou igual ao mínimo.");
    if (d.esquema === "continua2" && d.comprimento < 2 * d.L) erros.push("Uma madre contínua de 2 vãos precisa de pelo menos 2 vãos entre pórticos (comprimento ≥ 2 L).");
    if (d.esquema === "continua3" && d.comprimento < 3 * d.L) erros.push("Uma madre contínua de 3 ou mais vãos precisa de pelo menos 3 vãos entre pórticos (comprimento ≥ 3 L).");
    if (d.altitudeAmbigua) erros.push("Escreva a altitude sem separador de milhares (por exemplo, 1200).");
    if (d.painel === "manual" && !(d.painelDesc > 0 && d.painelAsc > 0)) erros.push("Indique as cargas admissíveis do painel (descendente e ascendente), tiradas da tabela do fabricante para o vão s.");
    if (d.tipo !== "IPE") {
      if (d.esquema !== "simples" && d.ligacao === "sobreposicao" && !(d.sobreposicao >= 0 && d.sobreposicao <= d.L)) erros.push("O comprimento da sobreposição tem de estar entre 0 e o espaçamento entre pórticos (ou ficar vazio, se for desconhecido).");
      if (d.restricao === "chapa" && !(d.fixacoes >= 0.5 && d.fixacoes <= 10)) erros.push("O número de fixações por metro tem de estar entre 0,5 e 10.");
      if (d.restricao === "cd" && !(d.CD > 0 && d.CD <= 50)) erros.push("A rigidez C<sub>D</sub> tem de ser positiva (até 50 kN·m/m/rad).");
      if (d.tipo === "Superomega" && !(d.apoio >= 10 && d.apoio <= 400)) erros.push("A largura de apoio tem de estar entre 10 e 400 mm.");
    }
    return erros;
  }

  function calcular(d) {
    var a = d.alfa * Math.PI / 180;
    var hCumeeira = d.meio;
    // z_e = altura do topo da cobertura: altura medida à face inferior mais a espessura do revestimento,
    // tomada por excesso (painel e nervuras).
    var ze = d.meio + ESPESSURA_COBERTURA;
    var zonaVento = d.costa || d.altitude > 600 ? "B" : "A";
    var area = d.s * d.L;
    var vento = Acoes.vento(zonaVento, d.terreno, ze, d.alfa, d.posicao, area, [d.cpiMax, d.cpiMin], d.c0);
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
      // fy de cada IPE pela espessura do banzo (escalões da EN 10025-2).
      cfg.aco = d.aco;
      dim = Madres.dimensionar(IPE, cfg);
    } else {
      dim = Enformados.dimensionar(d.tipo, Object.assign(cfg, {
        aco: d.aco, ligacao: d.ligacao, sobreposicao: d.sobreposicao, restricao: d.restricao,
        fixacoes: d.fixacoes, CD: d.CD, apoio: d.apoio
      }));
    }
    return { d: d, hCumeeira: hCumeeira, ze: ze, zonaVento: zonaVento, area: area, vento: vento, neve: neve, cargas: cargas, comb: comb, dim: dim,
      painel: verificarPainel(d, ze, zonaVento, neve) };
  }

  /*
   * Painel de revestimento contra a tabela do fabricante, nas duas posições da cobertura (o mesmo painel cobre tudo).
   * Vão do painel = espaçamento entre madres; área carregada do vento = s × largura do painel.
   */
  function verificarPainel(d, ze, zonaVento, neve) {
    if (!d.painel) return null;
    var manual = d.painel === "manual";
    var sel = manual ? { manual: true, desc: d.painelDesc, asc: d.painelAsc, escura: d.painelEscura }
      : { produto: d.painel, faces: d.painelFaces, espessura: d.painelEspessura, apoio: d.painelApoio, escura: d.painelEscura };
    var largura = manual ? 1 : PAINEIS[d.painel].largura / 1000;
    var psiS = Acoes.psi0Neve(d.altitude), psiW = Acoes.PSI0.W;
    var posicoes = {};
    Object.keys(Acoes.POSICOES).forEach(function (pos) {
      posicoes[pos] = Revestimento.verificar(sel, d.s, function (sv) {
        var w = Acoes.vento(zonaVento, d.terreno, ze, d.alfa, pos, sv * largura, [d.cpiMax, d.cpiMin], d.c0);
        var a = Revestimento.acoes({ alfa: d.alfa, qk: d.qk, s: neve.s, wPressao: w.pressao.w, wSuccao: w.succao.w, psiS: psiS, psiW: psiW });
        a.vento = w;
        return a;
      });
    });
    var peso = manual ? NaN : Revestimento.peso(sel) * 9.81 / 1000;
    return { sel: sel, manual: manual, posicoes: posicoes, largura: largura, peso: peso,
      ok: posicoes.corrente.ok && posicoes.bordadura.ok, pesoInsuficiente: peso > d.gRev + 0.005 };
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

  // Madres enformadas a frio (EN 1993-1-3, 10.1)
  function kNm(v) { return fmt(Math.abs(v), 2); }
  var NOMES_EF = {
    seccao: { nome: "Flexão da secção", det: function (v) {
      return "M<sub>y,Ed</sub> = " + kNm(v.M) + " kN·m no " + v.onde + ", banzo " + v.banzo + " comprimido" +
        (v.Mz > 0.005 ? " · M<sub>z,Ed</sub> = " + kNm(v.Mz) : "") + (v.Mfz > 0.0005 ? " · M<sub>fz,Ed</sub> = " + fmt(v.Mfz, 3) + " kN·m no banzo livre" : "");
    } },
    banzoLivre: { nome: "Encurvadura do banzo livre", det: function (v) {
      return "M<sub>y,Ed</sub> = " + kNm(v.M) + " kN·m no " + v.onde + " · l<sub>fz</sub> = " + fmt(v.lfz / 1000, 2) + " m, R = " + fmt(v.R, 2) +
        ", λ̄<sub>fz</sub> = " + fmt(v.lambda, 2) + ", χ<sub>LT</sub> = " + fmt(v.chi, 3);
    } },
    corte: { nome: "Esforço transverso", det: function (v) {
      return "V<sub>Ed</sub> = " + fmt(v.V, 2) + " kN ≤ V<sub>b,Rd</sub> = " + fmt(v.VbRd, 1) + " kN" +
        (v.interacao > 0 ? " · interação com o momento (6.27): " + fmt(v.interacao * 100, 0) + " %" : "");
    } },
    apoio: { nome: "Reação no apoio (alma)", det: function (v) {
      return "F<sub>Ed</sub> = " + fmt(v.F, 2) + " kN, R<sub>w,Rd</sub> = " + fmt(v.Rw, 1) + " kN no " + v.onde + " (categoria " + v.categoria +
        ", l<sub>a</sub> = " + fmt(v.la, 0) + " mm)" + (v.M ? " · com M<sub>Ed</sub> = " + kNm(v.M) + " kN·m (6.28c)" : "") +
        (v.condicoes ? "" : " · fora das condições (6.17)");
    } },
    flecha: NOMES_VERIF.flecha,
    flechaVar: NOMES_VERIF.flechaVar
  };
  function nomes(d) { return d.tipo === "IPE" ? NOMES_VERIF : NOMES_EF; }

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
    var nome = nomes(r.d)[k].nome;
    function vazio(texto) {
      return '<li class="verif verif-nao"><span class="verif-nome">' + nome + '</span><span class="verif-u">—</span>' + barra(0) +
        '<span class="verif-det">' + texto + "</span></li>";
    }
    if (x.naoAplicavel) return vazio("Não se aplica: madre ligada à asna por esquadro aparafusado à alma (10.1.3.2(2)). Os parafusos e o esquadro não são verificados aqui.");
    if ((k === "bambeamento" || k === "banzoLivre") && !x.comb) return vazio("O banzo inferior não fica comprimido em nenhuma combinação.");
    return '<li class="verif"><span class="verif-nome">' + nome + '</span><span class="verif-u">' + fmt(x.u * 100, 0) + " %</span>" + barra(x.u) +
      '<span class="verif-det">' + nomes(r.d)[k].det(x) + " · " + nomeComb(r, x.comb) + "</span></li>";
  }

  function descricaoContinuidade(v) {
    if (v.continuidade === "nenhuma" || v.continuidade === "total") return "";
    if (v.continuidade === "total-sobreposicao") return ", sobreposição de " + fmt(v.sobreposicao, 2) + " m nos apoios";
    return ", continuidade parcial (sobreposição " + (v.sobreposicao ? "de " + fmt(v.sobreposicao, 2) + " m" : "de comprimento desconhecido") + ")";
  }

  function notaEnformado(v) {
    var p = v.p, rr = v.restricao, partes = [];
    partes.push(rr.tipo === "nenhuma"
      ? "Banzo livre sem restrição do revestimento (K = 0): travado só nos pórticos" + (v.verificacoes.banzoLivre.La ? " e nos tirantes, L<sub>a</sub> = " + fmt(v.verificacoes.banzoLivre.La / 1000, 2) + " m" : "") + "."
      : "Restrição do revestimento: C<sub>D</sub> = " + fmt(rr.CD / 1000, 3) + " kN·m/m/rad, K = " + fmt(rr.K * 1000, 3) + " N/mm por metro (10.13).");
    if (rr.nota) partes.push(rr.nota);
    partes.push("Banzo livre (com 1/5 da alma): A = " + fmt(p.livre.A, 0) + " mm², i<sub>fz</sub> = " + fmt(p.livre.i, 1) + " mm, k<sub>h</sub> = " +
      fmt(p.kh.gravidade, 3) + " (gravidade) e " + fmt(p.kh.succao, 3) + " (sucção).");
    if (p.delta) partes.push("Cantos arredondados: δ = " + fmt(p.delta, 4) + " (5.1(4)), aplicado às propriedades do catálogo.");
    partes.push("f<sub>yb</sub> = " + p.fy + " MPa, W<sub>eff,y</sub> = " + fmt(p.Wpos, 2) + " / " + fmt(p.Wneg, 2) + " cm³ (banzo superior / inferior comprimido), I<sub>eff</sub> = " + fmt(p.Ieff, 1) + " cm⁴.");
    return '<p class="nota">' + partes.join(" ") + "</p>";
  }

  function cartaoResultado(r, v) {
    var d = r.d, enformado = d.tipo !== "IPE";
    if (!v) {
      var maior = enformado ? Enformados.seccoes(d.tipo)[Enformados.seccoes(d.tipo).length - 1].nome : "IPE 600";
      return '<section class="cartao"><h2>Resultado</h2><p class="alerta">Nenhuma secção até à ' + maior + " verifica estas condições. Reduza o espaçamento entre pórticos ou entre madres, ou acrescente tirantes" +
        (enformado ? " ou a restrição do revestimento" : "") + ".</p>" + alertaPainel(r) + "</section>";
    }
    var N = nomes(d);
    var linhas = Object.keys(N).map(function (k) { return linhaVerif(r, k, v.verificacoes[k]); }).join("");
    var condiciona = Object.keys(v.verificacoes).reduce(function (a, b) { return v.verificacoes[a].u >= v.verificacoes[b].u ? a : b; });
    var nomeCond = N[condiciona].nome.toLowerCase();
    var kgm2 = v.props.G / d.s;
    var selo = !v.ok
      ? '<span class="selo selo-mau">Não verifica · ' + fmt(v.uMax * 100, 0) + " %</span>"
      : '<span class="selo selo-ok">Verifica · ' + fmt(v.uMax * 100, 0) + " %</span>";
    var manual = estado.escolhido && v !== r.dim.escolhido;
    var sub = enformado
      ? Enformados.FAMILIAS[d.tipo].descricao + " · " + v.aco + " · " + Madres.ESQUEMAS[d.esquema].nome.toLowerCase() + descricaoContinuidade(v)
      : d.aco + " · " + Madres.ESQUEMAS[d.esquema].nome.toLowerCase();
    var notaFinal = enformado
      ? notaEnformado(v)
      : '<p class="nota">Bambeamento: L<sub>cr</sub> = ' + fmt(v.Lseg, 2) + " m entre travamentos, C<sub>1</sub> = " + fmt(v.C1, 3) +
        ", M<sub>cr</sub> = " + fmt(v.Mcr, 1) + " kN·m, λ̄<sub>LT</sub> = " + fmt(v.lt.lambda, 2) + ", curva " + v.lt.curva +
        ", χ<sub>LT</sub> = " + fmt(v.lt.chi, 3) + ", M<sub>b,Rd</sub> = " + fmt(v.MbRd, 1) + " kN·m.</p>";
    return '<section class="cartao">' +
      '<div class="cabeca-resultado"><h2 class="nome-perfil">' + v.perfil.nome + "</h2>" +
        '<span class="familia-perfil">' + sub + "</span>" + selo + "</div>" +
      (manual ? '<p class="alerta">Secção escolhida à mão. ' + (r.dim.escolhido
        ? "A mais leve que verifica é a " + r.dim.escolhido.perfil.nome + "."
        : "Nenhuma secção da série verifica estas condições.") + "</p>" : "") +
      alertaPainel(r) +
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
      ? (d.costa ? "faixa costeira de 5 km" : "altitude superior a 600 m")
      : "generalidade do território";
    var DESLOCAMENTO = "deslocamento excecional da neve (Anexo B), que conta quando há platibandas, obstáculos na cobertura ou construções mais altas encostadas";
    var alertaNeve = d.zonaNeve !== "Z1" ? ""
      : d.casoNeve === "B3"
        ? '<p class="alerta">' + d.concelho + ": caso B3 do Quadro NA–A.1. O Anexo Nacional exige as situações acidentais de queda excecional de neve (C<sub>esl</sub> = 2,5) e de " + DESLOCAMENTO + ". Não estão incluídas aqui.</p>"
        : d.casoNeve === "B2"
          ? '<p class="alerta">Zona Z1, caso B2 do Quadro NA–A.1: o Anexo Nacional exige a situação acidental de ' + DESLOCAMENTO + ". Não está incluída aqui.</p>"
          : '<p class="alerta">Zona Z1: o Anexo Nacional (Quadro NA–A.1) exige situações acidentais que não estão incluídas aqui. ' +
            "Em todos os concelhos da zona Z1, o " + DESLOCAMENTO + ". " +
            "Em Aguiar da Beira, Fornos de Algodres, Mangualde, Nelas, Penalva do Castelo, Sátão e Viseu, também a queda excecional de neve, com C<sub>esl</sub> = 2,5.</p>";
    return '<section class="cartao"><h2>Ações</h2><div class="acoes">' +
      '<div class="acao"><h3>Permanentes</h3><p>Revestimento ' + fmt(d.gRev, 2) + " + instalações " + fmt(d.gInst, 2) +
        " = <b>" + fmt(d.gRev + d.gInst, 2) + " kN/m²</b> de cobertura, mais o peso próprio da madre.</p></div>" +
      '<div class="acao"><h3>Sobrecarga (categoria H)</h3><p>q<sub>k</sub> = <b>' + fmt(d.qk, 2) + " kN/m²</b> em projeção horizontal. Não se combina com a neve nem com o vento.<br>" +
        "Q<sub>k</sub> = <b>" + fmt(Acoes.SOBRECARGA_H.Qk, 1) + " kN</b> concentrada, verificada à parte, sem q<sub>k</sub> (6.3.4.2(3)P).</p></div>" +
      '<div class="acao"><h3>Neve · zona ' + d.zonaNeve + "</h3><p>" + (d.zonaPorConcelho ? d.distrito + (d.concelho ? ", " + d.concelho : "") + " (NA–4.1(1))<br>" : "") + "s<sub>k</sub> = C<sub>z</sub> [1 + (H/500)²] = " + fmt(Acoes.NEVE_CZ[d.zonaNeve], 2) +
        " × [1 + (" + fmt(d.altitude, 0) + "/500)²] = " + fmt(n.sk, 3) + " kN/m²<br>s = μ<sub>1</sub> C<sub>e</sub> C<sub>t</sub> s<sub>k</sub> = " +
        fmt(n.mu1, 2) + " × " + fmt(n.Ce, 1) + " × " + fmt(n.Ct, 1) + " × " + fmt(n.sk, 3) + " = <b>" + fmt(n.s, 3) + " kN/m²</b> em projeção horizontal</p></div>" +
      '<div class="acao"><h3>Vento · zona ' + r.zonaVento + "</h3><p>" + zonaNota + ": v<sub>b</sub> = " + p.vb + " m/s · terreno " + d.terreno +
        " · z<sub>e</sub> = " + fmt(r.hCumeeira, 2) + " + " + fmt(ESPESSURA_COBERTURA, 2) + " = " + fmt(r.ze, 2) + " m" + (p.z > r.ze ? " (inferior a z<sub>min</sub>: usa-se z = " + fmt(p.z, 0) + " m)" : "") +
        "<br>c<sub>r</sub> = " + fmt(p.cr, 3) + " · c<sub>0</sub> = " + fmt(p.c0, 3) + (d.oroCalc ? " (Anexo A.3, " + (d.orografia === "colina" ? "colina" : "escarpa") + ")" : d.orografia === "manual" ? " (estudo específico)" : "") + " · I<sub>v</sub> = " + fmt(p.Iv, 3) +
        " · q<sub>p</sub> = <b>" + fmt(p.qp, 3) + " kN/m²</b><br>Área carregada A = s × L = " + fmt(r.area, 1) + " m²<br>" +
        "Sucção: c<sub>pe</sub> = " + fmt(w.succao.cpe, 2) + " (zona " + w.succao.zona + ", θ = " + w.succao.direcao + "), c<sub>pi</sub> = " + coef(w.succao.cpi) +
        " → <b>" + fmt(w.succao.w, 3) + " kN/m²</b><br>" +
        "Pressão: c<sub>pe</sub> = " + fmt(w.pressao.cpe, 2) + " (zona " + w.pressao.zona + "), c<sub>pi</sub> = " + coef(w.pressao.cpi) +
        " → <b>" + fmt(w.pressao.w, 3) + " kN/m²</b></p></div>" +
      "</div>" +
      alertaNeve +
      '<h3 class="sub">Por metro de madre (espaçamento s = ' + fmt(d.s, 2) + ' m)</h3>' +
      '<div class="tabela-rolo tabela-baixa"><table class="tabela tabela-simples"><thead><tr><th scope="col">Ação</th><th scope="col"></th><th scope="col">Normal<span class="un">kN/m</span></th><th scope="col">No plano<span class="un">kN/m</span></th></tr></thead><tbody>' +
        linha("Permanentes (sem a madre)", "G", k.G) + linha("Sobrecarga", "Q", k.Q) + linha("Neve", "S", k.S) +
        linha("Vento em pressão", "W<sub>p</sub>", k.Wp) + linha("Vento em sucção", "W<sub>s</sub>", k.Ws) +
      "</tbody></table></div>" +
      '<p class="nota">Componente normal positiva para baixo. A componente no plano da cobertura é resistida pela madre em flexão em torno do eixo fraco, entre tirantes. ' +
        "A carga concentrada Q<sub>k</sub> decompõe-se em " + fmt(k.QP.n, 3) + " kN normal e " + fmt(k.QP.t, 3) + " kN no plano.</p>" +
      "</section>";
  }

  // ----- Painel de revestimento -----
  var NOMES_POSICAO = { corrente: "Zona corrente", bordadura: "Bordadura, cantos e cumeeira" };
  var NA_POSICAO = { corrente: "na zona corrente", bordadura: "nas bordaduras, cantos e cumeeira" };
  function pct(u) { return isFinite(u) ? fmt(u * 100, 0) + " %" : "—"; }

  function descricaoPainel(d) {
    if (d.painel === "manual") return "Painel definido pelo utilizador, com as cargas admissíveis da tabela do fabricante para s = " + fmt(d.s, 2) + " m";
    return PAINEIS[d.painel].fabricante + " · " + nomePainel(d.painel) + " de " + d.painelEspessura + " mm" +
      (d.painelFaces === "não indicada" ? "" : ", chapas " + d.painelFaces + " mm") + ", apoio " + (d.painelApoio === "simples" ? "simples (um só vão)" : "múltiplo");
  }

  // O que mudar quando o painel não cumpre: espaçamento máximo em cada posição e espessura mínima do mesmo painel.
  function sugestoesPainel(r) {
    var P = r.painel;
    if (P.manual) return "Reduza o espaçamento entre madres ou escolha um painel mais resistente.";
    var falham = Object.keys(P.posicoes).filter(function (k) { return !P.posicoes[k].ok; });
    var espacos = falham.map(function (k) {
      var v = P.posicoes[k];
      return v.sMax ? "madres a " + fmt(v.sMax, 2) + " m ou menos " + NA_POSICAO[k] : "nenhum vão da tabela serve " + NA_POSICAO[k];
    });
    var esp = falham.map(function (k) { return P.posicoes[k].espessuraMinima; });
    var minima = esp.indexOf(null) >= 0 ? null : Math.max.apply(null, esp);
    return "Para usar este painel: " + espacos.join("; ") + ". " +
      (minima ? "Ou, com o espaçamento atual, o mesmo painel com " + minima + " mm." : "Com o espaçamento atual, nenhuma espessura deste painel cumpre.");
  }

  function resumoPainel(r) {
    var P = r.painel, d = r.d;
    if (P.posicoes.corrente.semTabela) return "O fabricante só dá a tabela deste painel para vãos múltiplos: não há valores para um só vão entre duas madres.";
    var nome = P.manual ? "O painel" : nomePainel(d.painel) + " de " + d.painelEspessura + " mm";
    var indicativo = !P.manual && PAINEIS[d.painel].indicativo ? " (indicativa)" : "";
    if (P.ok) return nome + " cumpre a tabela" + indicativo + " do fabricante para madres a " + fmt(d.s, 2) + " m: utilização máxima " +
      pct(Math.max(P.posicoes.corrente.u, P.posicoes.bordadura.u)) + ", nas duas posições da cobertura.";
    var falham = Object.keys(P.posicoes).filter(function (k) { return !P.posicoes[k].ok; }).map(function (k) {
      var v = P.posicoes[k];
      return NA_POSICAO[k] + " (" + (isFinite(v.u) ? pct(v.u) : "vão não admitido") + ")";
    });
    return nome + " não cumpre a tabela" + indicativo + " do fabricante para madres a " + fmt(d.s, 2) + " m " + falham.join(" e ") + ". " + sugestoesPainel(r);
  }

  function alertaPainel(r) {
    var P = r.painel;
    if (!P) return "";
    return (P.ok ? "" : '<p class="alerta alerta-mau">Painel de revestimento: ' + resumoPainel(r) + "</p>") +
      (P.pesoInsuficiente ? '<p class="alerta">O peso do revestimento usado nas madres (' + fmt(r.d.gRev, 2) + " kN/m²) é inferior ao do painel escolhido (" + fmt(P.peso, 3) + " kN/m²).</p>" : "");
  }

  function linhaPainel(nome, x, det) {
    var u = x.adm === null ? Infinity : x.u;
    return '<li class="verif"><span class="verif-nome">' + nome + '</span><span class="verif-u">' + pct(u) + "</span>" + barra(isFinite(u) ? u : 2) +
      '<span class="verif-det">q = ' + fmt(x.q, 2) + " kN/m² · " +
      (x.adm === null ? "o fabricante não admite este vão" : "admissível " + fmt(x.adm, 2) + " kN/m²" + (x.vao ? " (tabela a " + fmt(x.vao, 2) + " m)" : "")) +
      " · " + det + "</span></li>";
  }

  function cartaoPainel(r) {
    var P = r.painel, d = r.d;
    if (!P) return "";
    var p = P.manual ? null : PAINEIS[d.painel];
    var cab = '<section class="cartao"><h2>Painel de revestimento</h2><p class="nota">' + descricaoPainel(d) +
      (isFinite(P.peso) ? " · " + fmt(P.peso * 1000 / 9.81, 1) + " kg/m²" : "") + "</p>";
    if (P.posicoes.corrente.semTabela) return cab + '<p class="alerta alerta-mau">' + resumoPainel(r) + "</p></section>";
    var corpo = Object.keys(P.posicoes).map(function (k) {
      var v = P.posicoes[k], a = v.acoes, w = a.vento.succao;
      return '<h3 class="sub">' + NOMES_POSICAO[k] + " · zonas " + Acoes.POSICOES[k].zonas.join(", ") + "</h3>" +
        '<ul class="verifs">' +
          linhaPainel("Carga descendente ▼", v.desc, a.desc.nome.toLowerCase()) +
          linhaPainel("Carga ascendente ▲", v.asc, "sucção com c<sub>pe</sub> = " + fmt(w.cpe, 2) + " (zona " + w.zona + "), c<sub>pi</sub> = " + coef(w.cpi) +
            ", A = " + fmt(d.s * P.largura, 2) + " m²") +
        "</ul>";
    }).join("");
    var c2 = Math.pow(Math.cos(d.alfa * Math.PI / 180), 2);
    var notas = [
      p ? (p.indicativo
        ? "Tabela " + p.fonte + ". <b>Valores indicativos:</b> a ficha não indica a espessura das chapas, o critério (ELU ou flecha) nem se as cargas são características. No 5 ondas, o site do fabricante dá, para 50 mm com chapas 0,5/0,5, valores até cerca de 20 % mais baixos do que a ficha. Confirme com o fabricante."
        : "Tabela " + p.fonte + ": cargas características admissíveis além do peso próprio e das variações diferenciais de temperatura, com os estados limites últimos e a flecha de serviço ≤ L/200.")
        : "Cargas admissíveis introduzidas pelo utilizador, para o vão s = " + fmt(d.s, 2) + " m.",
      "Ações características normais ao painel (NP EN 1990, 6.14b), com ψ<sub>0</sub> = " + fmt(Acoes.psi0Neve(d.altitude), 1) + " para a neve e " + fmt(Acoes.PSI0.W, 1) + " para o vento: " +
        "▼ o maior de q<sub>k</sub> cos²α, s cos²α + ψ<sub>0</sub> w<sub>p</sub> e w<sub>p</sub> + ψ<sub>0</sub> s cos²α (cos²α = " + fmt(c2, 3) + "); " +
        "▲ a sucção, com c<sub>pe</sub> para a área de um painel entre duas madres, A = s × " + fmt(P.largura, 2) + " m. O mesmo painel cobre toda a cobertura: verifica-se na zona corrente e nas bordaduras.",
      p ? "Sem interpolação: usa-se a carga do vão tabelado imediatamente acima de s, do lado da segurança" +
        (P.posicoes.corrente.abaixoDaTabela ? "; s é menor do que o primeiro vão da tabela (" + fmt(P.posicoes.corrente.vaoMin, 2) + " m), cujo valor se usa." : ".") : "",
      d.painelEscura ? "Face exterior de cor escura: carga ascendente admissível reduzida em 30 % (a O Feliz indica uma redução até cerca de 30 % nas menores espessuras, com a chapa a 80 °C)."
        : "Com a face exterior de cor escura, a carga ascendente admissível baixa (a O Feliz indica até cerca de 30 %): assinale a opção no formulário.",
      p && p.correcoes.length ? "Gralhas do catálogo corrigidas do lado da segurança: " + p.correcoes.join(" ") : "",
      "Não verificados: a carga concentrada Q<sub>k</sub> = " + fmt(Acoes.SOBRECARGA_H.Qk, 1) + " kN sobre o painel (circulação para manutenção), as fixações (arrancamento e número por madre na sucção) e a largura de apoio do painel na madre."
    ].filter(Boolean);
    return cab + alertaPainel(r) + corpo + '<ul class="hipoteses">' + notas.map(function (n) { return "<li>" + n + "</li>"; }).join("") + "</ul></section>";
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
      Ws: "1,0 G<sub>rev</sub> + 1,5 W<sub>s</sub>",
      QP: "1,35 G + 1,5 Q<sub>k</sub> (concentrada)"
    };
    var linhas = r.comb.elu.map(function (c) {
      var qn = c.qn + gM * c.gamaG * Math.cos(a), qt = c.qt + gM * c.gamaG * Math.sin(a);
      var es = Madres.esforcos(e, qn, c.qnQ || 0, L, c.Pn);
      return "<tr><th scope=\"row\">" + formulas[c.id] + "</th><td>" + fmt(qn, 3) + "</td><td>" + fmt(qt, 3) + "</td><td>" +
        fmt(es.mVao, 2) + "</td><td>" + (e.mApoio ? fmt(-es.mApoio, 2) : "—") + "</td><td>" + fmt(es.V, 2) + "</td></tr>";
    }).join("");
    return '<section class="cartao"><h2>Combinações de ações · ' + v.perfil.nome + "</h2>" +
      '<div class="tabela-rolo tabela-baixa"><table class="tabela tabela-simples"><thead><tr><th scope="col">ELU (NP EN 1990, 6.10)</th>' +
      '<th scope="col">q<sub>n,Ed</sub><span class="un">kN/m</span></th><th scope="col">q<sub>t,Ed</sub><span class="un">kN/m</span></th>' +
      '<th scope="col">M<sub>vão</sub><span class="un">kN·m</span></th><th scope="col">M<sub>apoio</sub><span class="un">kN·m</span></th><th scope="col">V<sub>Ed</sub><span class="un">kN</span></th></tr></thead><tbody>' +
      linhas + "</tbody></table></div>" +
      '<p class="nota">Inclui o peso próprio do ' + v.perfil.nome + " (" + fmt(gM, 3) + " kN/m). Momento positivo comprime o banzo superior. " +
        "Na linha de Q<sub>k</sub>, q<sub>n,Ed</sub> e q<sub>t,Ed</sub> são só as permanentes; os momentos e o corte incluem 1,5 Q<sub>k</sub> na posição mais desfavorável. " +
        "Para a flecha usam-se as combinações de ações distribuídas com coeficientes 1,0 (combinação característica); Q<sub>k</sub> é uma verificação local e não entra nas flechas.</p>" +
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
        '<span class="candidato-dims">' + fmt(x.props.G, 2) + " kg/m · " + (x.ok ? "verifica" : "não verifica") + " · " + nomes(r.d)[cond].nome.toLowerCase() + "</span>" +
        '<span class="candidato-u">' + (x.uMax > 9.99 ? ">999%" : fmt(x.uMax * 100, 0) + "\u00a0%") + "</span>" + barra(x.uMax) + "</button></li>";
    }).join("");
    var titulo = r.d.tipo === "IPE" ? "Perfis IPE comparados" : "Secções " + r.d.tipo + " comparadas";
    return '<section class="cartao"><h2>' + titulo + '</h2><ul class="candidatos">' + itens + "</ul></section>";
  }

  function hipotesesEnformados(r) {
    var d = r.d, F = Enformados.FAMILIAS[d.tipo], so = d.tipo === "Superomega";
    return "<li>Madres " + F.descricao + " em " + d.aco + ", com as propriedades efetivas do fabricante (EN 1993-1-3 e EN 1993-1-5). " +
        (so ? "Nas folhas de cálculo do fabricante, o I<sub>z</sub> do 120×1,5 e do 120×2,0 e o I<sub>t</sub> do 250×3,0 foram corrigidos pelo catálogo em PDF, coerente com a geometria do desenho."
          : "O catálogo calcula as propriedades com cantos vivos; aplica-se a redução δ da EN 1993-1-3, 5.1(4): A × (1 − δ), I e W × (1 − 2δ).") + "</li>" +
      "<li>Verificação pela EN 1993-1-3, 10.1: banzo superior travado pelo revestimento (10.1.1(5) e (6)); banzo inferior livre, com a carga lateral k<sub>h</sub> q da Figura 10.3, o momento M<sub>fz</sub> do Quadro 10.1 e a encurvadura pela 10.1.4.2 (Quadros 10.2a e 10.2b), com o banzo livre formado pelo banzo, o reforço e 1/5 da alma." +
        (so ? " Na ómega, simétrica e carregada no eixo, k<sub>h</sub> = 0." : "") + "</li>" +
      "<li>Restrição do revestimento: " + (r.dim.lista[0] && !r.dim.lista[0].restricao.valida ? "a regra C<sub>D,A</sub> = 130 p não se aplica a esta madre (fixação a menos de 25 mm da alma, 10.1.5.2(7)): usa-se K = 0."
        : d.restricao === "nenhuma" ? "nenhuma (K = 0), do lado da segurança." : d.restricao === "chapa" ? "C<sub>D,A</sub> = 130 p, p = " + fmt(d.fixacoes, 1) + " fixações por metro (10.1.5.2(7)), sem C<sub>D,C</sub>; K pela (10.13) com b<sub>mod</sub> = 2a + b e a fixação a meio do banzo." : "C<sub>D</sub> = " + fmt(d.CD, 2) + " kN·m/m/rad, indicado pelo fabricante do revestimento; K pela (10.13) com b<sub>mod</sub> = 2a + b.") + "</li>" +
      "<li>Sem o Anexo Nacional português da EN 1993-1-3, usam-se os valores recomendados: γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0 e χ<sub>LT</sub> do banzo livre pela EN 1993-1-1, 6.3.2.3, com a curva b, λ̄<sub>LT,0</sub> = 0,4 e β = 0,75 (nota de 10.1.4.2(1)).</li>" +
      (d.esquema !== "simples"
        ? "<li>Continuidade nos apoios intermédios: " + (d.ligacao === "continua" ? "madre contínua, sem emenda." :
          "sobreposição " + (d.sobreposicao ? "de " + fmt(d.sobreposicao, 2) + " m (medida)" : "de comprimento desconhecido") +
          ". Com 0,1 L ou mais para cada lado conta como contínua, com secção dupla no apoio e a secção simples verificada no fim da sobreposição; mais curta ou desconhecida, o vão verifica-se também como simplesmente apoiado e as flechas calculam-se assim (10.1.3.4). Nas sobreposições, o comprimento de encurvadura do banzo livre usa o Quadro 10.2a para 3 tirantes (10.1.4.2(3)).") + "</li>"
        : "") +
      "<li>Esforço transverso pela 6.1.5, com λ̄<sub>w</sub> da (6.10a) calculado com a altura desenvolvida da alma, e interação com o momento pela (6.27) com M<sub>f,Rd</sub> = 0.</li>" +
      (so
        ? "<li>Madre apoiada na asna pelas abas, sem esquadro: esmagamento da alma pela 6.1.7.3 (secções em ómega), categoria 1 nos apoios extremos (l<sub>a</sub> = 10 mm) e 2 nos intermédios (l<sub>a</sub> = largura de apoio, até 200 mm), e interação com o momento pela 6.1.11. É uma aproximação: as dobras da alma do Superomega não cumprem as condições da 6.1.7.4. A madre deve prolongar-se pelo menos 40 mm para lá do apoio.</li>"
        : "<li>Madre ligada à asna por esquadro aparafusado à alma: o esmagamento da alma não se verifica (10.1.3.2(2)).</li>") +
      "<li>Flechas com I<sub>eff</sub>, o menor dos dois sentidos da flexão, calculado pelo fabricante para f<sub>yb</sub> (do lado da segurança, 7.1(3)).</li>" +
      "<li>A componente da carga no plano da cobertura é resistida pela madre em flexão em torno de z (W<sub>z,eff</sub>) entre tirantes, somada às tensões da flexão principal (do lado da segurança).</li>" +
      "<li>Não verificados: ligações aparafusadas (emendas, apoios e arrancamento das fixações em sucção), esforço axial nas madres que servem de escoras do contraventamento" +
        (so ? " e o reforço do vão extremo, que o fabricante exige com 6 ou mais vãos" : "") + ".</li>";
  }

  function cartaoHipoteses(r) {
    var d = r.d;
    return '<section class="cartao"><h2>Hipóteses</h2><ul class="hipoteses">' +
      (d.tipo === "IPE"
        ? "<li>Madres de perfis IPE laminados, com o eixo forte normal à cobertura e o revestimento fixado ao banzo superior, que fica travado lateralmente. Esse travamento admite-se como na BB.2.1 da NP EN 1993-1-1: chapa trapezoidal ligada à madre em todas as nervuras, com rigidez de corte S que cumpra a expressão (BB.2). Com painel sandwich, ou com fixação pela crista, confirme essa rigidez com o fabricante do revestimento (ver também a EN 1993-1-3, 10.1.1(5)). Sem ela, o banzo superior comprimido sob a gravidade também tem de ser verificado ao bambeamento, o que a app não faz.</li>" +
          "<li>Bambeamento do banzo inferior verificado pelo caso geral da EC3 (6.3.2.2) entre travamentos (tirantes ou escoras), com z<sub>g</sub> = 0 e sem contar com a restrição do revestimento. São hipóteses do lado da segurança.</li>"
        : hipotesesEnformados(r)) +
      "<li>Madres contínuas: cargas permanentes, neve e vento em todos os vãos; a sobrecarga de cobertura nos vãos mais desfavoráveis (alternância).</li>" +
      "<li>Na combinação com o vento em sucção só o revestimento e a madre contam como carga permanente favorável; as instalações suspensas não.</li>" +
      "<li>Vento: c<sub>pe</sub> dos Quadros 7.2 e 7.4 da NP EN 1991-1-4 para as zonas " + Acoes.POSICOES[d.posicao].zonas.join(", ") +
        ", interpolados para A = s × L. c<sub>pi</sub> = " + coef(d.cpiMax) + " e " + coef(d.cpiMin) + ". Os valores +0,2 e −0,3 só valem sem face dominante (7.2.9(6)): com portões grandes que possam ficar abertos, c<sub>pi</sub> calcula-se pela 7.2.9(5). c<sub>s</sub>c<sub>d</sub> = 1.</li>" +
      "<li>Orografia: c<sub>0</sub> = " + fmt(d.c0, 3) + (d.oroCalc
          ? ", pelo Anexo A.3 (" + (d.orografia === "colina" ? "colina isolada ou em cadeia" : "falésia ou escarpa") + ", H = " + fmt(d.oro.H, 0) + " m, L<sub>u</sub> = " + fmt(d.oro.Lu, 0) + " m" +
            (d.orografia === "colina" ? ", L<sub>d</sub> = " + fmt(d.oro.Ld, 0) + " m" : "") + ", x = " + fmt(d.oro.x, 0) + " m, à altura z<sub>e</sub>), aplicado a todas as direções do vento (do lado da segurança). As expressões usam-se em todo o seu domínio, também onde a norma torna a orografia facultativa."
          : d.orografia === "manual" ? ", de estudo específico introduzido pelo utilizador."
          : ", válido em terreno plano (declive médio a barlavento inferior a 3°, 4.3.3(2)). Perto do topo de colinas, falésias ou escarpas, escolha o cálculo pelo Anexo A.3.") +
        " Vales com afunilamento e orografia complexa, para os quais a norma remete para parecer técnico ou ensaio, ficam fora do âmbito da app.</li>" +
      "<li>Sobrecarga: Q<sub>k</sub> = " + fmt(Acoes.SOBRECARGA_H.Qk, 1) + " kN concentrada, verificada à parte (6.3.4.2(3)P), em qualquer ponto do vão e na direção da gravidade.</li>" +
      "<li>Alturas medidas do pavimento à face inferior da cobertura. Para o vento, z<sub>e</sub> = altura a meio vão + " + fmt(ESPESSURA_COBERTURA, 2) + " m, uma espessura do revestimento tomada por excesso.</li>" +
      "<li>Neve sem acumulações junto a platibandas, desníveis ou edifícios contíguos, e sem as situações acidentais de neve excecional (Quadro NA–A.1).</li>" +
      (d.tipo === "IPE" ? "<li>f<sub>y</sub> de cada IPE pela EN 10025-2, conforme a espessura do banzo (NA–3.2.1(1) da NP EN 1993-1-1).</li>" : "") +
      (r.ze > 15 ? "<li><b>A altura do pavilhão (" + fmt(r.ze, 1) + " m) é superior a 15 m:</b> o valor c<sub>s</sub>c<sub>d</sub> = 1 deixa de estar garantido pela NP EN 1991-1-4, 6.2(1)a e tem de ser justificado.</li>" : "") +
      "<li>Os valores das ações, das combinações e do aço foram conferidos com o texto da NP EN 1990, NP EN 1991-1-1, 1991-1-3, 1991-1-4 e NP EN 1993-1-1, com os respetivos Anexos Nacionais.</li>" +
      "</ul></section>";
  }

  // O separador Pórtico usa a geometria, o local e as ações calculados aqui.
  function publicar(r) {
    window.SteelFrames.madres = r;
    document.dispatchEvent(new CustomEvent("madres:calculadas"));
  }

  function render() {
    var d = ler();
    d.alfa = inclinacao(d);
    $("m-inclinacao").innerHTML = (isFinite(d.alfa)
      ? "Inclinação calculada: <b>α = " + fmt(d.alfa, 1) + "°</b>\u00a0(" + fmt(Math.tan(d.alfa * Math.PI / 180) * 100, 1) + "\u00a0%). "
      : "") + "Alturas medidas do pavimento à face inferior da cobertura.";
    resolverNeve(d);
    resolverOrografia(d);
    atualizarCampos(d);
    var erros = validar(d);
    var zona = d.costa || d.altitude > 600 ? "B" : "A";
    $("m-zona-vento").innerHTML = "Zona de vento <b>" + zona + "</b> (v<sub>b,0</sub> = " + Acoes.VENTO_VB0[zona] + " m/s). A zona B aplica-se a menos de 5 km da costa ou acima de 600 m de altitude.";
    if (erros.length) {
      saida.innerHTML = '<section class="cartao"><h2>Dados por corrigir</h2><ul class="hipoteses">' + erros.map(function (e) { return "<li>" + e + "</li>"; }).join("") + "</ul></section>";
      notaPainel(null, d);
      publicar(null);
      return;
    }
    var r = calcular(d);
    publicar(r);
    notaPainel(r, d);
    var v = estado.escolhido && r.dim.lista.filter(function (x) { return x.perfil.nome === estado.escolhido; })[0] || r.dim.escolhido;
    saida.innerHTML = cartaoResultado(r, v) + cartaoEsquicos(r) + cartaoAcoes(r) + cartaoPainel(r) + cartaoCombinacoes(r, v) + cartaoComparacao(r, v) + cartaoHipoteses(r);
  }

  // Alerta do painel junto aos campos, logo ao escolher ou mudar o painel, o espaçamento ou as ações.
  function notaPainel(r, d) {
    var el = $("m-nota-painel"), falha = !!(r && r.painel && !r.painel.ok);
    el.className = "nota" + (falha ? " nota-mau" : "");
    el.innerHTML = !d.painel
      ? "Escolha o painel para comparar o espaçamento entre madres (vão do painel) e as ações com a tabela do fabricante."
      : !r ? "Corrija os dados para verificar o painel."
      : (d.painel === "manual" ? "Cargas características admissíveis, além do peso próprio, que a tabela do fabricante dá para o vão s = " + fmt(d.s, 2) + " m. " : "") + resumoPainel(r);
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
    opcoesAco("IPE", "S275");
    opcoesDistrito();
    opcoesConcelho("", "");
    opcoesPainel();
    form.elements.painel.value = "Topcover 5";
    opcoesDoPainel("Topcover 5", "0,5/0,4", 40);
    form.elements.grev.value = REVESTIMENTOS[0].g.toFixed(2).replace(".", ",");
    var padrao = Memoria.doFormulario(form);
    var guardado = Memoria.ler("madres");
    if (guardado) {
      Memoria.paraFormulario(form, guardado);
      // As listas de classes de aço, de concelhos e das chapas e espessuras do painel dependem do que foi guardado.
      opcoesAco(form.elements.tipo.value, guardado.aco);
      opcoesConcelho(form.elements.distrito.value, guardado.concelho);
      opcoesDoPainel(form.elements.painel.value, guardado.painelFaces, guardado.painelEspessura);
      $("m-nota-exemplo").hidden = true;
    }
    $("repor-madres").addEventListener("click", function () {
      Memoria.paraFormulario(form, padrao);
      opcoesAco(padrao.tipo, padrao.aco);
      opcoesConcelho(padrao.distrito, padrao.concelho);
      opcoesDoPainel(padrao.painel, padrao.painelFaces, padrao.painelEspessura);
      Memoria.apagar("madres");
      estado.escolhido = null;
      $("m-nota-exemplo").hidden = false;
      render();
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function (e) {
      if (e.target.name === "revestimento") {
        var rev = REVESTIMENTOS.filter(function (x) { return x.id === e.target.value; })[0];
        if (rev.g !== null) form.elements.grev.value = rev.g.toFixed(2).replace(".", ",");
        else if (rev.id === "painel" && pesoPainel() > 0) form.elements.grev.value = kNm2(pesoPainel());
        else form.elements.grev.focus();
      }
      if (e.target.name === "grev") form.elements.revestimento.value = "outro";
      // Ao escolher o painel, o peso do revestimento passa a ser o do fabricante.
      if (e.target.name === "painel" || e.target.name === "painelFaces" || e.target.name === "painelEspessura") {
        if (e.target.name !== "painelEspessura") opcoesDoPainel(form.elements.painel.value, form.elements.painelFaces.value, form.elements.painelEspessura.value);
        if (pesoPainel() > 0) {
          form.elements.revestimento.value = "painel";
          form.elements.grev.value = kNm2(pesoPainel());
        }
      }
      if (e.target.name === "tipo") opcoesAco(e.target.value, form.elements.aco.value);
      if (e.target.name === "distrito") opcoesConcelho(e.target.value, "");
      estado.escolhido = null;
      $("m-nota-exemplo").hidden = true;
      Memoria.gravar("madres", Memoria.doFormulario(form));
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
