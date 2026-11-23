/*
 * Madres Madremax® da Constálica (ómega com abas dobradas em V), aço S350GD + Z275 (EN 10346).
 * Ficheiro gerado por ferramentas/dados_madremax.py a partir do catálogo MKC002_0219 (docs/catalogos/, fora do git).
 * Não editar à mão.
 *
 * Propriedades da SECÇÃO BRUTA, tal como o catálogo as dá (sem efeitos de encurvadura local): por isso as Madremax
 * entram só no Identificar e no Catálogo, e não no dimensionamento das madres.
 * Dimensões (mm): H altura total, h1 altura dos furos da alma, b1 largura do topo, b2 entre as linhas de furação das
 * abas, b3 largura total nas pontas das abas, t espessura nominal (com o zinco), y1 centro de gravidade à base.
 * G (kg/m), A (cm²), desenv (desenvolvimento, mm), Iy, Iz (cm⁴), Wy, Wz (mínimos, cm³), iy, iz (cm).
 * Eixo y-y horizontal (flexão sob a carga da cobertura), z-z vertical.
 * duplas: disposições do catálogo com duas madres, encaixadas (zona de sobreposição) e costas com costas.
 */
var MADREMAX = {
  fabricante: "Constálica",
  aco: "S350GD",
  seccoes: [
    {"nome":"Madremax 50×1,5","serie":50,"H":54,"h1":25,"b1":36.5,"b2":100,"b3":130.8,"t":1.5,"y1":28.7,"G":2.43,"A":3.07,"desenv":207,"Iy":13.7,"Wy":4.8,"iy":2.11,"Iz":37.63,"Wz":5.75,"iz":3.5,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":55.5,"t":3,"y1":28.7,"G":4.86,"A":6.14,"Iy":27.4,"Wy":9.6,"iy":2.11,"Iz":75.25,"Wz":11.5,"iz":3.5},"costas":{"H":108,"t":1.5,"y1":54,"G":4.86,"A":6.14,"Iy":64.61,"Wy":11.96,"iy":3.34,"Iz":75.25,"Wz":11.5,"iz":3.5}}},
    {"nome":"Madremax 100×1,5","serie":100,"H":100,"h1":50,"b1":33.3,"b2":100,"b3":130.3,"t":1.5,"y1":52.6,"G":3.45,"A":4.41,"desenv":295,"Iy":59.5,"Wy":11.3,"iy":3.67,"Iz":47.55,"Wz":7.3,"iz":3.28,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":101.5,"t":3,"y1":52.6,"G":6.9,"A":8.82,"Iy":119,"Wy":22.6,"iy":3.67,"Iz":95.1,"Wz":14.6,"iz":3.28},"costas":{"H":200,"t":1.5,"y1":100,"G":6.9,"A":8.82,"Iy":307.64,"Wy":30.76,"iy":5.91,"Iz":95.1,"Wz":14.6,"iz":3.28}}},
    {"nome":"Madremax 150×1,5","serie":150,"H":145.5,"h1":75,"b1":45.2,"b2":150,"b3":183,"t":1.5,"y1":72,"G":4.84,"A":6.25,"desenv":414,"Iy":178.6,"Wy":24.8,"iy":5.35,"Iz":157.17,"Wz":17.18,"iz":5.01,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":147,"t":3,"y1":72,"G":9.68,"A":12.5,"Iy":357.2,"Wy":49.6,"iy":5.35,"Iz":314.33,"Wz":34.35,"iz":5.01},"costas":{"H":291,"t":1.5,"y1":145.5,"G":9.68,"A":12.5,"Iy":957.52,"Wy":65.81,"iy":8.75,"Iz":314.33,"Wz":34.35,"iz":5.01}}},
    {"nome":"Madremax 200×1,5","serie":200,"H":188.6,"h1":95.4,"b1":59.6,"b2":200,"b3":241.2,"t":1.5,"y1":94.9,"G":6.27,"A":7.91,"desenv":535,"Iy":373.4,"Wy":39.4,"iy":6.87,"Iz":345.09,"Wz":28.62,"iz":6.61,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":190.1,"t":3,"y1":94.9,"G":12.54,"A":15.82,"Iy":746.8,"Wy":78.8,"iy":6.87,"Iz":690.17,"Wz":57.23,"iz":6.61},"costas":{"H":377.2,"t":1.5,"y1":188.6,"G":12.54,"A":15.82,"Iy":2087.51,"Wy":110.68,"iy":11.49,"Iz":690.17,"Wz":57.23,"iz":6.61}}},
    {"nome":"Madremax 200×2,0","serie":200,"H":189.1,"h1":95.7,"b1":59.8,"b2":200,"b3":241.2,"t":2,"y1":96.4,"G":8.36,"A":10.54,"desenv":535,"Iy":479.2,"Wy":49.7,"iy":6.74,"Iz":448.2,"Wz":37.2,"iz":6.52,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":191.1,"t":4,"y1":96.4,"G":16.72,"A":21.09,"Iy":958.5,"Wy":99.4,"iy":6.74,"Iz":896.4,"Wz":74.3,"iz":6.52},"costas":{"H":378.2,"t":2,"y1":188.1,"G":16.72,"A":21.09,"Iy":2731.9,"Wy":145.2,"iy":11.38,"Iz":896.4,"Wz":74.3,"iz":6.52}}},
    {"nome":"Madremax 250×2,0","serie":250,"H":225.9,"h1":125.6,"b1":60,"b2":250,"b3":288.9,"t":2,"y1":109.2,"G":9.73,"A":12.39,"desenv":620,"Iy":818.5,"Wy":71.3,"iy":8.13,"Iz":827.79,"Wz":57.32,"iz":8.17,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":227.9,"t":4,"y1":109.2,"G":19.46,"A":24.78,"Iy":1637,"Wy":142.6,"iy":8.13,"Iz":1655.58,"Wz":114.63,"iz":8.17},"costas":{"H":451.8,"t":2,"y1":225.9,"G":19.46,"A":24.78,"Iy":4809.53,"Wy":212.91,"iy":13.93,"Iz":1655.58,"Wz":114.63,"iz":8.17}}},
    {"nome":"Madremax 250×2,5","serie":250,"H":226.4,"h1":126,"b1":60.1,"b2":250,"b3":288.9,"t":2.5,"y1":112.8,"G":12.16,"A":15.38,"desenv":620,"Iy":965.5,"Wy":85.6,"iy":7.92,"Iz":1018,"Wz":70.5,"iz":8.14,"furo":"Ø12×14","parafuso":"M10","duplas":{"encaixada":{"H":228.9,"t":5,"y1":112.8,"G":24.32,"A":30.76,"Iy":1930.9,"Wy":171.2,"iy":7.92,"Iz":2035.9,"Wz":141,"iz":8.14},"costas":{"H":452.8,"t":2.5,"y1":225.1,"G":24.32,"A":30.76,"Iy":5928,"Wy":263.3,"iy":13.88,"Iz":2035.9,"Wz":141,"iz":8.14}}},
    {"nome":"Madremax 300×2,5","serie":300,"H":279.2,"h1":123.8,"b1":62,"b2":250,"b3":311.3,"t":2.5,"y1":139.3,"G":14.6,"A":18.43,"desenv":745,"Iy":1784.6,"Wy":128.1,"iy":9.84,"Iz":1353.87,"Wz":86.98,"iz":8.57,"furo":"Ø14","parafuso":"M10/12","duplas":{"encaixada":{"H":281.7,"t":5,"y1":139.3,"G":29.2,"A":36.86,"Iy":3569.2,"Wy":256.2,"iy":9.84,"Iz":2707.74,"Wz":173.96,"iz":8.57},"costas":{"H":558.4,"t":2.5,"y1":279.2,"G":29.2,"A":36.86,"Iy":10378.09,"Wy":371.71,"iy":16.78,"Iz":2707.74,"Wz":173.96,"iz":8.57}}},
    {"nome":"Madremax 300×3,0","serie":300,"H":279.7,"h1":124,"b1":62.2,"b2":250,"b3":311.8,"t":3,"y1":143.1,"G":17.52,"A":22.24,"desenv":745,"Iy":2086.5,"Wy":145.8,"iy":9.69,"Iz":1587,"Wz":102.7,"iz":8.45,"furo":"Ø14","parafuso":"M10/12","duplas":{"encaixada":{"H":282.4,"t":6,"y1":143.1,"G":35.04,"A":44.48,"Iy":4172.9,"Wy":291.6,"iy":9.69,"Iz":3174,"Wz":205.4,"iz":8.45},"costas":{"H":558.8,"t":3,"y1":277.9,"G":35.04,"A":44.48,"Iy":12255,"Wy":441,"iy":16.6,"Iz":3174,"Wz":205.4,"iz":8.45}}}
  ]
};

if (typeof module !== "undefined") module.exports = MADREMAX;
