/*
 * Verificações das tabelas dos painéis sandwich (paineis.js) e da verificação do revestimento (revestimento.js).
 * Correr com: node testes/paineis.js
 */
global.PAINEIS = require("../src/js/paineis.js");
var R = require("../src/js/revestimento.js");

var falhas = 0, total = 0;
function perto(desc, valor, esperado, tol) {
  total++;
  var ok = Math.abs(valor - esperado) <= (tol === undefined ? 1e-9 : tol) * Math.max(1, Math.abs(esperado));
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + (+valor).toFixed(4) + " (esperado " + esperado + ")");
}
function igual(desc, valor, esperado) {
  total++;
  var ok = valor === esperado;
  if (!ok) falhas++;
  console.log((ok ? "ok   " : "FALHA") + "  " + desc + ": " + valor + " (esperado " + esperado + ")");
}

// Coerência das tabelas: todas as espessuras e chapas com tabela, cargas positivas, não crescentes com o vão
// (depois das correções) e crescentes com a espessura do painel no primeiro vão.
var problemas = [];
Object.keys(PAINEIS).forEach(function (nome) {
  var p = PAINEIS[nome];
  Object.keys(p.faces).forEach(function (f) {
    if (p.faces[f].pesos.length !== p.espessuras.length) problemas.push(nome + " " + f + ": pesos");
    ["simples", "multiplo"].forEach(function (a) {
      var t = p.faces[f][a];
      if (!t) { if (!p.indicativo) problemas.push(nome + " " + f + " sem " + a); return; }
      var anterior = null;
      p.espessuras.forEach(function (e) {
        var c = t.cargas[String(e)];
        if (!c) { problemas.push(nome + " " + f + " " + a + " sem " + e + " mm"); return; }
        ["asc", "desc"].forEach(function (s) {
          var v = c[s];
          if (!v.length || v.length > t.vaos.length) problemas.push(nome + " " + f + " " + a + " " + e + " " + s + ": comprimento");
          v.forEach(function (x, i) {
            if (!(x > 0)) problemas.push(nome + " " + e + " " + s + ": valor " + x);
            if (i && x > v[i - 1]) problemas.push(nome + " " + f + " " + a + " " + e + " " + s + " sobe em " + t.vaos[i]);
          });
        });
        if (anterior && c.desc[0] < anterior.desc[0] && !p.indicativo) problemas.push(nome + " " + f + " " + a + " " + e + ": desce com a espessura");
        anterior = c;
      });
    });
  });
});
igual("tabelas coerentes (" + Object.keys(PAINEIS).length + " painéis)", problemas.length ? problemas.join("; ") : "sem problemas", "sem problemas");
igual("correção registada da gralha do Topcover Cap 30 mm", PAINEIS["Topcover Cap"].correcoes.length, 2);

// Valores conferidos com a imagem da página do catálogo O Feliz (Topcover Cap, chapas 0,4/0,4).
var cap = PAINEIS["Topcover Cap"].faces["0,4/0,4"];
perto("Cap 50 mm, apoio simples, ▲ a 3,00 m", cap.simples.cargas["50"].asc[6], 1.30);
perto("Cap 60 mm, apoio simples, ▼ a 3,00 m", cap.simples.cargas["60"].desc[6], 1.16);
perto("Cap 100 mm, apoio simples, ▼ a 5,00 m", cap.simples.cargas["100"].desc[14], 0.52);
igual("Cap 30 mm, apoio simples, ▼: o fabricante não admite mais de 2,75 m", cap.simples.cargas["30"].desc.length, 6);
perto("Cap 30 mm, apoio múltiplo, ▲ a 1,50 m", cap.multiplo.cargas["30"].asc[0], 1.73);
perto("Cap 50 mm, apoio múltiplo, ▼ a 4,25 m", cap.multiplo.cargas["50"].desc[11], 0.33);
perto("peso do Topcover 5 50 mm, chapas 0,5/0,4 (kg/m²)", R.peso({ produto: "Topcover 5", faces: "0,5/0,4", espessura: 50 }), 9.5);
// Panel Sandwich Group: kg/m² convertidos em kN/m²; no 5 ondas, pressão/sucção.
perto("PSG 5 ondas 30 mm a 1,0 m: pressão 303 kg/m²", PAINEIS["PSG 5 ondas"].faces["não indicada"].multiplo.cargas["30"].desc[0], 303 * 9.81 / 1000, 1e-3);
perto("PSG 5 ondas 30 mm a 1,0 m: sucção 315 kg/m²", PAINEIS["PSG 5 ondas"].faces["não indicada"].multiplo.cargas["30"].asc[0], 315 * 9.81 / 1000, 1e-3);

// Carga admissível: o valor do vão tabelado imediatamente acima; abaixo do primeiro vão, o do primeiro.
var vaos = [1.5, 1.75, 2.0], val = [3.0, 2.0, 1.5];
perto("vão 1,60 m usa o de 1,75 m", R.admissivel(vaos, val, 1.6).q, 2.0);
perto("vão 1,75 m exato", R.admissivel(vaos, val, 1.75).q, 2.0);
perto("vão 1,20 m usa o de 1,50 m", R.admissivel(vaos, val, 1.2).q, 3.0);
igual("vão acima do último: não admitido", R.admissivel(vaos, [3.0, 2.0], 1.9), null);

// Exemplo do catálogo O Feliz: Topcover 5, chapas 0,5/0,4, vãos múltiplos de 2,75 m, sobrecarga 0,40 kN/m² e
// vento 1,30 kN/m² ascendente → painel de 50 mm.
function fixas(desc, asc) { return function () { return { desc: { q: desc }, asc: { q: asc } }; }; }
var ex = R.verificar({ produto: "Topcover 5", faces: "0,5/0,4", apoio: "multiplo", espessura: 40 }, 2.75, fixas(0.40, 1.30));
igual("exemplo do catálogo: 40 mm não chega (▲ 1,22 < 1,30)", ex.ok, false);
igual("exemplo do catálogo: espessura mínima 50 mm", ex.espessuraMinima, 50);
var ex50 = R.verificar({ produto: "Topcover 5", faces: "0,5/0,4", apoio: "multiplo", espessura: 50 }, 2.75, fixas(0.40, 1.30));
perto("exemplo do catálogo, 50 mm: utilização 1,30/1,37", ex50.u, 1.30 / 1.37);
igual("exemplo do catálogo, 50 mm: maior vão admitido 2,75 m", ex50.sMax, 2.75);
var escuro = R.verificar({ produto: "Topcover 5", faces: "0,5/0,4", apoio: "multiplo", espessura: 50, escura: true }, 2.75, fixas(0.40, 1.30));
perto("cor escura: ▲ admissível × 0,7", escuro.asc.adm, 1.37 * 0.7);
igual("cor escura: espessura mínima sobe para 100 mm", escuro.espessuraMinima, 100);
igual("PSG só tem tabela a 2 vãos", R.verificar({ produto: "PSG 5 ondas", faces: "não indicada", apoio: "simples", espessura: 40 }, 1.5, fixas(0.4, 1)).semTabela, true);
igual("PSG marcado como indicativo", R.verificar({ produto: "PSG 5 ondas", faces: "não indicada", apoio: "multiplo", espessura: 40 }, 1.5, fixas(0.4, 1)).indicativo, true);
var fora = R.verificar({ produto: "Topcover Cap", faces: "0,4/0,4", apoio: "simples", espessura: 30 }, 3.0, fixas(0.2, 0.2));
igual("vão fora da tabela descendente: não cumpre", fora.desc.foraDaTabela && !fora.ok, true);

// Ações características no painel: α = 0, neve 0,5, vento +0,3 / −1,2, ψ0 = 0,5 (neve) e 0,6 (vento).
var a = R.acoes({ alfa: 0, qk: 0.4, s: 0.5, wPressao: 0.3, wSuccao: -1.2, psiS: 0.5, psiW: 0.6 });
perto("descendente: neve + 0,6 × vento em pressão", a.desc.q, 0.5 + 0.6 * 0.3);
igual("descendente condicionante: neve", a.desc.id, "S");
perto("ascendente: sucção", a.asc.q, 1.2);
perto("sobrecarga e neve em projeção horizontal: × cos² α", R.acoes({ alfa: 60, qk: 0.4, s: 0, wPressao: 0, wSuccao: 0, psiS: 0.5, psiW: 0.6 }).desc.q, 0.1);

console.log("\n" + (total - falhas) + "/" + total + " verificações");
process.exit(falhas ? 1 : 0);
