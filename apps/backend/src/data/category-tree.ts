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
      { name: "Bormașini și mașini de înșurubat", handle: "bormasini-si-masini-insurubat" },
      { name: "Polizoare unghiulare", handle: "polizoare-unghiulare" },
      { name: "Fierăstraie", handle: "fierastraie" },
      { name: "Mașini de șlefuit", handle: "masini-de-slefuit" },
      { name: "Ciocane rotopercutoare și demolatoare", handle: "ciocane-rotopercutoare-si-demolatoare" },
      { name: "Mașini de frezat și gravurat", handle: "masini-de-frezat-si-gravurat" },
      { name: "Pistoale de bătut cuie", handle: "pistoale-batut-cuie" },
      { name: "Fenuri industriale", handle: "fenuri-industriale" },
      { name: "Mașini multifuncționale", handle: "masini-multifunctionale" },
      { name: "Seturi pe acumulator", handle: "seturi-scule-baterie" },
    ],
  },
  {
    name: "Scule manuale",
    handle: "scule-manuale",
    children: [
      { name: "Chei și seturi", handle: "chei-si-seturi" },
      { name: "Șurubelnițe", handle: "surubelnite" },
      { name: "Clești", handle: "clesti" },
      { name: "Ciocane și topoare", handle: "ciocane-si-topoare" },
      { name: "Fierăstraie manuale", handle: "fierastraie-manuale" },
      { name: "Cuțite și lame", handle: "cutite-si-lame" },
      { name: "Foarfeci", handle: "foarfeci-manuale" },
      { name: "Spatule și șpacluri", handle: "spatule-si-spacluri" },
      { name: "Dălți", handle: "dalti" },
      { name: "Menghine", handle: "menghine" },
      { name: "Capsatoare și pistoale de nituri", handle: "capsatoare-si-pistoale-nituri" },
      { name: "Unelte pentru faianță și gresie", handle: "unelte-faianta-gresie" },
      { name: "Instrumente de măsurare", handle: "instrumente-masurare" },
      { name: "Ventuze", handle: "ventuze" },
      { name: "Perii", handle: "perii" },
    ],
  },
  {
    name: "Sudură, compresoare și generatoare",
    handle: "sudura-compresoare-generatoare",
    children: [
      { name: "Aparate de sudat", handle: "aparate-de-sudat" },
      { name: "Compresoare", handle: "compresoare" },
      { name: "Pneumatică", handle: "pneumatica" },
      { name: "Generatoare", handle: "generatoare" },
      { name: "Accesorii de sudură", handle: "accesorii-sudura" },
    ],
  },
  {
    name: "Grădină",
    handle: "gradina",
    children: [
      { name: "Motofierăstraie", handle: "motofierastraie" },
      { name: "Trimmere și cositoare", handle: "trimmere-si-cositoare" },
      { name: "Foarfeci de grădină", handle: "foarfeci-de-gradina" },
      { name: "Suflante de frunze", handle: "suflante-de-frunze" },
      { name: "Motocultoare", handle: "motocultoare" },
      { name: "Stropitori și pulverizatoare", handle: "stropitori-si-pulverizatoare" },
      { name: "Irigare", handle: "irigare" },
      { name: "Unelte de mână pentru grădină", handle: "unelte-mana-gradina" },
    ],
  },
  {
    name: "Auto și Garaj",
    handle: "auto-garaj",
    children: [
      { name: "Mașini de spălat cu presiune", handle: "masini-spalat-presiune" },
      { name: "Cricuri", handle: "cricuri" },
      { name: "Compresoare auto", handle: "compresoare-auto" },
      { name: "Mașini de lustruire", handle: "masini-de-lustruire" },
      { name: "Accesorii auto", handle: "accesorii-auto" },
      { name: "Canistre combustibil", handle: "canistre-combustibil" },
    ],
  },
  {
    name: "Construcție",
    handle: "constructie",
    children: [
      { name: "Betoniere și mixere", handle: "betoniere-si-mixere" },
      { name: "Vibratoare pentru beton", handle: "vibratoare-pentru-beton" },
      { name: "Compactoare și plăci vibrante", handle: "compactoare-si-placi-vibrante" },
      { name: "Elicoptere și rigle vibrante", handle: "elicoptere-si-rigle-vibrante" },
      { name: "Pulverizatoare și echipament de vopsire", handle: "pulverizatoare-si-vopsire" },
      { name: "Pistoale pentru construcție", handle: "pistoale-constructie" },
      { name: "Aspiratoare industriale", handle: "aspiratoare-industriale" },
    ],
  },
  {
    name: "Casă, Iluminat și Pompe",
    handle: "casa-iluminat-pompe",
    children: [
      { name: "Iluminat", handle: "iluminat" },
      { name: "Prelungitoare și cabluri electrice", handle: "prelungitoare" },
      { name: "Multimetre și testere", handle: "multimetre-si-testere" },
      { name: "Lăcate", handle: "lacate" },
      { name: "Aspiratoare casnice", handle: "aspiratoare-casnice" },
      { name: "Aparate de curățat cu aburi", handle: "aparate-curatat-aburi" },
      { name: "Tehnică sanitară", handle: "tehnica-sanitara" },
      { name: "Arzătoare și aprindere", handle: "arzatoare" },
      { name: "Pompe", handle: "pompe" },
    ],
  },
  {
    name: "Protecție și Îmbrăcăminte de lucru",
    handle: "protectie-si-imbracaminte",
    children: [
      { name: "Mănuși", handle: "manusi" },
      { name: "Mască și respiratoare", handle: "masti-si-respiratoare" },
      { name: "Ochelari de protecție", handle: "ochelari-de-protectie" },
      { name: "Căști de protecție", handle: "casti-de-protectie" },
      { name: "Încălțăminte și haine de lucru", handle: "incaltaminte-si-haine-de-lucru" },
    ],
  },
  {
    name: "Accesorii și Consumabile",
    handle: "accesorii-si-consumabile",
    children: [
      { name: "Acumulatori", handle: "acumulatori" },
      { name: "Încărcătoare", handle: "incarcatoare" },
      { name: "Burghie", handle: "burghie" },
      { name: "Bituri și capete de cheie", handle: "bituri-si-capete-cheie" },
      { name: "Lame, pânze și freze", handle: "lame-pinze-si-freze" },
      { name: "Discuri abrazive", handle: "discuri-abrazive" },
      { name: "Carote diamantate", handle: "carote-diamantate" },
      { name: "Benzi abrazive", handle: "benzi-abrazive" },
      { name: "Cabluri și frânghii", handle: "cabluri-si-franghii" },
    ],
  },
  {
    name: "Depozitare",
    handle: "depozitare",
    children: [
      { name: "Cutii pentru scule", handle: "cutii-pentru-scule" },
      { name: "Genți pentru scule", handle: "genti-pentru-scule" },
      { name: "Cărucioare și rafturi", handle: "carucioare-si-rafturi" },
      { name: "Bancuri de lucru", handle: "bancuri-de-lucru" },
    ],
  },
];

export const ALL_LEAF_HANDLES = new Set(
  CATEGORY_TREE.flatMap((root) => root.children.map((c) => c.handle))
);

export const ALL_ROOT_HANDLES = new Set(
  CATEGORY_TREE.map((root) => root.handle)
);

export const ROOT_HANDLE_BY_LEAF = new Map<string, string>(
  CATEGORY_TREE.flatMap((root) =>
    root.children.map((c) => [c.handle, root.handle] as const)
  )
);
