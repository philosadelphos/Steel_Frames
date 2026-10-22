# Steel Frames

Aplicação web para identificar perfis metálicos laminados e apoiar o pré-dimensionamento de elementos em aço segundo a regulamentação europeia.

Funciona inteiramente no navegador (HTML, CSS e JavaScript, sem servidor nem instalação). Para usar localmente basta abrir `index.html`.

## O que faz hoje

**Identificar perfil.** Introduz-se a altura `h` e a largura `b` medidas em obra (e, opcionalmente, as espessuras `tw` e `tf`). A aplicação:

- ordena os perfis IPE, HEA, HEB e HEM pela proximidade às medidas e avisa quando duas séries são parecidas;
- desenha a secção à escala, com cotas e eixos y-y / z-z;
- mostra as propriedades estáticas (A, G, I, W<sub>el</sub>, W<sub>pl</sub>, i, A<sub>v,z</sub>, I<sub>t</sub>, I<sub>w</sub>, A<sub>L</sub>);
- classifica a secção (flexão e compressão) e calcula M<sub>c,y,Rd</sub>, N<sub>pl,Rd</sub> e V<sub>pl,z,Rd</sub> para a classe de aço escolhida.

**Catálogo.** Tabela completa de cada série, com acesso direto a cada perfil.

## Normas e fontes

| Tema | Referência |
| --- | --- |
| Dimensões dos perfis | EN 10365:2017 |
| Classificação e resistência de secções | NP EN 1993-1-1:2010 + Anexo Nacional (γ<sub>M0</sub> = γ<sub>M1</sub> = 1,0) |
| Classes de aço (f<sub>y</sub>, f<sub>u</sub>) | NP EN 1993-1-1, Quadro 3.1 · EN 10025-2 / EN 10025-3 |
| Torção (I<sub>t</sub> com concordâncias) | SCI P363 |

As propriedades são calculadas a partir das dimensões nominais, incluindo as concordâncias da alma com os banzos. `testes/verificar.js` compara os resultados com os valores publicados nos catálogos (diferenças inferiores a 0,5 %):

```
node testes/verificar.js
```

## Plano de desenvolvimento

1. **Identificação de perfis** a partir de medidas *(feito)*.
2. **Pré-dimensionamento de vigas**: esquemas de apoio, área de influência desenhada, cargas segundo a EN 1991-1-1 e combinações da EN 1990 (ELU e ELS), verificação de flexão, corte e flecha.
3. **Pré-dimensionamento de pilares**: esforço axial a partir das áreas de influência por piso, encurvadura por flexão (EC3 6.3.1, curvas de encurvadura) e flexão composta simplificada.
4. **Medição sobre fotografia**: carregar uma foto do perfil, calibrar a escala com um objeto de dimensão conhecida e marcar os pontos para obter `h`, `b`, `tw` e `tf`.
5. Mais séries: UPN, IPN, tubos SHS/RHS/CHS (EN 10210 / EN 10219).

## Estrutura

```
index.html        interface
css/style.css     estilos (tema claro e escuro)
js/perfis.js      dimensões nominais dos perfis (EN 10365)
js/seccao.js      propriedades e verificações do Eurocódigo 3
js/app.js         lógica da interface
testes/           verificação contra valores de catálogo
```

## Aviso

Ferramenta de apoio ao estudo e ao pré-dimensionamento. Não substitui o projeto de estruturas elaborado e assinado por técnico habilitado.
