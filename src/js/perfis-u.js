/*
 * Perfis U laminados a quente — dimensões nominais da EN 10365:2017, tal como publicadas pelo fornecedor
 * J. Justino das Neves (UPN e UPE; aço S275JR e S355JR). A área e o peso do fornecedor servem só para
 * conferir o cálculo (testes/verificar.js); as propriedades calculam-se a partir destas dimensões em seccao.js.
 * UPN: banzos de face interior inclinada (8 % até ao UPN 300 e 5 % acima), com tf a meio da largura do banzo;
 *      cada linha: [designação, h, b, tw, tf, r1 (concordância alma-banzo), r2 (arredondamento da ponta)] em mm.
 * UPE: banzos paralelos; cada linha: [designação, h, b, tw, tf, r] em mm.
 */
var PERFIS_U = {
  UPN: {
    descricao: "Perfis U normais, de banzos inclinados",
    linhas: [
      ["UPN 50", 50, 38, 5, 7, 7, 3.5],
      ["UPN 65", 65, 42, 5.5, 7.5, 7.5, 4],
      ["UPN 80", 80, 45, 6, 8, 8, 4],
      ["UPN 100", 100, 50, 6, 8.5, 8.5, 4.5],
      ["UPN 120", 120, 55, 7, 9, 9, 4.5],
      ["UPN 140", 140, 60, 7, 10, 10, 5],
      ["UPN 160", 160, 65, 7.5, 10.5, 10.5, 5.5],
      ["UPN 180", 180, 70, 8, 11, 11, 5.5],
      ["UPN 200", 200, 75, 8.5, 11.5, 11.5, 6],
      ["UPN 220", 220, 80, 9, 12.5, 12.5, 6.5],
      ["UPN 240", 240, 85, 9.5, 13, 13, 6.5],
      ["UPN 260", 260, 90, 10, 14, 14, 7],
      ["UPN 280", 280, 95, 10, 15, 15, 7.5],
      ["UPN 300", 300, 100, 10, 16, 16, 8],
      ["UPN 320", 320, 100, 14, 17.5, 17.5, 8],
      ["UPN 350", 350, 100, 14, 16, 16, 8],
      ["UPN 380", 380, 102, 13.5, 16, 16, 8],
      ["UPN 400", 400, 110, 14, 18, 18, 9]
    ],
    // Área (cm²) e peso (kg/m) indicados pelo fornecedor, para conferência.
    fornecedor: { "UPN 50": [7.1, 5.6], "UPN 65": [9.0, 7.1], "UPN 80": [11.0, 8.6], "UPN 100": [13.5, 10.6], "UPN 120": [17.0, 13.4],
      "UPN 140": [20.4, 16.0], "UPN 160": [24.0, 18.8], "UPN 180": [28.0, 22.0], "UPN 200": [32.2, 25.3], "UPN 220": [37.4, 29.4],
      "UPN 240": [42.3, 33.2], "UPN 260": [48.3, 37.9], "UPN 280": [53.3, 41.8], "UPN 300": [58.8, 46.2], "UPN 320": [75.8, 59.5],
      "UPN 350": [77.3, 60.6], "UPN 380": [80.4, 63.1], "UPN 400": [91.5, 71.8] }
  },
  UPE: {
    descricao: "Perfis U de banzos paralelos",
    linhas: [
      ["UPE 80", 80, 50, 4, 7, 10],
      ["UPE 100", 100, 55, 4.5, 7.5, 10],
      ["UPE 120", 120, 60, 5, 8, 12],
      ["UPE 140", 140, 65, 5, 9, 12],
      ["UPE 160", 160, 70, 5.5, 9.5, 12],
      ["UPE 180", 180, 75, 5.5, 10.5, 12],
      ["UPE 200", 200, 80, 6, 11, 13],
      ["UPE 220", 220, 85, 6.5, 12, 13],
      ["UPE 240", 240, 90, 7, 12.5, 15],
      ["UPE 270", 270, 95, 7.5, 13.5, 15],
      ["UPE 300", 300, 100, 9.5, 15, 15],
      ["UPE 330", 330, 105, 11, 16, 18],
      ["UPE 360", 360, 110, 12, 17, 18],
      ["UPE 400", 400, 115, 13.5, 18, 18]
    ],
    fornecedor: { "UPE 80": [10.1, 7.9], "UPE 100": [12.5, 9.8], "UPE 120": [15.4, 12.1], "UPE 140": [18.4, 14.5], "UPE 160": [21.7, 17.0],
      "UPE 180": [25.1, 19.7], "UPE 200": [29.0, 22.8], "UPE 220": [33.9, 26.6], "UPE 240": [38.5, 30.2], "UPE 270": [44.8, 35.2],
      "UPE 300": [56.6, 44.4], "UPE 330": [67.8, 53.2], "UPE 360": [77.9, 61.2], "UPE 400": [91.9, 72.2] }
  }
};

if (typeof module !== "undefined") module.exports = PERFIS_U;
