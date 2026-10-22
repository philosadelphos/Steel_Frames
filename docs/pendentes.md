# Pendentes

Lista do que falta confirmar ou fazer. Os coeficientes de pressão do vento já foram conferidos com a NP EN 1991-1-4. Os restantes valores normativos foram confirmados em fontes secundárias, porque o texto das normas não estava acessível: apontamentos e teses do IST, ISEL, FEUP e UNL, justificações de cálculo de software (CYPE) e exemplos resolvidos. Antes de usar a app num projeto, convém conferi-los com as normas.

## 1. Valores a conferir com as normas

**Onde obter as normas.** As NP EN vendem-se no IPQ (Instituto Português da Qualidade). As bibliotecas das faculdades de engenharia e do LNEC costumam ter exemplares para consulta. Muitas empresas de projeto também as têm.

**Como conferir.** Basta marcar ☐ → ☑ em cada linha. Se algum valor estiver diferente, diga qual: está tudo concentrado num só sítio do código (indicado em cada secção).

### NP EN 1991-1-4:2010 + Anexo Nacional (vento) — `src/js/acoes.js`

**Coeficientes de pressão exterior: conferidos.** Em 22/10/2026, os valores de c<sub>pe,10</sub> e c<sub>pe,1</sub> usados pela app foram conferidos, um a um, com os Quadros 7.2 (coberturas em terraço, bordos em aresta viva), 7.4a (duas vertentes, θ = 0°, inclinações de 5° a 45°) e 7.4b (duas vertentes, θ = 90°) da norma. Os quadros não são reproduzidos neste repositório. Também se confirmou que a app segue as notas do Quadro 7.4a: só interpola entre valores do mesmo sinal, não interpola entre −5° e +5° (usa o Quadro 7.2 abaixo de 5°) e considera os valores positivos e negativos.

Ainda por conferir:

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| v<sub>b,0</sub> zona A / zona B | 27 / 30 m/s | AN 4.2(1)P | ☐ |
| Definição da zona B (continente) | faixa costeira de 5 km ou altitude > 600 m | AN 4.2(1)P | ☐ |
| Vales e estuários com exposição desfavorável tratados como zona B | sim (opção na app) | AN ou só no antigo RSA, art. 20? | ☐ |
| c<sub>dir</sub>, c<sub>season</sub> | 1,0 | 4.2(2)P | ☐ |
| Categorias de terreno I a IV: z<sub>0</sub> / z<sub>min</sub> | 0,005/1 · 0,05/3 · 0,3/8 · 1,0/15 m | Quadro NA-4.1 | ☐ |
| k<sub>r</sub> = 0,19 (z<sub>0</sub>/0,05)<sup>0,07</sup> | sem alteração no AN | 4.3.2 | ☐ |
| ρ, k<sub>I</sub>, c<sub>0</sub> | 1,25 kg/m³, 1,0, 1,0 | 4.5, 4.4, 4.3.3 | ☐ |
| c<sub>pi</sub> sem aberturas dominantes | +0,2 / −0,3 | 7.2.9(6) | ☐ |
| Interpolação de c<sub>pe</sub> para 1 m² < A < 10 m² | c<sub>pe,1</sub> − (c<sub>pe,1</sub> − c<sub>pe,10</sub>) log<sub>10</sub> A | 7.2.1, AN | ☐ |
| c<sub>s</sub>c<sub>d</sub> | 1,0 (edifícios com h < 15 m) | 6.2(1) | ☐ |

### NP EN 1991-1-3:2009 + Anexo Nacional (neve) — `src/js/acoes.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| s<sub>k</sub> | C<sub>z</sub> [1 + (H/500)²] kN/m² | AN 4.1(1) | ☐ |
| C<sub>z</sub> zonas Z1 / Z2 / Z3 | 0,30 / 0,20 / 0,10 | AN 4.1(1) | ☐ |
| Zonas por concelho | escolha manual na app | Quadro/Figura do AN | ☐ |
| Neve excecional (C<sub>esl</sub> = 2,5) só em Aguiar da Beira, Fornos de Algodres, Mangualde, Nelas, Penalva do Castelo, Sátão e Viseu | aviso na app, não calculada | AN 4.1(2), 4.3(1) | ☐ |
| μ<sub>1</sub> (duas águas) | 0,8 até 30°, linear até 0 a 60° | Quadro 5.2 | ☐ |
| C<sub>e</sub> / C<sub>t</sub> | 0,8 · 1,0 · 1,2 / 1,0 | Quadro 5.1, 5.2(8) | ☐ |

### NP EN 1991-1-1:2009 e NP EN 1990:2009 + Anexos Nacionais (sobrecarga e combinações) — `src/js/acoes.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| Sobrecarga em coberturas da categoria H | q<sub>k</sub> = 0,4 kN/m² em projeção horizontal (Q<sub>k</sub> = 1,0 kN) | Quadro NA-6.10 | ☐ |
| Área A em que q<sub>k</sub> atua | toda a faixa de influência (do lado da segurança) | Quadro 6.10, nota 3 | ☐ |
| Sobrecarga não combinada com neve nem vento | sim | 3.3.2(1) | ☐ |
| Expressão das combinações ELU | 6.10 | NP EN 1990 AN, A1.3.1 | ☐ |
| γ<sub>G,sup</sub> / γ<sub>G,inf</sub> / γ<sub>Q</sub> | 1,35 / 1,00 / 1,50 | Quadro A1.2(B) | ☐ |
| ψ<sub>0</sub> categoria H / neve (H ≤ 1000 m) / neve (H > 1000 m) / vento | 0 / 0,5 / 0,7 / 0,6 | Quadro A1.1 | ☐ |

### NP EN 1993-1-1:2010 + Anexo Nacional (aço) — `src/js/seccao.js`, `src/js/madres.js`

| Parâmetro | Valor usado | Referência | Conferido |
|---|---|---|---|
| γ<sub>M0</sub> / γ<sub>M1</sub> | 1,00 / 1,00 | AN 6.1(1) | ☐ |
| Flechas em coberturas em geral | δ<sub>max</sub> ≤ L/200, δ<sub>2</sub> ≤ L/250 | Quadro NA.I | ☐ |
| Método de bambeamento | caso geral 6.3.2.2 (o AN adota 6.3.2.3, com λ<sub>LT,0</sub> = 0,4 e β = 0,75? Se sim, a app pode passar a usá-lo, com resultados menos conservadores) | AN 6.3.2.3 | ☐ |

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

- Escolher o concelho e obter a zona de neve e a zona de vento automaticamente.
- Coberturas de uma água (Quadros 7.3a e 7.3b da NP EN 1991-1-4).
- Coberturas em terraço com platibanda ou bordos arredondados (restantes linhas do Quadro 7.2).
- Situação acidental de neve excecional e acumulação de neve junto a platibandas e desníveis.
- Madres Z e C a partir dos catálogos, com propriedades efetivas.
- Fase 3: pórtico de duas águas com bases encastradas.
