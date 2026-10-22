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
  return fs.readFileSync(ficheiro, "utf8").replace(/\r\n/g, "\n");
}

function embutir(relativo, etiqueta) {
  var conteudo = ler(path.join(SRC, relativo));
  // Um fecho da etiqueta dentro do conteúdo terminaria o bloco antes do tempo.
  if (new RegExp("</" + etiqueta, "i").test(conteudo)) {
    throw new Error(relativo + " contém </" + etiqueta + "> e não pode ser embutido.");
  }
  return conteudo.replace(/\n+$/, "");
}

function construir() {
  var html = ler(path.join(SRC, "index.html"));
  var estilos = 0, scripts = 0;

  // As substituições usam funções para que "$" no código não seja interpretado como padrão.
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, function (_, ficheiro) {
    estilos++;
    return "<style>\n" + embutir(ficheiro, "style") + "\n</style>";
  });
  html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, function (_, ficheiro) {
    scripts++;
    return "<script>\n" + embutir(ficheiro, "script") + "\n</script>";
  });
  html = html.replace(/^<!doctype html>\n/i, function (d) { return d + AVISO + "\n"; });

  if (!estilos || !scripts) throw new Error("src/index.html não referencia css/ e js/ como esperado.");
  if (/(href|src)="(css|js)\//.test(html)) throw new Error("Ficaram referências a ficheiros locais em index.html.");
  if (html.indexOf(AVISO) === -1) throw new Error("src/index.html deve começar por <!doctype html>.");
  return html;
}

var html = construir();
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
