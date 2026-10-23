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

- Valores dos Anexos Nacionais e o que falta conferir: ver `docs/pendentes.md`.
- **Não reproduzir no repositório quadros das normas** (pedido do utilizador): os valores podem estar no código para o cálculo, mas não em tabelas ou documentos. Os c<sub>pe</sub> dos Quadros 7.2, 7.4a e 7.4b da NP EN 1991-1-4 já foram conferidos com a norma.
- Geometria do pavilhão: altura no pilar e altura a meio vão, **medidas do pavimento à face inferior da cobertura**; a inclinação é calculada. z<sub>e</sub> = altura a meio vão + 0,15 m (espessura da cobertura por excesso).
- Sobrecarga de cobertura (categoria H): 0,4 kN/m² em projeção horizontal, sem combinar com neve ou vento, e **em alternância de vãos** nas madres contínuas.
- Na sucção do vento, só o revestimento e a madre contam como carga permanente favorável (as instalações não).
- Bambeamento pelo **caso geral EC3 6.3.2.2** (curvas a/b para perfis laminados), porque não foi confirmado se o Anexo Nacional adota o 6.3.2.3. z<sub>g</sub> = 0, L<sub>cr</sub> entre travamentos do banzo inferior, sem contar com a restrição do revestimento.
- Madremax e Omegamax (Constálica): os catálogos só têm a secção bruta e as secções são de classe 4, por isso a app faz **pré-seleção** (flechas e tensões na secção bruta) e marca o resto como "não avaliado". Falta pedir à Constálica as propriedades efetivas ou tabelas de cargas.

## Próximos passos combinados

1. **Fase 3: pórtico de duas águas com bases encastradas** (pavilhões industriais, Portugal continental, sem pontes rolantes na primeira versão): esforços na travessa e nos pilares, flexão composta com encurvadura e bambeamento (EC3 6.3.3), deslocamentos. Reutilizar as ações de `acoes.js`.
2. Madres Z e C: precisam de um catálogo com propriedades efetivas, ou do cálculo da secção efetiva pela EN 1993-1-3 a partir das dimensões.
3. Ideias anotadas em `docs/pendentes.md`.
