export const gifts = [
  {
    id: 1,
    name: "Pulsera personalizada",
    category: "UN RECUERDO ESPECIAL",
    cost: 0,
    description: "Un detalle único, con el color y el nombre de cada dama.",
    details: [
      "Acero inoxidable 314, según la propuesta.",
      "Color personalizado para cada dama.",
      "Tarjeta con su nombre e impresión calidad foto.",
      "Incluye caja de regalo; el color de la caja puede variar.",
    ],
    pages: [1, 2],
  },
  {
    id: 2,
    name: "Aros hechos a mano",
    category: "DISEÑO ARTESANAL",
    cost: 0,
    description:
      "Arcilla polimérica, colores a elección y una caja especial del club.",
    details: [
      "Un par de aros de arcilla polimérica hechos a mano.",
      "Color y diseño a elección; fecha de catálogo por definir.",
      "Base de acero quirúrgico y caja con logo del club, de 10 × 10 cm aprox.",
      "Versión de plata para alergias, con costo adicional no especificado.",
      "Mínimo de 30 unidades para imprimir cajas con logo.",
    ],
    pages: [3, 4, 5, 6, 7],
  },
  {
    id: 3,
    name: "Box de mini cuchuflíes",
    category: "UN DULCE DETALLE",
    cost: 0,
    description:
      "Diez mini cuchuflíes tradicionales de Don Cuchuflí, para compartir.",
    details: [
      "Caja con 10 mini cuchuflíes tradicionales.",
      "Barquillo crujiente, chocolate semiamargo en el interior y relleno de manjar.",
      "Incluye tarjeta de agradecimiento para cada invitada.",
      "Don Cuchuflí: más de 70 años de tradición familiar.",
    ],
    pages: [8, 9],
  },
  {
    id: 4,
    name: "Cepillo rizos suaves",
    category: "REVLON · CUIDADO PERSONAL",
    cost: 0,
    description:
      "Cepillo redondo con tecnología iónica para dar forma, brillo y volumen.",
    details: [
      "Modelo RV2931LADI2.",
      "Revestimiento de cerámica y tecnología iónica.",
      "Ideal para cabellos finos o normales.",
      "Barril de 1 ¾ pulgadas, cerdas de metal y cuerpo de aluminio.",
      "Mango fabricado en goma.",
    ],
    pages: [10],
  },
  {
    id: 5,
    name: "Secador compacto iónico",
    category: "REVLON · CUIDADO PERSONAL",
    cost: 2000,
    description:
      "Un secador compacto y liviano, de 1875 W, para el cuidado diario.",
    details: [
      "Potencia de 1875 W; 220–240 V / 50–60 Hz.",
      "Tecnología iónica.",
      "Dos temperaturas y dos velocidades.",
      "Filtro removible y botón de aire frío.",
      "Anillo para colgar y cable de 1,5 m.",
      "La propuesta muestra negro, rosa y blanco; disponibilidad por confirmar.",
    ],
    pages: [11],
  },
  {
    id: 6,
    name: "Secador Control Frizz",
    category: "REVLON · CUIDADO PERSONAL",
    cost: 4000,
    description:
      "Potencia de 2000 W y tecnología iónica para ayudar a controlar el frizz.",
    details: [
      "Potencia de 2000 W; 220–240 V / 50–60 Hz.",
      "Tres temperaturas y tres velocidades.",
      "Filtro removible, concentrador de aire y botón de aire frío.",
      "Anillo para colgar y cable de 1,8 m.",
      "La propuesta muestra negro, púrpura y rosa; disponibilidad por confirmar.",
    ],
    pages: [12],
  },
  {
    id: 7,
    name: "Alisadora de cerámica",
    category: "REVLON · CUIDADO PERSONAL",
    cost: 5000,
    description:
      "Placas de 2 pulgadas y temperatura ajustable para un acabado suave.",
    details: [
      "Modelo RVST2182LA2.",
      "Placas de 2 pulgadas con recubrimiento de cerámica.",
      "Temperatura máxima de 204 °C y múltiples niveles ajustables.",
      "Calentamiento rápido y apagado automático.",
      "Voltaje universal 220–240 V; potencia de 50 W.",
      "Cable giratorio para facilitar el manejo.",
    ],
    pages: [13],
  },
];
export type Gift = (typeof gifts)[number];
export const money = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
