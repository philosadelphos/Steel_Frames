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
| c<sub>0</sub> | 1,0 por omissão; campo editável (1,0 a 2,0), que entra em v<sub>m</sub> e em I<sub>v</sub> | 4.3.3: desprezável com declive médio a barlavento < 3°; senão Anexo A.3 (NA–4.3.3(1)); em vales com afunilamento, estudo específico (A.3(4)) | ✔ (o cálculo pelo A.3 ainda não está na app) |
| c<sub>pi</sub> sem aberturas dominantes | +0,2 / −0,3 | 7.2.9(6), Nota 2 | ☑ |
| Interpolação de c<sub>pe</sub> para 1 m² < A < 10 m² | c<sub>pe,1</sub> − (c<sub>pe,1</sub> − c<sub>pe,10</sub>) log<sub>10</sub> A | 7.2.1(1), Nota 2, e Figura 7.2, sem prescrição nacional | ☑ |
| c<sub>s</sub>c<sub>d</sub> | 1,0 (edifícios com h < 15 m) | 6.2(1)a) | ☑ |
| Zona I das coberturas em terraço | +0,2 e −0,2, cada um em toda a zona | NA.4.3 d) | ☑ |

### NP EN 1991-1-3:2009 + Anexo Nacional (neve) — `src/js/acoes.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| s<sub>k</sub> | C<sub>z</sub> [1 + (H/500)²] kN/m² | NA–4.1(1) | ☑ |
| C<sub>z</sub> zonas Z1 / Z2 / Z3 | 0,30 / 0,20 / 0,10 | NA–4.1(1) | ☑ |
| Zonas por concelho | escolha manual na app | NA–4.1(1) tem a lista completa por distrito e concelho (o Anexo C não se aplica) | ☑ (a app pode passar a escolher pelo concelho) |
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

Só está disponível a BS EN 1993-1-3:2006 (texto europeu, sem o Anexo Nacional português). Quando estas madres entrarem na app, e enquanto não houver o AN português, usam-se os valores recomendados, assinalados como tal (por exemplo, χ<sub>LT</sub> do banzo livre em 10.1.4.2(1), Nota, e γ<sub>M</sub> do capítulo 2).

## 2. Madremax e Omegamax: o que pedir à Constálica

Os catálogos só dão as propriedades da secção bruta. Como as secções são de classe 4, a app faz apenas uma **pré-seleção**: flechas com o I<sub>y</sub> bruto e tensões na secção bruta, que são um limite superior da resistência. Para uma verificação completa (EN 1993-1-3), é preciso pedir ao setor técnico da Constálica:

- as **propriedades efetivas** de cada secção e disposição: W<sub>eff,y</sub> para momento positivo e negativo e I<sub>eff</sub>; ou
- as **tabelas de cargas admissíveis** para gravidade e sucção, por vão e esquema (simplesmente apoiada e contínua com sobreposição); ou
- o **Avis Technique SOCOTEC FAD 9495/1** citado no catálogo, que deverá incluir regras de cálculo;
- o comprimento de sobreposição recomendado sobre os apoios;
- a resistência das ligações M10 e ao esmagamento da alma nos apoios.

## 3. Madres Z e C: o que procurar num catálogo

Um catálogo útil para a app deve ter:

- dimensões completas (h, b, c do reforço, t, raio) e classe do aço (S350GD, S420GD...);
- propriedades brutas e **efetivas** (I<sub>eff</sub>, W<sub>eff,y</sub> para os dois sentidos da flexão), I<sub>t</sub>, I<sub>w</sub> e posição do centro de corte;
- idealmente, **tabelas de carga** para gravidade e sucção, com e sem tirantes, simples e contínuas (com mangas ou sobreposição).

Fornecedores encontrados na pesquisa (catálogos ainda por confirmar): O Feliz (Madre Z, de Z140 a Z300) e 361 Metal (madres C e Z), em Portugal; Hiansa, em Espanha. Fabricantes como a Metsec, a Kingspan (Multibeam) e a Hadley publicam documentação técnica completa, com tabelas de carga segundo a EN 1993-1-3.

## 4. Ideias anotadas para mais tarde

- Escolher o concelho e obter a zona de neve automaticamente (o NA–4.1(1) da NP EN 1991-1-3 tem a lista completa). A zona de vento não depende do concelho, mas da distância à costa e da altitude.
- Calcular c<sub>0</sub> pelo Anexo A.3 da NP EN 1991-1-4 (colinas, cadeias de colinas, falésias e escarpas), a partir de H, L<sub>u</sub>, L<sub>d</sub> e da posição do pavilhão em relação à crista.
- Coberturas de uma água (Quadros 7.3a e 7.3b da NP EN 1991-1-4).
- Coberturas em terraço com platibanda ou bordos arredondados (restantes linhas do Quadro 7.2).
- Situação acidental de neve excecional e acumulação de neve junto a platibandas e desníveis.
- Madres Z e C a partir dos catálogos, com propriedades efetivas.
- Fase 3: pórtico de duas águas com bases encastradas.
