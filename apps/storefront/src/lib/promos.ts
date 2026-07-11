export type PromoKind =
  | "use-case"
  | "holiday"
  | "season"
  | "trend"
  | "evergreen";

export type PromoSet = {
  slug: string;
  tag: string;
  title: string;
  subtitle?: string;
  kind: PromoKind;
  active: boolean;
  featured: boolean;
  startsAt?: string;
  endsAt?: string;
  accent?: string;
};

export const PROMO_SETS: PromoSet[] = [
  {
    slug: "prelucrarea-lemnului",
    tag: "prelucrarea-lemnului",
    title: "Prelucrarea lemnului",
    subtitle: "Unelte și accesorii pentru tâmplărie și dulgherie",
    kind: "use-case",
    active: true,
    featured: true,
  },
  {
    slug: "prelucrarea-metalului",
    tag: "prelucrarea-metalului",
    title: "Prelucrarea metalului",
    subtitle: "Debitare, polizare și sudură pentru metal",
    kind: "use-case",
    active: true,
    featured: true,
  },
  {
    slug: "instalatii-sanitare",
    tag: "instalatii-sanitare",
    title: "Instalații sanitare",
    subtitle: "Scule pentru instalatori",
    kind: "use-case",
    active: true,
    featured: false,
  },
  {
    slug: "gradina",
    tag: "gradina",
    title: "Grădină și peisagistică",
    subtitle: "Echipamente pentru îngrijirea spațiilor verzi",
    kind: "use-case",
    active: true,
    featured: false,
  },
  {
    slug: "service-auto",
    tag: "service-auto",
    title: "Service auto",
    subtitle: "Dotări pentru garaj și atelier auto",
    kind: "use-case",
    active: true,
    featured: false,
  },
  {
    slug: "constructii",
    tag: "constructii",
    title: "Construcții și renovări",
    subtitle: "Utilaje și scule pentru șantier",
    kind: "use-case",
    active: true,
    featured: false,
  },
  {
    slug: "noutati",
    tag: "noutati",
    title: "Noutăți",
    subtitle: "Ultimele produse adăugate în catalog",
    kind: "trend",
    active: true,
    featured: true,
  },
  {
    slug: "cele-mai-vandute",
    tag: "cele-mai-vandute",
    title: "Cele mai vândute",
    subtitle: "Alegerile preferate ale clienților DYLLU",
    kind: "trend",
    active: true,
    featured: true,
  },
  {
    slug: "recomandate",
    tag: "recomandate",
    title: "Recomandate de DYLLU",
    subtitle: "Selecția echipei noastre",
    kind: "evergreen",
    active: true,
    featured: false,
  },
  {
    slug: "anul-nou",
    tag: "anul-nou",
    title: "Oferte de Anul Nou",
    subtitle: "Cadouri și reduceri pentru sărbători",
    kind: "holiday",
    active: false,
    featured: false,
  },
  {
    slug: "black-friday",
    tag: "black-friday",
    title: "Black Friday",
    subtitle: "Cele mai mari reduceri ale anului",
    kind: "holiday",
    active: false,
    featured: false,
  },
];

export const getPromoBySlug = (slug: string): PromoSet | undefined =>
  PROMO_SETS.find((promo) => promo.slug === slug);

export const getActivePromos = (): PromoSet[] =>
  PROMO_SETS.filter((promo) => promo.active);

export const getFeaturedPromos = (): PromoSet[] =>
  PROMO_SETS.filter((promo) => promo.active && promo.featured);
