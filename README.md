# Steel Frames

Aplicação web para **identificar perfis metálicos** e **pré-dimensionar madres de cobertura** de pavilhões industriais, segundo os Eurocódigos com os Anexos Nacionais portugueses.

**[Abrir a app → philosadelphos.github.io/Steel_Frames](https://philosadelphos.github.io/Steel_Frames/)**

Funciona no navegador do computador e do telemóvel, sem instalação nem servidor. No telemóvel, use *Adicionar ao ecrã principal* para a ter como uma app.

![Madres de cobertura: resultado da verificação e esquiços](docs/imagens/madres.png)

## O que faz

### Identificar perfil

Introduz-se a altura `h` e a largura `b` medidas em obra e, se quiser, as espessuras `tw` e `tf`. A app:

- ordena os perfis IPE, HEA, HEB e HEM pela proximidade às medidas e avisa quando duas séries são parecidas;
- desenha a secção à escala, com cotas e eixos y-y / z-z;
- mostra as propriedades (A, G, I, W<sub>el</sub>, W<sub>pl</sub>, i, A<sub>v,z</sub>, I<sub>t</sub>, I<sub>w</sub> e área a pintar por metro);
- classifica a secção e calcula M<sub>c,y,Rd</sub>, N<sub>pl,Rd</sub> e V<sub>pl,z,Rd</sub> para S235, S275, S355 ou S460.

![Identificação de um perfil a partir das medidas](docs/imagens/identificar.png)

### Madres de cobertura

Pré-dimensionamento de madres de uma cobertura de duas águas em Portugal continental:

- **Ações:**
  - peso do revestimento (painel sandwich, chapa, fibrocimento) e das instalações;
  - sobrecarga de cobertura (categoria H);
  - **neve** (zonas Z1 a Z3 e altitude);
  - **vento** (zonas A e B, categorias de terreno I a IV, coeficientes de pressão das zonas F a J, pressão interior).
- **Esquiços:** planta com a faixa de influência da madre e corte com as cargas de gravidade e de sucção.
- **Combinações:** ELU e características da NP EN 1990, incluindo a **sucção do vento**, que comprime o banzo inferior das madres.
- **Madres IPE:** verificação completa (flexão desviada, bambeamento, esforço transverso, flechas L/200 e L/250) e escolha do perfil mais leve.
- **Madres enformadas a frio da O Feliz (Superomega®, C e Z):** verificação pela EN 1993-1-3, 10.1, com as propriedades efetivas do fabricante:
  - flexão com o banzo superior travado pelo revestimento e o banzo inferior livre (carga lateral k<sub>h</sub> q e encurvadura do banzo livre);
  - restrição do revestimento opcional (C<sub>D</sub>), corte e, no Superomega apoiado pelas abas, reação no apoio;
  - continuidade nos apoios: madre contínua ou sobreposição (empalme), com o comprimento medido como dado opcional.

<p align="center"><img src="docs/imagens/esquicos.png" alt="Esquiços da planta e do corte com as cargas" width="560"> <img src="docs/imagens/telemovel.png" alt="Resultado no telemóvel" width="260"></p>

### Catálogo

Tabelas completas das séries IPE, HEA, HEB e HEM (calculadas a partir das dimensões da EN 10365) e das madres Superomega, C e Z da O Feliz (valores do fabricante).

## Normas e fontes

| Tema | Referência |
| --- | --- |
| Dimensões dos perfis | EN 10365:2017 |
| Classificação, resistência e bambeamento | NP EN 1993-1-1:2010 + Anexo Nacional |
| Classes de aço | EN 10025-2 / EN 10025-3 (f<sub>y</sub> e f<sub>u</sub> por escalão de espessura, NA–3.2.1(1) da NP EN 1993-1-1) · EN 10346 |
| Neve | NP EN 1991-1-3:2009 + Anexo Nacional |
| Vento | NP EN 1991-1-4:2010 + Anexo Nacional |
| Sobrecarga de cobertura | NP EN 1991-1-1:2009 + Anexo Nacional |
| Combinações de ações | NP EN 1990:2009 + Anexo Nacional |
| Torção e momento crítico | SCI P363 · NCCI SN003 |
| Madres enformadas a frio | EN 1993-1-3:2006 (valores recomendados, sem Anexo Nacional português) · catálogos e desenhos O Feliz (Superomega®, madres C e Z) |

As propriedades dos perfis laminados são calculadas a partir das dimensões nominais e coincidem com os catálogos ArcelorMittal (diferenças inferiores a 0,5 %). Os valores dos Anexos Nacionais foram conferidos com o texto das NP EN 1990, 1991-1-1, 1991-1-3, 1991-1-4 e 1993-1-1. A lista, com a cláusula de cada valor e o que ainda falta fazer, está em **[docs/pendentes.md](docs/pendentes.md)**.

## Plano

1. Identificação de perfis *(feito)*.
2. Madres de cobertura em IPE *(feito)* e em Superomega, C e Z da O Feliz *(feito)*. A seguir: cálculo de c<sub>0</sub> pelo Anexo A.3, zona de neve pelo concelho e coberturas de uma água.
3. **Pórtico de duas águas** com bases encastradas: esforços na travessa e nos pilares, flexão composta com encurvadura e bambeamento (EC3 6.3.3), deslocamentos.
4. Pilares de empena, madres de fachada e contraventamentos, com UPN, cantoneiras e tubos SHS/RHS/CHS.
5. Medição sobre fotografia: calibrar a escala com um objeto de dimensão conhecida e marcar os pontos do perfil.

## Como usar sem internet

Descarregue o ficheiro [`index.html`](index.html) (botão *Download raw file*) e abra-o no navegador do computador. É um ficheiro único, com tudo incluído. Sem ligação, só os tipos de letra passam a ser os do sistema. No telemóvel use o endereço da app: no iPhone, por exemplo, a pré-visualização da app Ficheiros não executa o JavaScript de um `.html` descarregado.

## Desenvolvimento

```
index.html               app num ficheiro único (gerado, não editar)
src/index.html           interface
src/css/style.css        estilos (tema claro e escuro)
src/js/perfis.js         dimensões nominais dos perfis (EN 10365)
src/js/seccao.js         propriedades e verificações do Eurocódigo 3
src/js/ofeliz.js         dados O Feliz: Superomega, C e Z (gerado)
src/js/acoes.js          neve, vento e combinações (Anexos Nacionais)
src/js/madres.js         verificação e escolha de madres IPE
src/js/enformados.js     madres enformadas a frio (EN 1993-1-3, 10.1)
src/js/app.js            interface: identificação e catálogo
src/js/vista-madres.js   interface: madres de cobertura
ferramentas/construir.js gera index.html a partir de src/
ferramentas/dados_ofeliz.py gera src/js/ofeliz.js a partir dos ficheiros do fabricante
testes/verificar.js      propriedades contra valores de catálogo
testes/madres.js         ações e madres IPE
testes/enformados.js     madres enformadas a frio e dados O Feliz
docs/pendentes.md        valores a conferir com as normas e próximos passos
```

O código edita-se em `src/`, e durante o desenvolvimento pode abrir-se `src/index.html` diretamente. Depois de cada alteração:

```
node ferramentas/construir.js
node testes/verificar.js
node testes/madres.js
node testes/enformados.js
```

O GitHub Actions corre as mesmas verificações em cada Pull Request e falha se `index.html` não tiver sido gerado de novo.

## Aviso

Ferramenta de apoio ao estudo e ao pré-dimensionamento. Não substitui o projeto de estruturas elaborado e assinado por técnico habilitado.
