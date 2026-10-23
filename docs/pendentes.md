# Pendentes

Lista do que falta confirmar ou fazer. Em 23/10/2026, todos os valores normativos usados pela app foram conferidos com o texto da NP EN 1990:2009, NP EN 1991-1-1:2009, NP EN 1991-1-3:2009, NP EN 1991-1-4:2010 e NP EN 1993-1-1:2010, com os respetivos Anexos Nacionais. As diferenças encontradas foram corrigidas no mesmo dia.

Legenda: ☑ conferido e igual · ✔ conferido, estava diferente e foi corrigido · ☐ por conferir.

## 1. Valores conferidos com as normas

As normas ficam em `docs/normas/`, só para consulta local (a pasta está no `.gitignore`). Os quadros das normas não se reproduzem neste repositório: aqui ficam só os valores usados e a cláusula de onde vêm.

### NP EN 1991-1-4:2010 + Anexo Nacional (vento) — `src/js/acoes.js`

**Coeficientes de pressão exterior: conferidos.** Em 22/10/2026, os valores de c<sub>pe,10</sub> e c<sub>pe,1</sub> usados pela app foram conferidos, um a um, com os Quadros 7.2 (coberturas em terraço, bordos em aresta viva), 7.4a (duas vertentes, θ = 0°, inclinações de 5° a 45°) e 7.4b (duas vertentes, θ = 90°) da norma. Os quadros não são reproduzidos neste repositório. Também se confirmou que a app segue as notas do Quadro 7.4a: só interpola entre valores do mesmo sinal, não interpola entre −5° e +5° (usa o Quadro 7.2 abaixo de 5°) e considera os valores positivos e negativos.

Restantes parâmetros, conferidos em 23/10/2026:

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| v<sub>b,0</sub> zona A / zona B | 27 / 30 m/s | NA–4.2(1)P, Nota 2 | ☑ |
| Definição da zona B (continente) | faixa costeira de 5 km ou altitude > 600 m | NA–4.2(1)P, Nota 2 | ☑ |
| Vales e estuários com exposição desfavorável tratados como zona B | opção retirada da app | não consta do AN (vinha do RSA). A orografia trata-se com c<sub>0</sub>(z) pelo Anexo A.3 (NA–4.3.3(1)) | ✔ |
| c<sub>dir</sub>, c<sub>season</sub> | 1,0 | NA–4.2(2)P, Notas 2 e 3 (reduções só em casos justificados) | ☑ |
| Categorias de terreno I a IV: z<sub>0</sub> / z<sub>min</sub> | 0,005/1 · 0,05/3 · 0,3/8 · 1,0/15 m | Quadro NA–4.1 | ☑ |
| k<sub>r</sub> = 0,19 (z<sub>0</sub>/0,05)<sup>0,07</sup> | procedimento recomendado | expressão (4.5), NA–4.3.2(1) | ☑ |
| ρ, k<sub>I</sub> | 1,25 kg/m³, 1,0 | 4.5(1) e 4.4(1), Notas 2, sem prescrição nacional | ☑ |
| c<sub>0</sub> | terreno plano (1,0); colina ou escarpa pelo Anexo A.3, expressões (A.1) a (A.13); ou valor de estudo específico. Entra em v<sub>m</sub> e em I<sub>v</sub> | 4.3.3 e NA–4.3.3(1); vales com afunilamento e orografia complexa: parecer técnico ou ensaio (A.3(4)), fora do âmbito da app | ✔ |
| c<sub>pi</sub> sem aberturas dominantes | +0,2 / −0,3 | 7.2.9(6), Nota 2 | ☑ |
| Interpolação de c<sub>pe</sub> para 1 m² < A < 10 m² | c<sub>pe,1</sub> − (c<sub>pe,1</sub> − c<sub>pe,10</sub>) log<sub>10</sub> A | 7.2.1(1), Nota 2, e Figura 7.2, sem prescrição nacional | ☑ |
| c<sub>s</sub>c<sub>d</sub> | 1,0 (edifícios com h < 15 m) | 6.2(1)a) | ☑ |
| Zona I das coberturas em terraço | +0,2 e −0,2, cada um em toda a zona | NA.4.3 d) | ☑ |

### NP EN 1991-1-3:2009 + Anexo Nacional (neve) — `src/js/acoes.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| s<sub>k</sub> | C<sub>z</sub> [1 + (H/500)²] kN/m² | NA–4.1(1) | ☑ |
| C<sub>z</sub> zonas Z1 / Z2 / Z3 | 0,30 / 0,20 / 0,10 | NA–4.1(1) | ☑ |
| Zonas por concelho | distrito e, nos distritos repartidos, concelho (ou zona à mão) | NA–4.1(1), lista completa por distrito e concelho (o Anexo C não se aplica) | ☑ |
| Queda de neve excecional, C<sub>esl</sub> = 2,5 | aviso na app, não calculada | NA–4.3(1) e Quadro NA–A.1 (caso B3: Aguiar da Beira, Fornos de Algodres, Mangualde, Nelas, Penalva do Castelo, Sátão e Viseu) | ☑ |
| Deslocamento excecional da neve (Anexo B) | aviso na app, não calculado | Quadro NA–A.1, Nota 1: caso B2 em todos os restantes concelhos da zona Z1 (relevante com platibandas, obstáculos ou construções mais altas contíguas) | ✔ |
| μ<sub>1</sub> (duas águas) | 0,8 até 30°, linear até 0 a 60° | Quadro 5.2 | ☑ |
| C<sub>e</sub> / C<sub>t</sub> | 0,8 · 1,0 · 1,2 / 1,0 | Quadro 5.1 e 5.2(8), sem prescrição nacional | ☑ |

### NP EN 1991-1-1:2009 e NP EN 1990:2009 + Anexos Nacionais (sobrecarga e combinações) — `src/js/acoes.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| Sobrecarga em coberturas da categoria H | q<sub>k</sub> = 0,4 kN/m² em projeção horizontal | Quadro NA–6.10 | ☑ |
| Carga concentrada Q<sub>k</sub> = 1,0 kN, verificada à parte | combinação ELU própria, 1,35 G + 1,5 Q<sub>k</sub> na posição mais desfavorável; não entra nas flechas | Quadro NA–6.10 e 6.3.4.2(3)P (verificações separadas para Q<sub>k</sub> e q<sub>k</sub>) | ✔ |
| Área em que q<sub>k</sub> atua | toda a faixa de influência, em alternância de vãos | Quadro NA–6.10, Nota: "em toda ou em parte da área da cobertura" | ☑ |
| Sobrecarga não combinada com neve nem vento | sim | 3.3.2(1) | ☑ |
| Expressão das combinações ELU | 6.10 (as 6.10a e 6.10b não se usam) | NA–A1.2.1(1) e Quadro NA–A1.2(B), Nota 1 | ☑ |
| γ<sub>G,sup</sub> / γ<sub>G,inf</sub> / γ<sub>Q</sub> | 1,35 / 1,00 / 1,50 | Quadro NA–A1.2(B), Nota 2 | ☑ |
| ψ<sub>0</sub> categoria H / neve (H ≤ 1000 m) / neve (H > 1000 m) / vento | 0 / 0,5 / 0,7 / 0,6 | Quadro A1.1, sem prescrição nacional (NA.2.2) | ☑ |

### NP EN 1993-1-1:2010 + Anexo Nacional (aço) — `src/js/seccao.js`, `src/js/madres.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| γ<sub>M0</sub> / γ<sub>M1</sub> | 1,00 / 1,00 | 6.1(1), Nota 2B, sem prescrição nacional (valores recomendados) | ☑ |
| Flechas em coberturas em geral | δ<sub>max</sub> ≤ L/200, δ<sub>2</sub> ≤ L/250 | NA–7.2.1(1)B, Quadro NA.I | ☑ |
| Método de bambeamento | caso geral 6.3.2.2, curvas a/b para perfis laminados | 6.3.2.2(2) sem prescrição nacional. O NA–6.3.2.3(1) adota λ<sub>LT,0</sub> = 0,2 e β = 1, com que o método alternativo dá o mesmo χ<sub>LT</sub> que o caso geral: não há ganho em mudar | ☑ |
| f<sub>y</sub> e f<sub>u</sub> | antes: Quadro 3.1 (t ≤ 40 / ≤ 80 mm). Agora: EN 10025-2/-3 por escalões t ≤ 16 / 40 / 63 / 80 mm; f<sub>u</sub> para 3 ≤ t ≤ 100 mm | NA–3.2.1(1): opção a), valores da norma de produto, "alguns inferiores aos do Quadro 3.1" | ✔ |

### NP EN 1993-1-3 (perfis enformados a frio) — para as madres Superomega, C e Z

Só está disponível a BS EN 1993-1-3:2006 (texto europeu, sem o Anexo Nacional português); a NP EN 1993-1-3 não está disponível. A app usa os valores recomendados e assinala-os nas hipóteses (por exemplo, χ<sub>LT</sub> do banzo livre em 10.1.4.2(1), Nota, e γ<sub>M</sub> do capítulo 2).

### NP EN 1993-1-1, Anexo BB (informativo): travamento pelo revestimento — `src/js/vista-madres.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| Banzo superior das madres IPE travado pelo revestimento | admitido; a app só verifica o bambeamento do banzo inferior | BB.2.1: chapa trapezoidal ligada em todas as nervuras e rigidez S que cumpra a expressão (BB.2). Com painel sandwich ou fixação pela crista, confirmar com o fabricante (EN 1993-1-3, 10.1.1(5)) | ✔ (hipótese explicitada na app) |

## 2. Madres enformadas a frio: aproximações e o que confirmar

As madres Superomega, C e Z da O Feliz verificam-se pela EN 1993-1-3, 10.1 (`src/js/enformados.js`). As Madremax e Omegamax da Constálica saíram da app: os catálogos só davam a secção bruta.

**Aproximações e hipóteses do lado da segurança, a confirmar ou melhorar:**
- **Restrição do revestimento.** Por omissão K = 0, e o banzo livre só fica travado nos pórticos e nos tirantes.
  - Sem tirantes, as madres enformadas raramente verificam em sucção. No exemplo da app, o Superomega precisa do Ω250 com K = 0; com C<sub>D</sub> = 2 kN·m/m/rad e sem tirantes, basta o Ω200×1,5.
  - Para painel sandwich, pedir ao fabricante do painel a rigidez de rotação C<sub>D</sub> da ligação painel–madre (10.1.5.2).
  - A regra C<sub>D,A</sub> = 130 p não se aplica ao Superomega: a fixação fica a 22 mm da alma, e a 10.1.5.2(7) exige 25 mm.
- **Esmagamento da alma do Superomega.** A madre apoia pelas abas, sem esquadro, e a alma tem dobras do mesmo lado da linha do sistema, que a 6.1.7.4 não cobre. A app usa a 6.1.7.3 para secções em ómega com a inclinação média da alma. Confirmar com a O Feliz (ensaios ou programa de cálculo).
- **Banzo livre da ómega:** 1/5 da alma, como nas C e Z (a 10.1.4.1(2) não indica valor para ómegas); k<sub>h</sub> = 0 por simetria.
- **Sobreposições.** Com 0,1 L ou mais para cada lado, a madre conta como contínua, com secção dupla no apoio.
  - A rigidez e a resistência das sobreposições deviam vir de ensaios (10.1.3.4). Os tipos II e III do desenho da O Feliz garantem a transmissão dos esforços, segundo o fabricante.
  - Sobreposições mais curtas ou desconhecidas contam como continuidade parcial.
- **Componente no plano da cobertura** resistida pela madre entre tirantes (W<sub>z,eff</sub>), somada à flexão principal.

**Não verificado:** ligações aparafusadas (emendas, apoios, esquadros e arrancamento das fixações em sucção), esforço axial nas madres que servem de escoras do contraventamento e reforço do vão extremo do Superomega (obrigatório, segundo o fabricante, com 6 ou mais vãos).

## 3. Catálogos O Feliz (Superomega, C e Z): conferência dos dados

Fontes, em `docs/catalogos/` (fora do git): catálogos em PDF, folhas de cálculo com as propriedades (`*_propr geometr.xlsx`) e desenhos (`SUPEROMEGA_pormenores.dxf`, `CZ_gama.dxf`). Conferência feita em 23/10/2026.

**Superomega: 16 secções, S280GD e S350GD, com propriedades efetivas.**
- A geometria das secções no DXF (contorno real, com os cantos arredondados) reproduz as propriedades brutas do catálogo depois de passar a t<sub>eff</sub>: A, I<sub>y</sub> e I<sub>z</sub> com diferenças até 0,4 %. O centro de gravidade difere cerca de 1 mm, porque o catálogo mede a cota à linha média e não à face exterior.
- Erros nas folhas de cálculo; o PDF está certo e é coerente com a geometria:
  - I<sub>z,bruta</sub> do 120×1,5 e do 120×2,0: o Excel tem 238,06 e 319,58 cm⁴, o PDF tem 156,18 e 209,68 cm⁴. As propriedades efetivas do próprio Excel (I<sub>z,eff</sub> = 153 e 208 cm⁴) só batem com os valores do PDF.
  - I<sub>t</sub> do 250×3,0: o Excel tem 10 000,57, o PDF tem 5660,41 (×10⁻⁴ cm⁴), coerente com t³.
- Nas folhas efetivas, A<sub>eff</sub> em compressão excede A em 0,2 a 0,4 % no 120×1,5 (S280GD) e nos 200×2,0 e 200×2,5. A app limita A<sub>eff</sub> a A.
- Ligações (DXF "Situações de emenda"):
  - tipo I, emenda simples entre apoios, com l = 200 mm;
  - tipo II, sobreposição simples sobre o apoio, com l = b + 2l' e l' = e + 25 (20 ≤ e ≤ 70 mm, b ≥ 130 mm);
  - tipo III, sobreposição longa sobre o apoio, com l ≥ 0,1 L + 0,1 L.
  - Parafusos M10 8.8: 4 filas de 4 no Ω80, Ω120 e Ω160 e 4 filas de 6 no Ω200 e Ω250.
  - Montagem nos apoios sempre pelas abas inferiores (viga de aço, betão ou madeira), sem esquadro.

**C e Z: 22 secções C (C140 a C300) e 19 Z (Z140 a Z300), S220GD a S350GD.**
- As propriedades brutas do Excel batem, em todas as 41 secções (diferença máxima de 0,07 %), com um modelo de linha média de **cantos vivos**: h − t<sub>nom</sub>, b − t<sub>nom</sub>, a − t<sub>nom</sub>/2, com espessura t<sub>eff</sub>. O raio interior de 5 mm não é considerado.
- A EN 1993-1-3, 5.1(3), só permite desprezar os cantos se r ≤ 5t e r ≤ 0,10 b<sub>p</sub> em todos os elementos. Nos reforços de 20 mm (b<sub>p</sub> ≈ 14 mm) a segunda condição não se cumpre. Além disso, nas propriedades de rigidez os cantos contam sempre. Com os cantos, A desce cerca de 3 % e I<sub>y</sub> e I<sub>z</sub> descem 4 a 7 %. A app aplica a redução δ da 5.1(4): A(1 − δ), I(1 − 2δ), I<sub>w</sub>(1 − 4δ), também às propriedades efetivas (5.1(5)).
- O Z250 aparece nos quadros de furação do PDF, mas não tem propriedades em nenhuma das fontes.

**A perguntar à O Feliz (dt@ofeliz.com):** confirmar os dois erros das folhas de cálculo do Superomega; se as propriedades das C e Z consideram os cantos; propriedades do Z250; rigidez e resistência das sobreposições tipo II e III (EN 1993-1-3, 10.1.3.4); recomendações de tirantes.

## 4. Pórtico de duas águas (Fase 3): simplificações a rever

- Alturas e vão do separador Madres (à face inferior da cobertura) tomados como os do eixo das barras.
- C<sub>my</sub> = C<sub>mLT</sub> = 1,0 no método 2 (o máximo do Quadro B.3); C<sub>1</sub> = 1,0 quando o diagrama do troço não é linear. Podem ser refinados com o Quadro B.3 e os valores de C<sub>1</sub> por diagrama.
- Fora do plano, os travamentos contam como pontos com os dois banzos fixos; a travessa com o banzo superior comprimido bambeia entre madres. Não se usa o Anexo BB.3 (troços com travamento num só banzo).
- Vento só da esquerda: os dois pilares e as duas águas da travessa têm o mesmo perfil, por isso cobrem o lado contrário. Sem o fator 0,85 de falta de correlação (7.2.2(3)).
- Não incluídos: cutelos, ligações, placas de base, fundações, pórticos de empena, contraventamentos, peso das fachadas e pontes rolantes.

## 5. Perfis U (UPN e UPE)

Dimensões da EN 10365 tal como as publica o fornecedor J. Justino das Neves (jjustinodasneves.pt, produtos UPN e UPE). Os PDF descarregados estavam truncados; as tabelas completas vieram das páginas do fornecedor. `src/js/perfis-u.js` guarda as dimensões e, à parte, a área e o peso do fornecedor só para conferência.

- Propriedades calculadas pelo contorno real, com os banzos inclinados do UPN (8 % até ao UPN 300, 5 % acima, t<sub>f</sub> a meio da largura do banzo) e as concordâncias r<sub>1</sub> e r<sub>2</sub>; W<sub>pl,z</sub> pela posição do eixo plástico. Conferência: A e G contra o fornecedor nas 32 secções (desvio máximo 0,8 %); I<sub>y</sub> e I<sub>z</sub> contra os catálogos ArcelorMittal no UPN 100, 200, 300 e UPE 200, e no UPN 200 também W<sub>el,y</sub>, W<sub>pl,y</sub>, W<sub>el,z</sub>, W<sub>pl,z</sub> e y<sub>s</sub> (tolerância 1,5 %).
- I<sub>t</sub> e I<sub>w</sub> por fórmulas de paredes finas (aproximadas).
- Classificação com c = b − t<sub>w</sub> − r no banzo e c = h − 2t<sub>f</sub> − 2r na alma.
- O centro de corte fica fora da alma: a app avisa que as resistências não contam com a torção de uma carga no plano da alma nem com a encurvadura.
- A C enformada da O Feliz tem reforços nos banzos: não substitui os U laminados.

## 6. Painéis sandwich: tabelas de cargas e verificação do revestimento

`src/js/paineis.js` é gerado por `ferramentas/dados_paineis.py` a partir de `docs/catalogos/` (fora do git). `src/js/revestimento.js` faz a verificação, que aparece no separador Madres.

**O Feliz, catálogo OFPA-Sandwich-Panel.pdf (Topcover® 3, 5, Cap e Tile).** Tabelas de cálculo direto por espessura das chapas (0,4/0,4 e 0,5/0,4; no Tile 0,5/0,4 e 0,5/0,5), apoio simples e múltiplo, vãos de 1,50 a 5,00 m e cargas ▲/▼. Segundo o catálogo, são valores característicos das cargas admissíveis além do peso próprio e das variações diferenciais de temperatura, com os ELU (flexão, corte, cargas concentradas nos apoios) e a flecha de serviço ≤ L/200. Conferidos com a imagem das páginas e com o exemplo do catálogo (Topcover 5, 0,5/0,4, vãos múltiplos de 2,75 m, vento ascendente de 1,30 kN/m² → 50 mm), que está nos testes.
- Gralha corrigida do lado da segurança: Topcover Cap 30 mm, 0,4/0,4, apoio simples, ▲ a 4,00 e 4,25 m (0,43 e 0,37, acima dos 0,33 a 3,75 m) → 0,33.
- A tabela do exemplo da página 14 difere da tabela do Topcover 5 (página do produto) na linha de 100 mm; usa-se a do produto.
- Cor escura: o catálogo indica uma redução da carga ascendente até cerca de 30 % nas menores espessuras; a app aplica 30 % a todas, quando se assinala a opção.
- Topcover Deck e os painéis de fachada não entram (cobertura com outra tabela; fachadas fora do âmbito).

**Panel Sandwich Group, fichas painel-sandwich-cinco-ondas.pdf e painel-sandwich-tres-ondas.pdf (indicativas).** "Tabela de cargas admissíveis" a 2 vãos, em kg/m² (convertidos com 9,81 N/kg), espessuras de 30 a 60 mm e vãos de 1,0 a 4,0 m. No 5 ondas cada célula tem dois valores; o site do fabricante (painelsandwich.com) mostra-os como pressão e sucção. No 3 ondas há um só valor, usado nos dois sentidos.
- A ficha não indica a espessura das chapas, o critério (ELU ou flecha) nem se os valores são característicos. O site dá, para o 5 ondas de 50 mm com chapas 0,5/0,5, valores até cerca de 20 % mais baixos do que a ficha (281/301 contra 357/369 kg/m² a 1,0 m). Ficam marcadas como indicativas.
- Gralha corrigida: 5 ondas 60 mm, pressão a 3,6 m (67 kg/m², acima dos 59 a 3,4 m) → 59.
- Sem tabela para um só vão: a app avisa.

**Verificação.** Vão do painel = espaçamento entre madres na pendente; sem interpolação (usa-se o vão tabelado imediatamente acima). Ações características (NP EN 1990, 6.14b): ▼ o maior de q<sub>k</sub> cos²α, s cos²α + ψ<sub>0</sub> w<sub>p</sub> e w<sub>p</sub> + ψ<sub>0</sub> s cos²α; ▲ a sucção com o c<sub>pe</sub> da área s × 1 m. Verifica-se na zona corrente e nas bordaduras; quando não cumpre, a app dá o espaçamento máximo e a espessura mínima. Ao escolher o painel, o peso do revestimento passa a ser o do fabricante.

**Não verificado:** carga concentrada de manutenção sobre o painel, fixações (arrancamento, número por madre) e largura de apoio. A rigidez C<sub>D</sub> da ligação painel–madre não consta de nenhum dos catálogos: pedir aos fabricantes.

## 7. Ideias anotadas para mais tarde

- Painéis de outros fabricantes (Kingspan, Hiansa, ...) e de fachada, com as respetivas tabelas.
- Coberturas de uma água (Quadros 7.3a e 7.3b da NP EN 1991-1-4).
- Ligações das madres enformadas: parafusos na alma com esquadro e arrancamento das fixações em sucção (EN 1993-1-3, 8.3).
- Madres que servem de escoras do contraventamento (esforço axial com flexão, EN 1993-1-3, 10.1.4.2 e 6.2).
- Coberturas em terraço com platibanda ou bordos arredondados (restantes linhas do Quadro 7.2).
- Situação acidental de neve excecional e acumulação de neve junto a platibandas e desníveis.
- Pórtico: cutelos, bases rotuladas, ligações e placas de base, pórticos de empena.
