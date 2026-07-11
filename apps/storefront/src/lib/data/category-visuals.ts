export type CategoryVisual = {
  handle: string;
  kicker: string;
  description: string;
  image: string;
  accent: "primary" | "neutral" | "dark";
};

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE ?? "https://images.unsplash.com";

const u = (path: string, w = 1200, q = 80) =>
  `${IMAGE_BASE}/${path}?auto=format&fit=crop&w=${w}&q=${q}`;

const local = {
  workshopWorker:
    "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
  multiToolCloseup:
    "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285509.webp",
  comboKit:
    "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
  grinderSparks: "/images/grinder-sparks.jpeg",
};

export const categoryVisuals: Record<string, CategoryVisual> = {
  "scule-electrice": {
    handle: "scule-electrice",
    kicker: "Putere pentru atelier",
    description:
      "Bormașini, flexuri, ciocane și seturi DYLLU pentru orice lucrare.",
    image: local.comboKit,
    accent: "dark",
  },
  "auto-si-moto": {
    handle: "auto-si-moto",
    kicker: "Atelier auto",
    description: "Echipamente, canistre și accesorii pentru garaj.",
    image: local.workshopWorker,
    accent: "dark",
  },
  "consumabile-si-accesorii": {
    handle: "consumabile-si-accesorii",
    kicker: "Consumabile pro",
    description: "Burghie, discuri și accesorii pentru lucrări precise.",
    image: local.multiToolCloseup,
    accent: "neutral",
  },
  "echipament-de-protectie": {
    handle: "echipament-de-protectie",
    kicker: "Siguranță întâi",
    description: "EIP certificat — căști, mănuși, ochelari, măști.",
    image: local.grinderSparks,
    accent: "primary",
  },
  constructii: {
    handle: "constructii",
    kicker: "Șantier DYLLU",
    description: "Utilaje beton, sanitare și echipamente de finisaj.",
    image: u("photo-1503602642458-232111445657"),
    accent: "neutral",
  },
  electrice: {
    handle: "electrice",
    kicker: "Electric & iluminat",
    description: "Prelungitoare, testere și proiectoare pentru lucru sigur.",
    image: local.multiToolCloseup,
    accent: "neutral",
  },
  gradinarit: {
    handle: "gradinarit",
    kicker: "Sezon de grădină",
    description: "Inventar și accesorii pentru grădină.",
    image: u("photo-1416879595882-3373a0480b5b"),
    accent: "neutral",
  },
  "scule-manuale": {
    handle: "scule-manuale",
    kicker: "Atelier de încredere",
    description: "Ciocane, șurubelnițe, chei și seturi profesionale.",
    image: local.comboKit,
    accent: "dark",
  },
  depozitare: {
    handle: "depozitare",
    kicker: "Ordine în atelier",
    description: "Cutii, organizatoare și soluții practice de depozitare.",
    image: local.workshopWorker,
    accent: "neutral",
  },
};

export const fallbackVisual: CategoryVisual = {
  handle: "default",
  kicker: "Selecție DYLLU",
  description: "Produse alese pentru profesioniști și pasionați.",
  image: local.comboKit,
  accent: "neutral",
};

export const getCategoryVisual = (handle: string): CategoryVisual =>
  categoryVisuals[handle] ?? { ...fallbackVisual, handle };
