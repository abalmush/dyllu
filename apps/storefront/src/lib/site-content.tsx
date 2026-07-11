export const SITE_CONTACT = {
  phoneDisplay: "+373 79 121 220",
  phoneHref: "tel:+37379121220",
  email: "contact@dyllu.md",
  emailHref: "mailto:contact@dyllu.md",
  hoursShort: "L–S 08:00–18:00 · D 09:00–14:00",
  citiesSummary:
    "Chișinău, Bălți, Orhei, Edineț, Ungheni, Căușeni, Fălești și Cahul",
  showroomSummary: "Rețea de magazine DYLLU în toată Moldova",
} as const;

export const SHOWROOMS = [
  {
    city: "Chișinău",
    address: "str. Mitropolit Varlaam 58",
    schedule: "L–S 08:00–18:00 · D 09:00–14:00",
    phone: SITE_CONTACT.phoneDisplay,
    note: "Magazin nou lângă Gara Centrală Auto",
  },
  {
    city: "Chișinău",
    address: "str. Calea Ieșilor 10",
    schedule: "L–S 08:00–18:00 · D 09:00–14:00",
    phone: "+373 79 979 888",
    note: "Showroom DYLLU",
  },
  {
    city: "Chișinău",
    address: "str. Calea Moșilor 1C",
    schedule: "L–S 08:00–18:00 · D 09:00–14:00",
    phone: "+373 79 979 888",
    note: "Ridicare, service și consultanță tehnică",
  },
] as const;

export type InfoPageSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

export type InfoPageData = {
  eyebrow: string;
  title: string;
  description: string;
  sections: InfoPageSection[];
};

export const INFO_PAGES: Record<
  "branduri" | "livrare" | "returnari" | "termeni" | "confidentialitate",
  InfoPageData
> = {
  branduri: {
    eyebrow: "Branduri și selecție",
    title: "Gama DYLLU",
    description:
      "Descoperă cum sunt structurate gamele noastre și ce platforme merită alese pentru atelier, șantier sau bricolaj acasă.",
    sections: [
      {
        title: "DYLLU",
        paragraphs: [
          "DYLLU reunește produse pentru lucru zilnic: scule electrice, scule manuale, consumabile, accesorii și echipamente pentru grădină sau atelier.",
          "Selecția este construită în jurul produselor care oferă raport bun între preț, fiabilitate și compatibilitate între accesorii sau acumulatori.",
        ],
      },
      {
        title: "Cum alegi platforma potrivită",
        bullets: [
          "Pentru utilizare frecventă, alege gamele pe acumulator cu aceeași platformă, ca să refolosești bateriile și încărcătoarele.",
          "Pentru lucrări grele sau repetitive, prioritizează produsele brushless și seturile complete.",
          "Pentru intervenții ocazionale, single-product + accesorii compatibile este de obicei cea mai eficientă alegere.",
        ],
      },
      {
        title: "Seturi, kituri și produse individuale",
        bullets: [
          "Seturile sunt gândite pentru lansare rapidă în lucru și includ combinații validate.",
          "Kiturile pun accent pe platforma comună de acumulatori și pe compatibilitate.",
          "Produsele individuale sunt potrivite atunci când completezi un sistem existent sau adaugi accesorii dedicate.",
        ],
      },
      {
        title: "Ai nevoie de recomandare?",
        paragraphs: [
          "Dacă încă nu e clar ce se potrivește proiectului tău, echipa DYLLU te poate ajuta să alegi între variante, platforme și accesorii compatibile.",
        ],
        note: "Folosește pagina de contact pentru recomandări comerciale, service sau verificarea stocului.",
      },
    ],
  },
  livrare: {
    eyebrow: "Livrare și confirmare",
    title: "Cum procesăm comenzile DYLLU",
    description:
      "Livrăm în toată Moldova și confirmăm fiecare comandă înainte de expediere, ca să ai claritate asupra stocului, plății și termenului estimat.",
    sections: [
      {
        title: "Acoperire și timp de procesare",
        paragraphs: [
          "Comenzile se procesează în zilele lucrătoare, iar echipa DYLLU te contactează pentru confirmarea detaliilor esențiale înainte de expediere.",
          "În Chișinău și suburbii, livrarea este de regulă mai rapidă. Pentru alte localități, termenul exact se confirmă după verificarea stocului și a rutei.",
        ],
      },
      {
        title: "Costuri de livrare",
        bullets: [
          "Pentru comenzile peste 1.000 MDL în Chișinău se aplică pragul de livrare gratuită afișat pe site.",
          "Pentru alte localități sau servicii speciale, costul final de livrare este confirmat înainte de expediere.",
          "La checkout vezi opțiunile disponibile pentru coșul curent, iar costul se actualizează în sumar.",
        ],
      },
      {
        title: "Plată și confirmare",
        paragraphs: [
          "În stadiul actual al storefront-ului, comanda se plasează online, iar modalitatea finală de plată se confirmă împreună cu echipa DYLLU.",
          "Pentru comenzi corporate putem pregăti factură și detalii suplimentare la confirmare.",
        ],
      },
      {
        title: "Ridicare și suport",
        bullets: [
          "Pentru anumite produse poate fi disponibilă și ridicarea din magazin.",
          "Dacă ai nevoie de o livrare urgentă sau de coordonare pentru proiect, contactează-ne înainte sau imediat după plasarea comenzii.",
        ],
      },
    ],
  },
  returnari: {
    eyebrow: "Retur și garanție",
    title: "Retururi simple, service clar",
    description:
      "Vrem să știi din start cum se tratează retururile, schimburile și solicitările de service pentru produsele DYLLU.",
    sections: [
      {
        title: "Retur în 14 zile",
        paragraphs: [
          "Poți solicita retur pentru produsele neutilizate, complete și în ambalajul lor original, în termen de 14 zile de la recepție.",
          "Pentru aprobarea rapidă, păstrează documentele comenzii și contactează-ne cu numărul comenzii.",
        ],
      },
      {
        title: "Produse care necesită verificare",
        bullets: [
          "Consumabilele desigilate sau produsele folosite pot necesita validare suplimentară înainte de aprobarea returului.",
          "Seturile, kiturile și produsele cu accesorii incluse trebuie returnate complet.",
          "Dacă produsul a fost livrat cu defect sau incomplet, anunță-ne imediat pentru prioritate la soluționare.",
        ],
      },
      {
        title: "Garanție și service",
        paragraphs: [
          "Pentru produsele eligibile, garanția se aplică pe baza documentelor de achiziție și a verificării tehnice făcute de echipa noastră.",
          "Service-ul și piesele de schimb se coordonează prin echipa DYLLU, iar timpul de soluționare depinde de tipul produsului și disponibilitatea componentelor.",
        ],
      },
      {
        title: "Cum inițiezi solicitarea",
        bullets: [
          "Trimite numărul comenzii și o descriere scurtă a situației.",
          "Adaugă poze sau video dacă e vorba de defect, lipsă de piese sau deteriorare la transport.",
          "Noi revenim cu pașii pentru retur, schimb sau service.",
        ],
      },
    ],
  },
  termeni: {
    eyebrow: "Termeni și condiții",
    title: "Condițiile de utilizare ale storefront-ului DYLLU",
    description:
      "Această pagină rezumă modul în care funcționează comenzile, informațiile comerciale și utilizarea generală a site-ului.",
    sections: [
      {
        title: "Plasarea comenzii",
        paragraphs: [
          "Prin plasarea unei comenzi pe site, transmiți o solicitare de cumpărare pentru produsele selectate și accepți procesul de confirmare realizat de echipa DYLLU.",
          "Confirmarea finală a comenzii depinde de validarea stocului, a datelor de livrare și a modului de plată agreat.",
        ],
      },
      {
        title: "Prețuri, stocuri și informații despre produse",
        bullets: [
          "Depunem eforturi să păstrăm informațiile despre produse, prețuri și stocuri cât mai exacte.",
          "În caz de eroare evidentă de afișare sau indisponibilitate, te contactăm înainte de procesarea finală a comenzii.",
          "Imaginile și descrierile au rol informativ; pot exista diferențe minore între loturi sau accesorii incluse.",
        ],
      },
      {
        title: "Livrare, retur și garanție",
        paragraphs: [
          "Livrarea, retururile și garanțiile sunt guvernate de paginile dedicate din acest storefront și de confirmările comunicate la procesarea comenzii.",
          "Pentru comenzi corporate sau cerințe speciale pot exista condiții comerciale suplimentare comunicate separat.",
        ],
      },
      {
        title: "Utilizarea site-ului",
        bullets: [
          "Nu este permisă utilizarea abuzivă a formularelor, a conturilor sau a conținutului publicat pe site.",
          "Conținutul vizual și textual DYLLU poate fi folosit doar cu acordul nostru sau în limitele legii aplicabile.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          "Pentru orice clarificare comercială, juridică sau de suport, te rugăm să folosești datele publicate pe pagina de contact.",
        ],
      },
    ],
  },
  confidentialitate: {
    eyebrow: "Confidențialitate",
    title: "Cum folosim și protejăm datele tale",
    description:
      "Colectăm doar datele necesare pentru funcționarea contului, procesarea comenzilor și comunicarea legată de serviciile DYLLU.",
    sections: [
      {
        title: "Ce date colectăm",
        bullets: [
          "Date de identificare și contact: nume, email, telefon, adresă de livrare sau facturare.",
          "Date despre comenzi, produse vizualizate și interacțiuni necesare funcționării coșului și checkout-ului.",
          "Date tehnice de bază necesare pentru securitate, performanță și diagnosticare.",
        ],
      },
      {
        title: "Cum folosim datele",
        bullets: [
          "Pentru creare cont, autentificare și administrarea profilului tău.",
          "Pentru procesarea comenzilor, confirmarea livrării, suport și service.",
          "Pentru îmbunătățirea experienței din storefront și pentru comunicări solicitate de tine.",
        ],
      },
      {
        title: "Partajare și securitate",
        paragraphs: [
          "Datele sunt folosite intern și pot fi partajate doar cu partenerii necesari pentru operarea serviciului, cum ar fi livrarea, infrastructura tehnică sau emiterea documentelor fiscale.",
          "Aplicăm măsuri rezonabile de securitate pentru a proteja datele împotriva accesului neautorizat, pierderii sau modificării.",
        ],
      },
      {
        title: "Drepturile tale",
        bullets: [
          "Poți solicita actualizarea sau corectarea datelor din cont.",
          "Poți cere detalii despre datele asociate comenzilor tale și despre modul în care sunt folosite.",
          "Pentru solicitări de ștergere, opoziție sau clarificări, contactează echipa DYLLU.",
        ],
      },
      {
        title: "Contact pentru date personale",
        paragraphs: [
          "Dacă ai întrebări despre confidențialitate sau despre modul în care sunt prelucrate datele tale, scrie-ne folosind datele de contact publicate în storefront.",
        ],
      },
    ],
  },
};
