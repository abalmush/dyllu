export const SITE_CONTACT = {
  phoneDisplay: "+373 79 12 12 28",
  phoneHref: "tel:+37379121228",
  email: "contact@dyllu.md",
  emailHref: "mailto:contact@dyllu.md",
} as const;

export const SHOWROOMS = [
  {
    city: "Chișinău",
    address: "str. Mitropolit Varlaam 58",
    phone: SITE_CONTACT.phoneDisplay,
  },
  {
    city: "Chișinău",
    address: "str. Calea Ieșilor 10",
    phone: SITE_CONTACT.phoneDisplay,
  },
  {
    city: "Chișinău",
    address: "str. Calea Moșilor 1C",
    phone: SITE_CONTACT.phoneDisplay,
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
