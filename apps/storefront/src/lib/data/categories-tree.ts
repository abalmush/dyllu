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
  children: CategoryNode[] = [],
  handleOverride?: string
): CategoryNode => ({
  name,
  handle: handleOverride ?? slug(name),
  children,
});

export const categoriesTree: CategoryNode[] = [
  node("Scule electrice"),
  node("Scule manuale"),
  node(
    "Sudură, compresoare și generatoare",
    [],
    "sudura-compresoare-generatoare"
  ),
  node("Grădină", [], "gradina"),
  node("Auto și Garaj", [], "auto-garaj"),
  node("Construcție", [], "constructie"),
  node("Casă, Iluminat și Pompe", [], "casa-iluminat-pompe"),
  node("Protecție și Îmbrăcăminte", [], "protectie-si-imbracaminte"),
  node("Accesorii și Consumabile", [], "accesorii-si-consumabile"),
  node("Depozitare"),
];
