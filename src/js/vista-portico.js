/* Vista "Pórtico": pórtico de duas águas com bases encastradas. Depende de portico.js e do separador Madres. */
(function () {
  var fmt = window.SteelFrames.fmt, Memoria = window.SteelFrames.Memoria;
  var $ = function (id) { return document.getElementById(id); };
  var form = $("form-portico"), saida = $("resultado-portico");
  var TODOS = Seccao.todos();
  // Gamas consideradas: pilares e travessa entre 140 e 600 mm de altura.
  function serie(fam) { return TODOS.filter(function (p) { return p.familia === fam && p.h >= 140 && p.h <= 600; }); }

  var estado = { escolhido: null, desatualizado: true, temporizador: null, resultado: null, dados: null };

  function ler() {
    return {
      pilares: form.elements.pilares.value, travessa: form.elements.travessa.value, aco: form.elements.aco.value,
      escoras: parseInt(form.elements.escoras.value, 10), travPilar: parseInt(form.elements.travPilar.value, 10),
      posicao: form.elements.posicao.value
    };
  }

  // Dados do pórtico a partir do resultado do separador Madres.
  function dadosPortico(r, o) {
    var dm = r.d, madre = r.dim.escolhido;
    var gMadres = madre ? madre.props.G * 9.81 / 1000 / dm.s : 0.10;
    var zonas = Portico.zonasVento({ W: dm.largura, C: dm.comprimento, h: r.ze, L: dm.L, alfa: dm.alfa, posicao: o.posicao });
    return {
      g: { W: dm.largura, hb: dm.beirado, hc: dm.meio }, altitude: dm.altitude,
      travamentos: { pilar: o.travPilar, travessaEscoras: o.escoras, espacamentoMadres: dm.s },
      acoes: {
        L: dm.L, gRev: dm.gRev, gInst: dm.gInst, gMadres: gMadres, qk: dm.qk, s: r.neve.s, qp: r.vento.pico.qp,
        cpe: Acoes.cpeParedes(r.ze / dm.largura), cpi: [dm.cpiMax, dm.cpiMin], alfa: dm.alfa, zonas: zonas
      },
      madre: madre ? madre.perfil.nome : null, madres: r
    };
  }

  // ----- Apresentação -----
  function barra(u) {
    var cls = u > 1 ? "mau" : u > 0.9 ? "aviso" : "ok";
    return '<span class="util util-' + cls + '"><span style="width:' + Math.min(100, u * 100).toFixed(0) + '%"></span></span>';
  }
  // Nomes das combinações com os casos de vento por extenso.
  function nomeComb(v, nome) {
    return (nome || "").replace(/W(\d+)/g, function (_, i) { return v.nomesVento[+i] || "W"; });
  }
  var MEMBROS = { pilarE: "pilar esquerdo", pilarD: "pilar direito", travE: "travessa esquerda", travD: "travessa direita" };
  var DO_MEMBRO = { pilarE: "do pilar esquerdo", pilarD: "do pilar direito", travE: "da travessa esquerda", travD: "da travessa direita" };
  function kNm(x) { return fmt(Math.abs(x), 1); }
  function esforcos(x) {
    return "N<sub>Ed</sub> = " + fmt(Math.abs(x.N), 1) + " kN (" + (x.N < 0 ? "compressão" : "tração") + "), V<sub>Ed</sub> = " + fmt(Math.abs(x.V), 1) +
      " kN, M<sub>Ed</sub> = " + kNm(x.M) + " kN·m · classe " + x.classe + " · " + MEMBROS[x.membro];
  }
  function estabilidade(x) {
    if (x.classe === 4) return "Secção de classe 4 sob a compressão e a flexão do troço: fora do âmbito desta verificação · " + MEMBROS[x.membro];
    return "Troço " + fmt(x.troco[0], 2) + "–" + fmt(x.troco[1], 2) + " m " + DO_MEMBRO[x.membro] + ": N<sub>Ed</sub> = " + fmt(x.C, 1) +
      " kN, M<sub>Ed</sub> = " + kNm(x.M) + " kN·m · χ<sub>y</sub> = " + fmt(x.chiY, 3) + ", χ<sub>z</sub> = " + fmt(x.chiZ, 3) +
      " (L<sub>cr,z</sub> = " + fmt(x.Lcrz, 2) + " m), χ<sub>LT</sub> = " + fmt(x.chiLT, 3) + " (L<sub>cr</sub> = " + fmt(x.LcrLT, 2) + " m) · (6.61) " +
      fmt(x.u61 * 100, 0) + " %, (6.62) " + fmt(x.u62 * 100, 0) + " %";
  }
  var VERIF = {
    pilarSeccao: { nome: "Pilares · secção (6.2)", det: esforcos },
    pilarEstab: { nome: "Pilares · encurvadura e bambeamento (6.3.3)", det: estabilidade },
    travSeccao: { nome: "Travessa · secção (6.2)", det: esforcos },
    travEstab: { nome: "Travessa · encurvadura e bambeamento (6.3.3)", det: estabilidade },
    alfaCr: { nome: "Estabilidade global (α<sub>cr</sub> ≥ 3)", det: function (x) {
      return "α<sub>cr</sub> = " + fmt(x.alfaCr, 1) + (x.alfaCr >= 10 ? ": análise de 1.ª ordem (5.2.1(3))" : x.k ? ": amplificação " + fmt(x.k, 3) + " (5.2.2(5)B)" : ": é precisa uma análise de 2.ª ordem rigorosa");
    } },
    deslH: { nome: "Deslocamento horizontal do beirado", det: function (x) { return fmt(x.d, 1) + " mm ≤ h/150 = " + fmt(x.lim, 1) + " mm"; } },
    flecha: { nome: "Flecha na cumeeira", det: function (x) { return fmt(x.d, 1) + " mm ≤ vão/200 = " + fmt(x.lim, 1) + " mm"; } },
    flechaVar: { nome: "Flecha das ações variáveis", det: function (x) { return fmt(x.d, 1) + " mm ≤ vão/250 = " + fmt(x.lim, 1) + " mm"; } }
  };

  function cartaoResultado(v, dados, lista) {
    if (!v) {
      return '<section class="cartao"><h2>Resultado</h2><p class="alerta">Nenhum par de perfis das séries escolhidas verifica estas condições. Acrescente travamentos, escolha perfis mais robustos (HEB nos pilares) ou um aço de classe superior.</p></section>';
    }
    var linhas = Object.keys(VERIF).map(function (k) {
      var x = v.verificacoes[k];
      return '<li class="verif"><span class="verif-nome">' + VERIF[k].nome + '</span><span class="verif-u">' + (isFinite(x.u) ? fmt(x.u * 100, 0) + " %" : "—") + "</span>" + barra(isFinite(x.u) ? x.u : 2) +
        '<span class="verif-det">' + VERIF[k].det(x) + " · " + nomeComb(v, x.comb) + "</span></li>";
    }).join("");
    var cond = Object.keys(VERIF).reduce(function (a, b) { return v.verificacoes[a].u >= v.verificacoes[b].u ? a : b; });
    var selo = v.ok ? '<span class="selo selo-ok">Verifica · ' + fmt(v.uMax * 100, 0) + " %</span>" : '<span class="selo selo-mau">Não verifica · ' + (isFinite(v.uMax) ? fmt(v.uMax * 100, 0) + " %" : "classe 4") + "</span>";
    var g = dados.g, area = g.W * dados.acoes.L;
    var manual = estado.escolhido && lista.escolhido && v !== lista.escolhido;
    return '<section class="cartao">' +
      '<div class="cabeca-resultado"><h2 class="nome-perfil">' + v.pilar.perfil.nome + " + " + v.travessa.perfil.nome + "</h2>" +
        '<span class="familia-perfil">pilares + travessa · ' + v.aco + " · f<sub>y</sub> = " + v.pilar.fy + " / " + v.travessa.fy + " MPa</span>" + selo + "</div>" +
      (manual ? '<p class="alerta">Par escolhido à mão. O mais leve que verifica é ' + lista.escolhido.pilar.perfil.nome + " + " + lista.escolhido.travessa.perfil.nome + ".</p>" : "") +
      (v.axialSignificativo ? '<p class="alerta">A compressão na travessa é significativa (5.2.1(4)B, Nota 2B): a expressão (5.2) de α<sub>cr</sub> deixa de ser fiável. Confirme com uma análise de 2.ª ordem.</p>' : "") +
      '<div class="numeros">' +
        '<div><span class="valor-grande">' + fmt(v.peso, 0) + ' <small>kg</small></span><p>por pórtico (pilares e travessa)</p></div>' +
        '<div><span class="valor-grande">' + fmt(v.peso / area, 1) + ' <small>kg/m²</small></span><p>de cobertura, só no pórtico</p></div>' +
        '<div><span class="valor-grande">' + (isFinite(v.uMax) ? fmt(v.uMax * 100, 0) : "—") + ' <small>%</small></span><p>condiciona: ' + VERIF[cond].nome.replace(/<[^>]+>/g, "").toLowerCase() + "</p></div>" +
      "</div>" +
      '<ul class="verifs">' + linhas + "</ul>" +
      '<p class="nota">α<sub>cr</sub> mínimo = ' + fmt(v.alfaCrMin, 1) + " · imperfeição global φ = 1/" + fmt(1 / v.phi, 0) + " (5.3.2) · " +
        "comprimentos de encurvadura no plano iguais aos comprimentos reais (5.2.2(7)b): pilar " + fmt(g.hb, 2) + " m, travessa " + fmt(v.malha.comprimento.travessa, 2) + " m.</p>" +
      "</section>";
  }

  // Diagrama da envolvente dos momentos (ELU), desenhado do lado das fibras traccionadas.
  function cartaoDiagrama(v, dados) {
    var m = v.malha, g = dados.g, W = g.W, H = g.hc;
    // Envolvente simetrizada: o vento atua dos dois lados e os elementos de cada par são iguais.
    var n = v.envM.max.length, env = { max: new Float64Array(n), min: new Float64Array(n) }, maxAbs = 0;
    for (var i = 0; i < n; i++) {
      env.max[i] = Math.max(v.envM.max[i], v.envM.max[n - 1 - i]);
      env.min[i] = Math.min(v.envM.min[i], v.envM.min[n - 1 - i]);
      maxAbs = Math.max(maxAbs, Math.abs(env.max[i]), Math.abs(env.min[i]));
    }
    var esc = maxAbs > 0 ? 0.16 * W / maxAbs : 0;
    function Y(y) { return H - y; }
    var poligonos = { max: "", min: "" };
    var porMembro = {};
    m.elementos.forEach(function (e, k) {
      var a = m.nos[e.i], b = m.nos[e.j], nx = e.s, ny = -e.c;    // normal para o lado interior
      [0, 0.5, 1].forEach(function (t, q) {
        var x = a.x + t * (b.x - a.x), y = a.y + t * (b.y - a.y);
        (porMembro[e.membro] = porMembro[e.membro] || []).push({ x: x, y: y, nx: nx, ny: ny, max: env.max[3 * k + q], min: env.min[3 * k + q] });
      });
    });
    Object.keys(porMembro).forEach(function (id) {
      var pts = porMembro[id];
      ["max", "min"].forEach(function (lado) {
        var ida = pts.map(function (p) { return (p.x + p.nx * p[lado] * esc).toFixed(3) + "," + Y(p.y + p.ny * p[lado] * esc).toFixed(3); });
        var volta = pts.slice().reverse().map(function (p) { return p.x.toFixed(3) + "," + Y(p.y).toFixed(3); });
        poligonos[lado] += '<polygon class="dm-' + lado + '" points="' + ida.concat(volta).join(" ") + '"/>';
      });
    });
    var estrutura = "M0 " + Y(0) + "V" + Y(g.hb) + "L" + W / 2 + " " + Y(g.hc) + "L" + W + " " + Y(g.hb) + "V" + Y(0);
    var fs = Math.max(W, H) * 0.035;
    function rotulo(x, y, txt, ancora) { return '<text class="esq-txt" x="' + x + '" y="' + Y(y) + '" font-size="' + fs + '" stroke-width="' + fs * 0.28 + '" text-anchor="' + (ancora || "middle") + '">' + txt + "</text>"; }
    // Valores nos pontos principais (pilar esquerdo; o direito é simétrico na envolvente)
    var nE = m.elementos.length, kBase = 0, kBeirado = m.elementos.map(function (e) { return e.membro; }).lastIndexOf("pilarE"), kCum = m.elementos.map(function (e) { return e.membro; }).lastIndexOf("travE");
    function par(idx) { return fmt(env.min[idx], 0) + " / +" + fmt(Math.max(0, env.max[idx]), 0); }
    var txt = rotulo(-fs * 0.6, 0, par(3 * kBase), "end") + rotulo(-fs * 0.6, g.hb, par(3 * kBeirado + 2), "end") + rotulo(W / 2, g.hc + fs * 1.4, par(3 * kCum + 2));
    var pad = 0.22 * W;
    var vb = [-pad - fs * 4, -fs * 3, W + 2 * pad + fs * 4, H + fs * 3 + pad * 0.6];
    return '<section class="cartao"><h2>Momentos fletores · envolvente ELU</h2>' +
      '<figure class="esquico"><svg viewBox="' + vb.join(" ") + '" role="img" aria-label="Envolvente dos momentos fletores no pórtico">' +
        poligonos.max + poligonos.min + '<path class="esq-estrutura" d="' + estrutura + '"/>' +
        '<line class="esq-solo" x1="' + (-pad) + '" y1="' + Y(0) + '" x2="' + (W + pad) + '" y2="' + Y(0) + '"/>' + txt +
      "</svg><figcaption>Desenhados do lado das fibras traccionadas: a cor quente é a envolvente dos momentos que traccionam a face interior; a fria, a dos que traccionam a face exterior. Envolvente com o vento a soprar dos dois lados. Valores em kN·m (mínimo / máximo) na base, no beirado e na cumeeira.</figcaption></figure>" +
      "</section>";
  }

  function cartaoAcoes(v, dados) {
    var a = dados.acoes, z = a.zonas, cosA = Math.cos(a.alfa * Math.PI / 180);
    var pp = v.travessa.props.G * 9.81 / 1000, pc = v.pilar.props.G * 9.81 / 1000;
    var li = function (t) { return "<li>" + t + "</li>"; };
    return '<section class="cartao"><h2>Ações no pórtico (por metro, largura de influência L = ' + fmt(a.L, 2) + " m)</h2><ul class=\"hipoteses\">" +
      li("Permanentes: revestimento " + fmt(a.gRev, 2) + " + madres " + fmt(a.gMadres, 3) + (dados.madre ? " (" + dados.madre + ")" : " (valor por omissão)") + " + instalações " + fmt(a.gInst, 2) +
        " kN/m² → " + fmt((a.gRev + a.gMadres + a.gInst) * a.L, 2) + " kN/m de travessa; pesos próprios " + fmt(pp, 2) + " kN/m (travessa) e " + fmt(pc, 2) + " kN/m (pilares).") +
      li("Sobrecarga q<sub>k</sub> = " + fmt(a.qk, 2) + " kN/m² em projeção horizontal → " + fmt(a.qk * a.L * cosA, 2) + " kN/m de travessa, em todas as águas ou só numa.") +
      li("Neve s = " + fmt(a.s, 3) + " kN/m² → " + fmt(a.s * a.L * cosA, 2) + " kN/m de travessa: casos (i), (ii) e (iii) da Figura 5.3 (meia carga numa das águas).") +
      li("Vento: q<sub>p</sub> = " + fmt(a.qp, 3) + " kN/m², c<sub>pi</sub> = " + a.cpi.map(function (c) { return fmt(c, 1); }).join(" e ") +
        ". Paredes (Quadro 7.1, h/d = " + fmt(dados.madres.ze / dados.g.W, 2) + "): D = +" + fmt(a.cpe.D, 2) + ", E = " + fmt(a.cpe.E, 2) +
        "; a 90°, zona " + z.parede90 + " (" + fmt(a.cpe[z.parede90], 1) + "). Cobertura: e = " + fmt(z.e0, 1) + " m a 0° e " + fmt(z.e90, 1) + " m a 90°; " +
        (z.z0.plano ? "terraço (G, H, I)" : "a 0°, zona " + z.z0.barlavento[0][2] + " até e/10 do beirado e H na água de barlavento, J até e/10 da cumeeira e I na de sotavento") +
        "; a 90°, zona " + (z.z90 === "FG" ? "F e G" : z.z90) + ". Casos: " + v.nomesVento.join("; ") + ".") +
      li("Combinações: " + v.combinacoes.elu.length + " de ELU (NP EN 1990, 6.10) e " + v.combinacoes.els.length + " características. A sobrecarga não se combina com a neve nem com o vento.") +
      "</ul></section>";
  }

  function cartaoReacoes(v) {
    function linha(nome, R) {
      return "<tr><th scope=\"row\">" + nome + "</th>" + [0, 1, 2, 3, 4, 5].map(function (i) { return "<td>" + fmt(R[i], 1) + "</td>"; }).join("") + "</tr>";
    }
    var rr = v.reacoes;
    var corpo = linha("G (permanentes)", rr.G) + linha("Q (sobrecarga)", rr.Q) + linha("S (i)", rr.S) + linha("S (ii)", rr.Sii) + linha("S (iii)", rr.Siii) +
      v.nomesVento.map(function (n, i) { return linha(n, rr["W" + i]); }).join("") +
      linha("ELU máximo", v.envR.max) + linha("ELU mínimo", v.envR.min);
    return '<section class="cartao"><h2>Reações nas bases</h2>' +
      '<div class="tabela-rolo"><table class="tabela tabela-simples"><thead><tr><th scope="col">Ação (característica)</th>' +
      '<th scope="col">H<sub>E</sub><span class="un">kN</span></th><th scope="col">V<sub>E</sub><span class="un">kN</span></th><th scope="col">M<sub>E</sub><span class="un">kN·m</span></th>' +
      '<th scope="col">H<sub>D</sub><span class="un">kN</span></th><th scope="col">V<sub>D</sub><span class="un">kN</span></th><th scope="col">M<sub>D</sub><span class="un">kN·m</span></th></tr></thead><tbody>' +
      corpo + "</tbody></table></div>" +
      '<p class="nota">Forças dos apoios sobre o pórtico: H positivo para a direita, V positivo para cima, M positivo no sentido anti-horário. Vento a soprar da esquerda; com vento da direita, os valores trocam entre os apoios (com H e M de sinal contrário). As linhas de ELU são a envolvente das combinações, já com imperfeições e efeitos de 2.ª ordem.</p></section>';
  }

  function cartaoComparacao(lista, v) {
    var itens = lista.analisados.slice().sort(function (a, b) { return a.peso - b.peso; }).slice(0, 12).map(function (x) {
      var cond = Object.keys(VERIF).reduce(function (a, b) { return x.verificacoes[a].u >= x.verificacoes[b].u ? a : b; });
      var nome = x.pilar.perfil.nome + " + " + x.travessa.perfil.nome;
      return '<li><button type="button" class="candidato candidato-portico" data-nome="' + nome + '" aria-current="' + (x === v) + '">' +
        '<span class="candidato-nome">' + nome + "</span>" +
        '<span class="candidato-dims">' + fmt(x.peso, 0) + " kg · " + (x.ok ? "verifica" : "não verifica") + " · " + VERIF[cond].nome.replace(/<[^>]+>/g, "").toLowerCase() + "</span>" +
        '<span class="candidato-u">' + (isFinite(x.uMax) ? (x.uMax > 9.99 ? ">999%" : fmt(x.uMax * 100, 0) + " %") : "—") + "</span>" + barra(isFinite(x.uMax) ? x.uMax : 2) + "</button></li>";
    }).join("");
    return '<section class="cartao"><h2>Pares comparados (por peso)</h2><ul class="candidatos">' + itens + "</ul></section>";
  }

  function cartaoHipoteses(v, dados) {
    var li = function (t) { return "<li>" + t + "</li>"; };
    return '<section class="cartao"><h2>Hipóteses</h2><ul class="hipoteses">' +
      li("Pórtico plano de duas águas, simétrico, com bases encastradas e ligações rígidas, sem cutelos nem pontes rolantes. Alturas e vão do separador Madres, tomadas como as do eixo das barras (ligeiramente por excesso).") +
      li("Análise elástica de 1.ª ordem (barras com deformação axial e por flexão). α<sub>cr</sub> pela expressão (5.2) com cargas horizontais nos beirados; para 3 ≤ α<sub>cr</sub> < 10, a parte com deslocamento lateral (antissimétrica) de cada combinação é amplificada por 1/(1 − 1/α<sub>cr</sub>) (5.2.2(5)B). Imperfeição global φ = φ<sub>0</sub> α<sub>h</sub> α<sub>m</sub> com h = altura no pilar e m = 2 (5.3.2), em todas as combinações.") +
      li("Secções verificadas pela 6.2 (classe com a compressão e a flexão, interação N-V-M). Elementos pela 6.3.3 com o método 2 do Anexo B (normativo em Portugal), C<sub>my</sub> = C<sub>mLT</sub> = 1,0 (o máximo do Quadro B.3, do lado da segurança), curvas do Quadro 6.2 e χ<sub>LT</sub> pelo caso geral (6.3.2.2; com o Anexo Nacional, o 6.3.2.3 dá o mesmo).") +
      li("Fora do plano: troços entre travamentos (escoras da travessa de " + (dados.travamentos.travessaEscoras ? dados.travamentos.travessaEscoras + " em " + dados.travamentos.travessaEscoras + " madres" : "pórtico a pórtico") +
        "; pilares " + ["sem travamentos intermédios", "travados a meia altura", "travados a terços"][dados.travamentos.pilar] + "). Na travessa com o banzo superior comprimido, o bambeamento é entre madres. M<sub>cr</sub> com z<sub>g</sub> = 0 e C<sub>1</sub> pela razão ψ dos momentos quando o diagrama do troço é praticamente linear; senão C<sub>1</sub> = 1,0.") +
      li("Vento no " + (form.elements.posicao.value === "empena" ? "2.º pórtico, junto à empena" : "pórtico corrente") + ", com as zonas que a faixa de influência atravessa; c<sub>pe,10</sub>, sem o fator 0,85 de falta de correlação entre barlavento e sotavento (7.2.2(3), do lado da segurança). Vento de um só lado: pilares e travessas iguais cobrem o lado contrário.") +
      li("Estados limites de utilização com as combinações características, sem amplificação: beirado h/150 (NA–7.2.2(1)B, pórticos sem aparelhos de elevação) e cumeeira vão/200 e vão/250 (Quadro NA.I).") +
      li("Não incluídos: ligações (nós pilar–travessa, cumeeira e bases), placas de base e fundações, cutelos, pórticos de empena, contraventamentos e o peso do revestimento das fachadas.") +
      "</ul></section>";
  }

  // ----- Cálculo -----
  function calcular() {
    estado.desatualizado = false;
    var r = window.SteelFrames.madres;
    if (!r) {
      saida.innerHTML = '<section class="cartao"><h2>Dados por corrigir</h2><p class="nota">Corrija primeiro os dados no separador Madres: o pórtico usa a mesma geometria, o mesmo local e as mesmas cargas.</p></section>';
      return;
    }
    var o = ler(), dados = dadosPortico(r, o);
    var dm = r.d;
    $("p-resumo").innerHTML = "Do separador Madres: vão " + fmt(dm.largura, 1) + " m, alturas " + fmt(dm.beirado, 2) + " / " + fmt(dm.meio, 2) + " m (α = " + fmt(dm.alfa, 1) + "°), pórticos a " + fmt(dm.L, 2) +
      " m, madres " + (dados.madre || "—") + " a " + fmt(dm.s, 2) + " m, zona de neve " + dm.zonaNeve + ", vento zona " + r.zonaVento + ".";
    var lista = Portico.dimensionar(dados, serie(o.pilares), serie(o.travessa), o.aco);
    estado.resultado = lista; estado.dados = dados;
    mostrar();
  }

  function mostrar() {
    var lista = estado.resultado, dados = estado.dados;
    if (!lista) return;
    var v = estado.escolhido && lista.analisados.filter(function (x) { return x.pilar.perfil.nome + " + " + x.travessa.perfil.nome === estado.escolhido; })[0] || lista.escolhido;
    var mostrado = v || lista.analisados.slice().sort(function (a, b) { return a.uMax - b.uMax; })[0];
    saida.innerHTML = cartaoResultado(v, dados, lista) +
      (mostrado ? cartaoDiagrama(mostrado, dados) + cartaoAcoes(mostrado, dados) + cartaoReacoes(mostrado) : "") +
      cartaoComparacao(lista, v) + (mostrado ? cartaoHipoteses(mostrado, dados) : "");
  }

  // O cálculo leva cerca de um segundo: só se faz com o separador visível e depois de uma pausa.
  function agendar() {
    estado.desatualizado = true;
    if ($("vista-portico").hidden) return;
    clearTimeout(estado.temporizador);
    saida.innerHTML = '<section class="cartao"><p class="nota">A calcular o pórtico…</p></section>';
    estado.temporizador = setTimeout(calcular, 250);
  }

  function iniciar() {
    var padrao = Memoria.doFormulario(form);
    var guardado = Memoria.ler("portico");
    if (guardado) Memoria.paraFormulario(form, guardado);
    $("repor-portico").addEventListener("click", function () {
      Memoria.paraFormulario(form, padrao);
      Memoria.apagar("portico");
      estado.escolhido = null;
      agendar();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", function () {
      estado.escolhido = null;
      Memoria.gravar("portico", Memoria.doFormulario(form));
      agendar();
    });
    document.addEventListener("madres:calculadas", function () { estado.escolhido = null; agendar(); });
    $("tab-portico").addEventListener("click", function () { if (estado.desatualizado) agendar(); });
    saida.addEventListener("click", function (e) {
      var b = e.target.closest(".candidato-portico");
      if (!b) return;
      estado.escolhido = b.getAttribute("data-nome");
      mostrar();
      var titulo = saida.querySelector(".nome-perfil");
      if (titulo) { titulo.setAttribute("tabindex", "-1"); titulo.focus({ preventScroll: true }); window.scrollTo(0, saida.getBoundingClientRect().top + window.scrollY - 70); }
    });
    agendar();
  }

  iniciar();
})();
