import type { AnatomyItem } from "@/components/organisms/anatomy-showcase";

export const ANATOMY_ITEMS: AnatomyItem[] = [
  {
    key: "motor-brushless",
    label: "Motor brushless",
    description:
      "Fără perii — durabilitate cu 50% mai mare, consum redus și cuplu constant sub sarcină.",
    image: {
      src: "/images/dyllu-grinder-thermal.png",
      alt: "Motor brushless DYLLU vizualizat termic",
    },
  },
  {
    key: "carcasa-magneziu",
    label: "Carcasă magneziu",
    description:
      "Aliaj turnat sub presiune — rezistă la șocuri și disipează căldura mai bine decât plasticul.",
    image: {
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
      alt: "Carcasă din magneziu turnat — close-up",
    },
  },
  {
    key: "acumulator-li-ion",
    label: "Acumulator Li-Ion 18V",
    description:
      "Celule de înaltă densitate, indicator vizual al sarcinii și sistem activ de management termic.",
    image: {
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285509.webp",
      alt: "Acumulator Li-Ion DYLLU",
    },
  },
  {
    key: "anti-vibratie",
    label: "Sistem anti-vibrație",
    description:
      "Mâner cu amortizoare progresive — reduce oboseala mâinii pe ture lungi de lucru.",
    image: {
      src: "/images/grinder-sparks.jpeg",
      alt: "Polizor în lucru cu sistem anti-vibrație",
    },
  },
  {
    key: "lama-hss-co",
    label: "Lamă HSS-Co",
    description:
      "Oțel rapid cu cobalt — taie metale dure păstrând muchia. Recomandat pentru profesioniști.",
    image: {
      src: "/images/dyllu-consumables.png",
      alt: "Lame și burghie HSS-Co DYLLU",
    },
  },
  {
    key: "siguranta",
    label: "Echipament de protecție",
    description:
      "Mănuși cut-resistant și ochelari anti-impact certificate EN ISO — incluse cu pachetele Pro.",
    image: {
      src: "/images/dyllu-safety-gear.png",
      alt: "Echipament de protecție DYLLU",
    },
  },
];
