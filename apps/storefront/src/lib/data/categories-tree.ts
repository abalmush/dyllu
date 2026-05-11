export type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/ș/g, "s")
    .replace(/ş/g, "s")
    .replace(/ț/g, "t")
    .replace(/ţ/g, "t")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const node = (
  name: string,
  children: CategoryNode[] = []
): CategoryNode => ({
  name,
  handle: slug(name),
  children,
});

export const categoriesTree: CategoryNode[] = [
  node("Auto, Moto", [
    node("Canistre"),
    node("Echipamente auto și pentru garaj", [node("Cutii pentru accesorii")]),
  ]),
  node("Consumabile", [
    node("Burghiuri și duze", [
      node("Burghie"),
      node("Burghie pe beton SDS+"),
    ]),
    node("Creioane, markere p/u construcție"),
    node("Pentru șlefuire și polizare", [
      node("Discuri", [node("Discuri pe metal")]),
    ]),
  ]),
  node("Echipamente de protecție", [
    node("Căști sunet"),
    node("Mănuși"),
    node("Ochelari de protecție"),
    node("Respiratoare și măști de protecție"),
  ]),
  node("Gospodărie întreținere", [node("Lăcăți")]),
  node("Grădinărit", [
    node("Inventar și elemente de grădinărit", [node("Inventar de grădină")]),
  ]),
  node("Scule manuale", [
    node("Capsatoare și pistoale nituri"),
    node("Chei și seturi de instrumente", [node("Seturi de instrumente")]),
    node("Ciocane, topoare"),
    node("Clești și freze laterale"),
    node("Cuțite și lame"),
    node("Dălți"),
    node("Ferestraie manuale"),
    node("Foarfeci pentru metal"),
    node("Instrumente pentru măsurare", [node("Nivele manuale")]),
    node("Menghine"),
    node("Spatule"),
    node("Șurubelnițe, seturi de șurubelnițe"),
  ]),
];
