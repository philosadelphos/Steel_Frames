# Steel Frames — notas para o Claude

App web (HTML, CSS e JavaScript puro, sem dependências) para identificar perfis metálicos e pré-dimensionar elementos de pavilhões industriais em Portugal continental, segundo os Eurocódigos com os Anexos Nacionais portugueses. Publicada no GitHub Pages: https://philosadelphos.github.io/Steel_Frames/

O utilizador é engenheiro de estruturas e escreve em português de Portugal. Toda a interface, os comentários e os commits são em português de Portugal.

## Estrutura e comandos

- O código edita-se em `src/`. O `index.html` da raiz é **gerado** (ficheiro único, com CSS e JS embutidos) e nunca se edita à mão.
- Depois de qualquer alteração em `src/`:
  ```
  node ferramentas/construir.js      # gera index.html
  node testes/verificar.js           # propriedades dos perfis contra catálogo
  node testes/madres.js              # ações e madres IPE
  node testes/enformados.js          # madres enformadas a frio e dados O Feliz
  ```
- O CI (`.github/workflows/verificar.yml`) corre os três testes e `node ferramentas/construir.js --verificar`, que falha se o `index.html` não tiver sido gerado de novo.
- Fluxo de trabalho: ramo novo a partir da `main` → commits → Pull Request → o utilizador faz merge → o Pages atualiza sozinho.
- `src/js/`: `perfis.js` (dimensões EN 10365), `seccao.js` (propriedades e EC3), `ofeliz.js` (dados O Feliz, gerado por `ferramentas/dados_ofeliz.py`), `acoes.js` (neve, vento, combinações), `madres.js` (madres IPE), `enformados.js` (madres enformadas a frio, EN 1993-1-3), `app.js` (Identificar e Catálogo, memória dos formulários), `vista-madres.js` (separador Madres).

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
- Madremax e Omegamax (Constálica) foram retiradas (catálogos só com a secção bruta) e substituídas pelas madres O Feliz: Superomega, C e Z, com propriedades efetivas.
- Madres enformadas a frio pela EN 1993-1-3, 10.1 (`enformados.js`):
  - banzo livre = banzo + reforço + 1/5 da alma; k<sub>h</sub> da Figura 10.3 (0 na ómega); M<sub>fz</sub> = κ<sub>R</sub> q<sub>h</sub> L<sub>a</sub>²/8; l<sub>fz</sub> pelos Quadros 10.2a/b, com o máximo de vão extremo e interior;
  - restrição do revestimento: K = 0 por omissão (do lado da segurança); opções 130 p (10.1.5.2(7), não aplicável ao Superomega porque o banzo superior tem 44 mm) e C<sub>D</sub> do fabricante, com K pela (10.13) e b<sub>mod</sub> = 2a + b;
  - continuidade: madre contínua; sobreposição ≥ 0,1 L para cada lado = contínua com secção dupla no apoio e verificação da secção simples no fim da sobreposição; mais curta ou desconhecida = parcial (vão e flechas também como simplesmente apoiada; Quadro 10.2a para 3 tirantes);
  - Superomega apoiado pelas abas: esmagamento da alma pela 6.1.7.3 (aproximação, as dobras não cumprem a 6.1.7.4) e 6.1.11; C e Z com esquadro: sem esmagamento (10.1.3.2(2));
  - corte pela (6.10a) com a altura desenvolvida; M + V pela (6.27) com M<sub>f,Rd</sub> = 0; flechas com I<sub>eff</sub> mínimo.

## Próximos passos combinados

1. **Fase 3: pórtico de duas águas com bases encastradas** (pavilhões industriais, Portugal continental, sem pontes rolantes na primeira versão): esforços na travessa e nos pilares, flexão composta com encurvadura e bambeamento (EC3 6.3.3), deslocamentos. Reutilizar as ações de `acoes.js`.
2. Cálculo de c<sub>0</sub> pelo Anexo A.3 e zona de neve pelo concelho (ver `docs/pendentes.md`).
3. Ideias anotadas em `docs/pendentes.md`.
