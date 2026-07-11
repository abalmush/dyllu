export type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

const node = (name: string, handle: string): CategoryNode => ({
  name,
  handle,
  children: [],
});

export const categoriesTree: CategoryNode[] = [
  node("Scule electrice", "scule-electrice"),
  node("Scule manuale", "scule-manuale"),
  node("Consumabile și accesorii", "consumabile-si-accesorii"),
  node("Grădinărit", "gradinarit"),
  node("Auto și Moto", "auto-si-moto"),
  node("Construcții", "constructii"),
  node("Electrice", "electrice"),
  node("Protecție", "echipament-de-protectie"),
  node("Depozitare", "depozitare"),
];
