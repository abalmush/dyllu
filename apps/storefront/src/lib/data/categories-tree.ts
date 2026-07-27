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
  node("Scule de mână", "scule-de-mana"),
  node("Accesorii și consumabile", "accesorii-si-consumabile"),
  node("Grădină și agricultură", "gradina-si-agricultura"),
  node("Construcții și finisaje", "constructii-si-finisaje"),
  node("Energie și electricitate", "energie-si-electricitate"),
  node("Auto și service", "auto-si-service"),
  node("Compresoare și pneumatice", "compresoare-si-pneumatice"),
  node("Sudură și lipire", "sudura-si-lipire"),
  node("Pompe și instalații", "pompe-si-instalatii"),
  node("Echipamente de protecție", "echipamente-de-protectie"),
  node("Atelier, depozitare și manipulare", "atelier-depozitare-si-manipulare"),
  node("Curățenie și gospodărie", "curatenie-si-gospodarie"),
  node("Măsurare și detectare", "masurare-si-detectare"),
];
