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
      { name: "Polizor unghiular (Flex)", handle: "polizor-unghiular-flex" },
      { name: "Mașini de găurit și înșurubat", handle: "masini-de-gaurit-si-insurubat" },
      { name: "Ciocan rotopercutor", handle: "ciocan-rotopercutor" },
      { name: "Ferăstraie electrice", handle: "ferastraie-electrice" },
      { name: "Mașină de șlefuit", handle: "masina-de-slefuit" },
      { name: "Compresor aer", handle: "compresor-aer" },
      { name: "Scule pneumatice", handle: "scule-pneumatice" },
      { name: "Pistoale de vopsit", handle: "pistoale-de-vopsit" },
      { name: "Aparat de sudură", handle: "aparat-de-sudura" },
      { name: "Aparat de spălat cu presiune", handle: "aparat-de-spalat-cu-presiune" },
      { name: "Generator electric", handle: "generator-electric" },
      { name: "Pistol aer cald", handle: "pistol-aer-cald" },
      { name: "Pistoale de lipit", handle: "pistoale-de-lipit" },
      { name: "Freză pentru lemn", handle: "freza-pentru-lemn" },
      { name: "Unelte multifuncționale", handle: "unelte-multifunctionale" },
      { name: "Seturi scule electrice", handle: "seturi-scule-electrice" },
      { name: "Betoniere", handle: "betoniere" },
      { name: "Scule industriale", handle: "scule-industriale" },
    ],
  },
  {
    name: "Scule manuale",
    handle: "scule-manuale",
    children: [
      { name: "Chei fixe", handle: "chei-fixe" },
      { name: "Set chei tubulare", handle: "set-chei-tubulare" },
      { name: "Chei imbus", handle: "chei-imbus" },
      { name: "Șurubelnițe", handle: "surubelnite" },
      { name: "Clești", handle: "clesti" },
      { name: "Ciocan", handle: "ciocan" },
      { name: "Menghine și cleme", handle: "menghine-si-cleme" },
      { name: "Ruletă", handle: "ruleta" },
      { name: "Nivelă", handle: "nivela" },
      { name: "Măsurare și trasare", handle: "masurare-si-trasare" },
      { name: "Cutter", handle: "cutter" },
      { name: "Foarfece", handle: "foarfece" },
      { name: "Ferăstrău manual", handle: "ferastrau-manual" },
      { name: "Șpaclu", handle: "spaclu" },
      { name: "Scule faianță", handle: "scule-faianta" },
      { name: "Dălți, rindele și pile", handle: "dalti-rindele-si-pile" },
      { name: "Capsatoare și nituitoare", handle: "capsatoare-si-nituitoare" },
      { name: "Pistoale silicon", handle: "pistoale-silicon" },
      { name: "Vopsire", handle: "vopsire" },
      { name: "Diverse scule manuale", handle: "diverse-scule-manuale" },
    ],
  },
  {
    name: "Consumabile și accesorii",
    handle: "consumabile-si-accesorii",
    children: [
      { name: "Discuri pentru flex", handle: "discuri-pentru-flex" },
      { name: "Burghie beton", handle: "burghie-beton" },
      { name: "Burghie metal", handle: "burghie-metal" },
      { name: "Burghie lemn", handle: "burghie-lemn" },
      { name: "Biți pentru șurubelniță", handle: "biti-pentru-surubelnita" },
      { name: "Pânze fierăstrău", handle: "panze-fierastrau" },
      { name: "Abrazive și perii", handle: "abrazive-si-perii" },
      { name: "Acumulatori pentru scule", handle: "acumulatori-pentru-scule" },
      { name: "Accesorii scule electrice", handle: "accesorii-scule-electrice" },
      { name: "Distanțieri faianță", handle: "distantieri-faianta" },
      { name: "Accesorii sudură", handle: "accesorii-sudura" },
      { name: "Lanț drujbă și fir motocoasă", handle: "lant-drujba-si-fir-motocoasa" },
      { name: "Chingi și coliere", handle: "chingi-si-coliere" },
      { name: "Diverse consumabile", handle: "diverse-consumabile" },
    ],
  },
  {
    name: "Grădinărit",
    handle: "gradinarit",
    children: [
      { name: "Motocoasă", handle: "motocoasa" },
      { name: "Drujbă", handle: "drujba" },
      { name: "Mașină de tuns iarba", handle: "masina-de-tuns-iarba" },
      { name: "Motocultor", handle: "motocultor" },
      { name: "Pompe de apă", handle: "pompe-de-apa" },
      { name: "Furtun grădină", handle: "furtun-gradina" },
      { name: "Suflantă frunze", handle: "suflanta-frunze" },
      { name: "Pulverizator", handle: "pulverizator" },
      { name: "Topor", handle: "topor" },
      { name: "Greblă", handle: "grebla" },
      { name: "Sapă", handle: "sapa" },
      { name: "Foarfecă pentru pomi", handle: "foarfeca-pentru-pomi" },
      { name: "Diverse grădină", handle: "diverse-gradina" },
    ],
  },
  {
    name: "Casă și curățenie",
    handle: "casa-si-curatenie",
    children: [
      { name: "Aspiratoare", handle: "aspiratoare" },
      { name: "Curățenie și accesorii", handle: "curatenie-si-accesorii" },
      { name: "Arzătoare cu gaz", handle: "arzatoare-cu-gaz" },
    ],
  },
  {
    name: "Auto și Moto",
    handle: "auto-si-moto",
    children: [
      { name: "Cric auto și trolii", handle: "cric-auto-si-trolii" },
      { name: "Compresor auto", handle: "compresor-auto" },
      { name: "Scule auto", handle: "scule-auto" },
      { name: "Redresor și tester baterie", handle: "redresor-si-tester-baterie" },
      { name: "Ungere și transfer lichide", handle: "ungere-si-transfer-lichide" },
    ],
  },
  {
    name: "Electrice",
    handle: "electrice",
    children: [
      { name: "Prelungitor", handle: "prelungitor" },
      { name: "Testere electrice", handle: "testere-electrice" },
      { name: "Proiectoare și iluminat", handle: "proiectoare-si-iluminat" },
    ],
  },
  {
    name: "Echipament de protecție",
    handle: "echipament-de-protectie",
    children: [
      { name: "Mănuși de lucru", handle: "manusi-de-lucru" },
      { name: "Bocanci de protecție", handle: "bocanci-de-protectie" },
      { name: "Protecția capului și feței", handle: "protectia-capului-si-fetei" },
      { name: "Îmbrăcăminte de protecție", handle: "imbracaminte-de-protectie" },
      { name: "Centură de siguranță", handle: "centura-de-siguranta" },
    ],
  },
  {
    name: "Depozitare",
    handle: "depozitare",
    children: [
      { name: "Cutii și organizatoare", handle: "cutii-si-organizatoare" },
      { name: "Geantă pentru scule", handle: "geanta-pentru-scule" },
      { name: "Rafturi și bancuri de lucru", handle: "rafturi-si-bancuri-de-lucru" },
      { name: "Lacăte și seifuri", handle: "lacate-si-seifuri" },
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
