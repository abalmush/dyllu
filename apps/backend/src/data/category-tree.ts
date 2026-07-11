export type CategoryLeaf = {
  name: string;
  handle: string;
};

export type CategoryRoot = {
  name: string;
  handle: string;
  children: CategoryLeaf[];
};

export const CATEGORY_TREE: CategoryRoot[] = [
  {
    name: "Scule electrice",
    handle: "scule-electrice",
    children: [
      {
        name: "Mașini de găurit și înșurubat",
        handle: "masini-de-gaurit-si-insurubat",
      },
      { name: "Ciocan rotopercutor", handle: "ciocan-rotopercutor" },
      { name: "Scule pneumatice", handle: "scule-pneumatice" },
      { name: "Aparat de sudură", handle: "aparat-de-sudura" },
      { name: "Spălător cu presiune", handle: "spalator-cu-presiune" },
      {
        name: "Polizor unghiular (Flex)",
        handle: "polizor-unghiular-flex",
      },
      { name: "Compresor aer", handle: "compresor-aer" },
      { name: "Ferăstraie electrice", handle: "ferastraie-electrice" },
      { name: "Mașină de șlefuit", handle: "masina-de-slefuit" },
      { name: "Generator electric", handle: "generator-electric" },
      { name: "Pistol aer cald", handle: "pistol-aer-cald" },
      {
        name: "Unelte multifuncționale",
        handle: "unelte-multifunctionale",
      },
      {
        name: "Seturi scule electrice",
        handle: "seturi-scule-electrice",
      },
      { name: "Freză pentru lemn", handle: "freza-pentru-lemn" },
    ],
  },
  {
    name: "Scule manuale",
    handle: "scule-manuale",
    children: [
      { name: "Șurubelnițe", handle: "surubelnite" },
      { name: "Chei fixe", handle: "chei-fixe" },
      { name: "Clești", handle: "clesti" },
      { name: "Menghine și cleme", handle: "menghine-si-cleme" },
      { name: "Ciocan", handle: "ciocan" },
      { name: "Nivelă", handle: "nivela" },
      { name: "Set chei tubulare", handle: "set-chei-tubulare" },
      { name: "Șpaclu", handle: "spaclu" },
      { name: "Scule faianță", handle: "scule-faianta" },
      { name: "Ferăstrău manual", handle: "ferastrau-manual" },
      {
        name: "Diverse scule manuale",
        handle: "diverse-scule-manuale",
      },
      { name: "Foarfece", handle: "foarfece" },
      {
        name: "Măsurare și trasare",
        handle: "masurare-si-trasare",
      },
      { name: "Cutter", handle: "cutter" },
      {
        name: "Dălți, rindele și pile",
        handle: "dalti-rindele-si-pile",
      },
      { name: "Chei imbus", handle: "chei-imbus" },
      {
        name: "Capsatoare și nituitoare",
        handle: "capsatoare-si-nituitoare",
      },
      { name: "Ruletă", handle: "ruleta" },
    ],
  },
  {
    name: "Consumabile și accesorii",
    handle: "consumabile-si-accesorii",
    children: [
      { name: "Discuri pentru flex", handle: "discuri-pentru-flex" },
      { name: "Pânze fierăstrău", handle: "panze-fierastrau" },
      {
        name: "Lanț drujbă și fir motocoasă",
        handle: "lant-drujba-si-fir-motocoasa",
      },
      { name: "Burghie beton", handle: "burghie-beton" },
      {
        name: "Biți pentru șurubelniță",
        handle: "biti-pentru-surubelnita",
      },
      { name: "Distanțieri faianță", handle: "distantieri-faianta" },
      {
        name: "Accesorii scule electrice",
        handle: "accesorii-scule-electrice",
      },
      { name: "Burghie metal", handle: "burghie-metal" },
      { name: "Accesorii sudură", handle: "accesorii-sudura" },
      {
        name: "Acumulatori pentru scule",
        handle: "acumulatori-pentru-scule",
      },
      { name: "Chingi și coliere", handle: "chingi-si-coliere" },
      { name: "Abrazive și perii", handle: "abrazive-si-perii" },
      { name: "Diverse consumabile", handle: "diverse-consumabile" },
      { name: "Burghie lemn", handle: "burghie-lemn" },
    ],
  },
  {
    name: "Grădinărit",
    handle: "gradinarit",
    children: [
      { name: "Pulverizator", handle: "pulverizator" },
      { name: "Pompe de apă", handle: "pompe-de-apa" },
      {
        name: "Foarfecă pentru pomi",
        handle: "foarfeca-pentru-pomi",
      },
      { name: "Suflantă frunze", handle: "suflanta-frunze" },
      { name: "Furtun grădină", handle: "furtun-gradina" },
      { name: "Motocultor", handle: "motocultor" },
      {
        name: "Mașină de tuns iarba",
        handle: "masina-de-tuns-iarba",
      },
      { name: "Motocoasă", handle: "motocoasa" },
      { name: "Topor", handle: "topor" },
      { name: "Diverse grădină", handle: "diverse-gradina" },
      { name: "Greblă", handle: "grebla" },
      { name: "Sapă", handle: "sapa" },
      { name: "Drujbă", handle: "drujba" },
    ],
  },
  {
    name: "Auto și Moto",
    handle: "auto-si-moto",
    children: [
      { name: "Cric auto și trolii", handle: "cric-auto-si-trolii" },
      {
        name: "Ungere și transfer lichide",
        handle: "ungere-si-transfer-lichide",
      },
      { name: "Scule auto", handle: "scule-auto" },
      { name: "Compresor auto", handle: "compresor-auto" },
      {
        name: "Redresor și tester baterie",
        handle: "redresor-si-tester-baterie",
      },
    ],
  },
  {
    name: "Construcții",
    handle: "constructii",
    children: [
      { name: "Utilaje beton", handle: "utilaje-beton" },
      { name: "Vopsire", handle: "vopsire" },
      {
        name: "Instalații sanitare",
        handle: "instalatii-sanitare",
      },
      {
        name: "Aspiratoare industriale",
        handle: "aspiratoare-industriale",
      },
      { name: "Pistoale silicon", handle: "pistoale-silicon" },
    ],
  },
  {
    name: "Electrice",
    handle: "electrice",
    children: [
      { name: "Testere electrice", handle: "testere-electrice" },
      { name: "Prelungitor", handle: "prelungitor" },
      {
        name: "Proiectoare și iluminat",
        handle: "proiectoare-si-iluminat",
      },
    ],
  },
  {
    name: "Protecție",
    handle: "echipament-de-protectie",
    children: [
      {
        name: "Bocanci de protecție",
        handle: "bocanci-de-protectie",
      },
      {
        name: "Protecția capului și feței",
        handle: "protectia-capului-si-fetei",
      },
      { name: "Mănuși de lucru", handle: "manusi-de-lucru" },
      {
        name: "Îmbrăcăminte de protecție",
        handle: "imbracaminte-de-protectie",
      },
      {
        name: "Centură de siguranță",
        handle: "centura-de-siguranta",
      },
    ],
  },
  {
    name: "Depozitare",
    handle: "depozitare",
    children: [
      { name: "Lacăte și seifuri", handle: "lacate-si-seifuri" },
      {
        name: "Rafturi și bancuri de lucru",
        handle: "rafturi-si-bancuri-de-lucru",
      },
      {
        name: "Cutii și organizatoare",
        handle: "cutii-si-organizatoare",
      },
      { name: "Geantă pentru scule", handle: "geanta-pentru-scule" },
    ],
  },
];

export const ALL_LEAF_HANDLES = new Set(
  CATEGORY_TREE.flatMap((root) => root.children.map((child) => child.handle))
);

export const ALL_ROOT_HANDLES = new Set(
  CATEGORY_TREE.map((root) => root.handle)
);

export const ROOT_HANDLE_BY_LEAF = new Map<string, string>(
  CATEGORY_TREE.flatMap((root) =>
    root.children.map((child) => [child.handle, root.handle] as const)
  )
);
