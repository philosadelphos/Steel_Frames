/*
 * Gera index.html na raiz do repositório: um ficheiro único, com o CSS e o JavaScript
 * de src/ embutidos, que funciona mesmo quando é descarregado ou copiado sozinho.
 *
 *   node ferramentas/construir.js              gera index.html
 *   node ferramentas/construir.js --verificar  falha se index.html não estiver atualizado
 */
var fs = require("fs");
var path = require("path");

var RAIZ = path.join(__dirname, "..");
var SRC = path.join(RAIZ, "src");
var DESTINO = path.join(RAIZ, "index.html");
var AVISO = "<!-- Ficheiro gerado por ferramentas/construir.js a partir de src/. Não editar: altere src/ e volte a gerar. -->";

function ler(ficheiro) {
  // Sem BOM: dentro de um bloco <style> embutido, o BOM anularia a primeira regra.
  return fs.readFileSync(ficheiro, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

// Sequências que terminariam o bloco antes do tempo (ou, no caso de "<!--" num script,
// impediriam o seu fecho).
var PROIBIDO = { style: /<\/style/i, script: /<\/script|<!--/i };

function embutir(relativo, etiqueta) {
  var conteudo = ler(path.join(SRC, relativo));
  var achado = conteudo.match(PROIBIDO[etiqueta]);
  if (achado) {
    throw new Error(relativo + " contém \"" + achado[0] + "\" e não pode ser embutido num bloco <" + etiqueta + ">.");
  }
  return conteudo.replace(/\n+$/, "");
}

function reEstilo() { return /<link rel="stylesheet" href=(["'])(?:\.\/)?(css\/[^"']+)\1>/g; }
function reScript() { return /<script src=(["'])(?:\.\/)?(js\/[^"']+)\1><\/script>/g; }
// Atributos que apontam para ficheiros locais (tudo o que não é um endereço absoluto ou âncora).
var RE_LOCAL = /\b(?:href|src)\s*=\s*["']?(?!https?:|\/\/|data:|#|mailto:)[^"'\s>]/i;

function construir() {
  var modelo = ler(path.join(SRC, "index.html"));
  var html = modelo;
  var estilos = 0, scripts = 0;

  // As substituições usam funções para que "$" no código não seja interpretado como padrão.
  html = html.replace(reEstilo(), function (_, aspa, ficheiro) {
    estilos++;
    return "<style>\n" + embutir(ficheiro, "style") + "\n</style>";
  });
  html = html.replace(reScript(), function (_, aspa, ficheiro) {
    scripts++;
    return "<script>\n" + embutir(ficheiro, "script") + "\n</script>";
  });
  html = html.replace(/^<!doctype html>\n/i, function (d) { return d + AVISO + "\n"; });

  if (!estilos || !scripts) throw new Error("src/index.html não referencia css/ e js/ como esperado.");
  var local = modelo.replace(reEstilo(), "").replace(reScript(), "").match(RE_LOCAL);
  if (local) throw new Error("src/index.html referencia um ficheiro local que não é embutido: " + local[0] + "…");
  if (html.indexOf(AVISO) === -1) throw new Error("src/index.html deve começar por <!doctype html>.");
  return html;
}

var html;
try {
  html = construir();
} catch (e) {
  console.error("Erro: " + e.message);
  process.exit(1);
}
if (process.argv.indexOf("--verificar") !== -1) {
  var atual = fs.existsSync(DESTINO) ? ler(DESTINO) : "";
  if (atual !== html) {
    console.error("index.html não corresponde a src/. Corra: node ferramentas/construir.js");
    process.exit(1);
  }
  console.log("index.html está atualizado.");
} else {
  fs.writeFileSync(DESTINO, html);
  console.log("index.html gerado (" + Math.round(html.length / 1024) + " kB).");
}
