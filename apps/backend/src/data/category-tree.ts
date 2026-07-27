export type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    "name": "Accesorii și consumabile",
    "handle": "accesorii-si-consumabile",
    "children": [
      {
        "name": "Accesorii pentru scule electrice",
        "handle": "accesorii-pentru-scule-electrice",
        "children": []
      },
      {
        "name": "Acumulatori și încărcătoare",
        "handle": "acumulatori-si-incarcatoare",
        "children": []
      },
      {
        "name": "Fixare, lipire și etanșare",
        "handle": "fixare-lipire-si-etansare",
        "children": []
      },
      {
        "name": "Găurire și înșurubare",
        "handle": "gaurire-si-insurubare",
        "children": []
      },
      {
        "name": "Tăiere și prelucrare",
        "handle": "taiere-si-prelucrare",
        "children": []
      },
      {
        "name": "Tăiere, șlefuire și lustruire",
        "handle": "taiere-slefuire-si-lustruire",
        "children": []
      }
    ]
  },
  {
    "name": "Atelier, depozitare și manipulare",
    "handle": "atelier-depozitare-si-manipulare",
    "children": [
      {
        "name": "Depozitare scule",
        "handle": "depozitare-scule",
        "children": []
      },
      {
        "name": "Mobilier de atelier",
        "handle": "mobilier-de-atelier",
        "children": []
      },
      {
        "name": "Transport și manipulare",
        "handle": "transport-si-manipulare",
        "children": []
      }
    ]
  },
  {
    "name": "Auto și service",
    "handle": "auto-si-service",
    "children": [
      {
        "name": "Baterii auto",
        "handle": "baterii-auto",
        "children": []
      },
      {
        "name": "Remorcare și ancorare",
        "handle": "remorcare-si-ancorare",
        "children": []
      },
      {
        "name": "Ridicare și susținere auto",
        "handle": "ridicare-si-sustinere-auto",
        "children": []
      },
      {
        "name": "Scule pentru service auto",
        "handle": "scule-pentru-service-auto",
        "children": []
      },
      {
        "name": "Umflare și întreținere roți",
        "handle": "umflare-si-intretinere-roti",
        "children": []
      }
    ]
  },
  {
    "name": "Compresoare și pneumatice",
    "handle": "compresoare-si-pneumatice",
    "children": [
      {
        "name": "Accesorii pneumatice",
        "handle": "accesorii-pneumatice",
        "children": []
      },
      {
        "name": "Compresoare de aer",
        "handle": "compresoare-de-aer",
        "children": []
      },
      {
        "name": "Scule pneumatice",
        "handle": "scule-pneumatice",
        "children": []
      }
    ]
  },
  {
    "name": "Construcții și finisaje",
    "handle": "constructii-si-finisaje",
    "children": [
      {
        "name": "Beton și compactare",
        "handle": "beton-si-compactare",
        "children": []
      },
      {
        "name": "Beton și prepararea materialelor",
        "handle": "beton-si-prepararea-materialelor",
        "children": []
      },
      {
        "name": "Gresie, faianță și beton",
        "handle": "gresie-faianta-si-beton",
        "children": []
      },
      {
        "name": "Gresie, faianță și sticlă",
        "handle": "gresie-faianta-si-sticla",
        "children": []
      },
      {
        "name": "Utilaje pentru construcții",
        "handle": "utilaje-pentru-constructii",
        "children": []
      },
      {
        "name": "Vopsire și finisare",
        "handle": "vopsire-si-finisare",
        "children": []
      },
      {
        "name": "Zidărie și tencuieli",
        "handle": "zidarie-si-tencuieli",
        "children": []
      }
    ]
  },
  {
    "name": "Curățenie și gospodărie",
    "handle": "curatenie-si-gospodarie",
    "children": [
      {
        "name": "Aspirare și curățare",
        "handle": "aspirare-si-curatare",
        "children": []
      },
      {
        "name": "Casă și baie",
        "handle": "casa-si-baie",
        "children": []
      },
      {
        "name": "Curățare cu presiune",
        "handle": "curatare-cu-presiune",
        "children": []
      },
      {
        "name": "Securitate pentru casă",
        "handle": "securitate-pentru-casa",
        "children": []
      },
      {
        "name": "Încălzire și ventilație",
        "handle": "incalzire-si-ventilatie",
        "children": []
      }
    ]
  },
  {
    "name": "Echipamente de protecție",
    "handle": "echipamente-de-protectie",
    "children": [
      {
        "name": "Lucru la înălțime",
        "handle": "lucru-la-inaltime",
        "children": []
      },
      {
        "name": "Mănuși de protecție",
        "handle": "manusi-de-protectie",
        "children": []
      },
      {
        "name": "Protecția capului, feței și auzului",
        "handle": "protectia-capului-fetei-si-auzului",
        "children": []
      },
      {
        "name": "Protecție respiratorie",
        "handle": "protectie-respiratorie",
        "children": []
      },
      {
        "name": "Îmbrăcăminte de protecție",
        "handle": "imbracaminte-de-protectie",
        "children": []
      },
      {
        "name": "Încălțăminte de protecție",
        "handle": "incaltaminte-de-protectie",
        "children": []
      }
    ]
  },
  {
    "name": "Energie și electricitate",
    "handle": "energie-si-electricitate",
    "children": [
      {
        "name": "Alimentare și distribuție",
        "handle": "alimentare-si-distributie",
        "children": []
      },
      {
        "name": "Generatoare și alimentare de rezervă",
        "handle": "generatoare-si-alimentare-de-rezerva",
        "children": []
      },
      {
        "name": "Iluminat de lucru",
        "handle": "iluminat-de-lucru",
        "children": []
      },
      {
        "name": "Instalații electrice",
        "handle": "instalatii-electrice",
        "children": []
      },
      {
        "name": "Măsurare electrică",
        "handle": "masurare-electrica",
        "children": []
      }
    ]
  },
  {
    "name": "Grădină și agricultură",
    "handle": "gradina-si-agricultura",
    "children": [
      {
        "name": "Accesorii pentru utilaje de grădină",
        "handle": "accesorii-pentru-utilaje-de-gradina",
        "children": []
      },
      {
        "name": "Curățare și gestionarea resturilor",
        "handle": "curatare-si-gestionarea-resturilor",
        "children": []
      },
      {
        "name": "Irigare și stropire",
        "handle": "irigare-si-stropire",
        "children": []
      },
      {
        "name": "Plantare și însămânțare",
        "handle": "plantare-si-insamantare",
        "children": []
      },
      {
        "name": "Sol și cultivare",
        "handle": "sol-si-cultivare",
        "children": []
      },
      {
        "name": "Tăiere arbori și crengi",
        "handle": "taiere-arbori-si-crengi",
        "children": []
      },
      {
        "name": "Întreținerea gazonului",
        "handle": "intretinerea-gazonului",
        "children": []
      }
    ]
  },
  {
    "name": "Măsurare și detectare",
    "handle": "masurare-si-detectare",
    "children": [
      {
        "name": "Accesorii de măsurare",
        "handle": "accesorii-de-masurare",
        "children": []
      },
      {
        "name": "Măsurare cu laser",
        "handle": "masurare-cu-laser",
        "children": []
      },
      {
        "name": "Măsurare de precizie",
        "handle": "masurare-de-precizie",
        "children": []
      },
      {
        "name": "Măsurare manuală",
        "handle": "masurare-manuala",
        "children": []
      },
      {
        "name": "Nivelare și aliniere",
        "handle": "nivelare-si-aliniere",
        "children": []
      },
      {
        "name": "Trasare și geometrie",
        "handle": "trasare-si-geometrie",
        "children": []
      }
    ]
  },
  {
    "name": "Pompe și instalații",
    "handle": "pompe-si-instalatii",
    "children": [
      {
        "name": "Pompare apă",
        "handle": "pompare-apa",
        "children": []
      },
      {
        "name": "Transfer lichide",
        "handle": "transfer-lichide",
        "children": []
      },
      {
        "name": "Țevi și instalații",
        "handle": "tevi-si-instalatii",
        "children": []
      }
    ]
  },
  {
    "name": "Scule de mână",
    "handle": "scule-de-mana",
    "children": [
      {
        "name": "Chei",
        "handle": "chei",
        "children": []
      },
      {
        "name": "Clești",
        "handle": "clesti",
        "children": []
      },
      {
        "name": "Fixare și prindere",
        "handle": "fixare-si-prindere",
        "children": []
      },
      {
        "name": "Percuție și demolare manuală",
        "handle": "percutie-si-demolare-manuala",
        "children": []
      },
      {
        "name": "Prelucrare manuală",
        "handle": "prelucrare-manuala",
        "children": []
      },
      {
        "name": "Truse și seturi",
        "handle": "truse-si-seturi",
        "children": []
      },
      {
        "name": "Tăiere manuală",
        "handle": "taiere-manuala",
        "children": []
      },
      {
        "name": "Șurubelnițe",
        "handle": "surubelnite",
        "children": []
      }
    ]
  },
  {
    "name": "Scule electrice",
    "handle": "scule-electrice",
    "children": [
      {
        "name": "Fixare și capsare",
        "handle": "fixare-si-capsare",
        "children": []
      },
      {
        "name": "Frezare, rindeluire și gravare",
        "handle": "frezare-rindeluire-si-gravare",
        "children": []
      },
      {
        "name": "Găurire și înșurubare",
        "handle": "gaurire-si-insurubare-scule-electrice",
        "children": []
      },
      {
        "name": "Perforare și demolare",
        "handle": "perforare-si-demolare",
        "children": []
      },
      {
        "name": "Renovare și finisare",
        "handle": "renovare-si-finisare",
        "children": []
      },
      {
        "name": "Seturi de scule electrice",
        "handle": "seturi-de-scule-electrice",
        "children": []
      },
      {
        "name": "Tăiere și debitare",
        "handle": "taiere-si-debitare",
        "children": []
      },
      {
        "name": "Șlefuire, polizare și lustruire",
        "handle": "slefuire-polizare-si-lustruire",
        "children": []
      }
    ]
  },
  {
    "name": "Sudură și lipire",
    "handle": "sudura-si-lipire",
    "children": [
      {
        "name": "Accesorii și consumabile",
        "handle": "accesorii-si-consumabile-sudura-si-lipire",
        "children": []
      },
      {
        "name": "Aparate de sudură",
        "handle": "aparate-de-sudura",
        "children": []
      },
      {
        "name": "Arzătoare cu gaz",
        "handle": "arzatoare-cu-gaz",
        "children": []
      },
      {
        "name": "Stații și pistoale de lipit",
        "handle": "statii-si-pistoale-de-lipit",
        "children": []
      }
    ]
  }
];

function flattenHandles(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => [n.handle, ...flattenHandles(n.children)]);
}

function terminalNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) =>
    n.children.length > 0 ? terminalNodes(n.children) : [n]
  );
}

export const ALL_CATEGORY_HANDLES = new Set(flattenHandles(CATEGORY_TREE));
export const ALL_ROOT_HANDLES = new Set(CATEGORY_TREE.map((root) => root.handle));
export const TERMINAL_HANDLES = new Set(
  terminalNodes(CATEGORY_TREE).map((n) => n.handle)
);
