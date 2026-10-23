# Steel Frames — notas para o Claude

App web (HTML, CSS e JavaScript puro, sem dependências) para identificar perfis metálicos e pré-dimensionar elementos de pavilhões industriais em Portugal continental, segundo os Eurocódigos com os Anexos Nacionais portugueses. Publicada no GitHub Pages: https://philosadelphos.github.io/Steel_Frames/

O utilizador é engenheiro de estruturas e escreve em português de Portugal. Toda a interface, os comentários e os commits são em português de Portugal.

## Estrutura e comandos

- O código edita-se em `src/`. O `index.html` da raiz é **gerado** (ficheiro único, com CSS e JS embutidos) e nunca se edita à mão.
- Depois de qualquer alteração em `src/`:
  ```
  node ferramentas/construir.js      # gera index.html
  node testes/verificar.js           # propriedades dos perfis contra catálogo
  node testes/madres.js              # ações, madres e dados das ómegas
  ```
- O CI (`.github/workflows/verificar.yml`) corre os dois testes e `node ferramentas/construir.js --verificar`, que falha se o `index.html` não tiver sido gerado de novo.
- Fluxo de trabalho: ramo novo a partir da `main` → commits → Pull Request → o utilizador faz merge → o Pages atualiza sozinho.
- `src/js/`: `perfis.js` (dimensões EN 10365), `seccao.js` (propriedades e EC3), `omegas.js` (catálogos Constálica), `acoes.js` (neve, vento, combinações), `madres.js` (verificação de madres), `app.js` (Identificar e Catálogo, memória dos formulários), `vista-madres.js` (separador Madres).

## Convenções da interface

- Números com vírgula decimal. Os campos são `type="text" inputmode="decimal"` com um leitor estrito (aceita vírgula ou ponto, rejeita espaços interiores).
- Cores só por tokens CSS, com tema claro e escuro. Sem scroll horizontal a 320 px. Tem de funcionar sem internet (as Google Fonts são opcionais).
- Os formulários guardam os últimos valores no aparelho (`localStorage`, via `Memoria` em `app.js`), com o botão "Repor o exemplo".
- Antes de publicar, testar no Chromium com Playwright (instalado globalmente: `NODE_PATH=$(npm root -g) node script.js`).

## Decisões de engenharia já tomadas (não reverter sem falar com o utilizador)

- Valores dos Anexos Nacionais conferidos em 23/10/2026 com o texto das NP EN 1990, 1991-1-1, 1991-1-3, 1991-1-4 e 1993-1-1: ver `docs/pendentes.md`.
- **Não reproduzir no repositório quadros das normas** (pedido do utilizador): os valores podem estar no código para o cálculo, mas não em tabelas ou documentos. Os c<sub>pe</sub> dos Quadros 7.2, 7.4a e 7.4b da NP EN 1991-1-4 já foram conferidos com a norma.
- Geometria do pavilhão: altura no pilar e altura a meio vão, **medidas do pavimento à face inferior da cobertura**; a inclinação é calculada. z<sub>e</sub> = altura a meio vão + 0,15 m (espessura da cobertura por excesso).
- Sobrecarga de cobertura (categoria H): 0,4 kN/m² em projeção horizontal, sem combinar com neve ou vento, e **em alternância de vãos** nas madres contínuas.
- Na sucção do vento, só o revestimento e a madre contam como carga permanente favorável (as instalações não).
- Bambeamento pelo **caso geral EC3 6.3.2.2** (curvas a/b para perfis laminados). O NA–6.3.2.3(1) adota λ<sub>LT,0</sub> = 0,2 e β = 1, com que o 6.3.2.3 dá o mesmo χ<sub>LT</sub>: não vale a pena mudar. z<sub>g</sub> = 0, L<sub>cr</sub> entre travamentos do banzo inferior, sem contar com a restrição do revestimento.
- f<sub>y</sub> e f<sub>u</sub> pela **norma de produto** (EN 10025-2/-3, escalões t ≤ 16 / 40 / 63 / 80 mm), como manda o NA–3.2.1(1), e não pelo Quadro 3.1. Nas madres IPE, f<sub>y</sub> de cada perfil sai da espessura do banzo.
- Carga concentrada Q<sub>k</sub> = 1,0 kN da categoria H verificada à parte (6.3.4.2(3)P), só no ELU.
- Orografia: c<sub>0</sub> introduzido pelo utilizador (1,0 em terreno plano). A antiga opção "vale ou estuário → zona B" foi retirada porque não consta do AN (vinha do RSA).
- Normas e catálogos de fabricantes ficam em `docs/normas/` e `docs/catalogos/`, fora do git. Não há AN português da EN 1993-1-3 (só a BS EN 1993-1-3:2006): usar os valores recomendados e assinalá-los.
- Catálogos O Feliz conferidos (ver `docs/pendentes.md`, secção 3): no Superomega, usar os valores do PDF onde o Excel diverge (I<sub>z</sub> 120×1,5 e 120×2,0, I<sub>t</sub> 250×3,0); nas C e Z, aplicar a redução δ da EN 1993-1-3, 5.1(4), porque o catálogo despreza os cantos arredondados.
- Proposta, ainda por confirmar na fase Superomega/C/Z: banzo livre das madres enformadas a frio (EN 1993-1-3, 10.1) com K = 0, sem contar com a rigidez do revestimento (lado da segurança, como nos IPE).
- Madremax e Omegamax (Constálica): os catálogos só têm a secção bruta e as secções são de classe 4, por isso a app faz **pré-seleção** (flechas e tensões na secção bruta) e marca o resto como "não avaliado". Falta pedir à Constálica as propriedades efetivas ou tabelas de cargas.

## Próximos passos combinados

1. **Fase 3: pórtico de duas águas com bases encastradas** (pavilhões industriais, Portugal continental, sem pontes rolantes na primeira versão): esforços na travessa e nos pilares, flexão composta com encurvadura e bambeamento (EC3 6.3.3), deslocamentos. Reutilizar as ações de `acoes.js`.
2. Madres Z e C: precisam de um catálogo com propriedades efetivas, ou do cálculo da secção efetiva pela EN 1993-1-3 a partir das dimensões.
3. Ideias anotadas em `docs/pendentes.md`.
