import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";

import { type CategoryNode } from "@lib/data/categories";
import { SITE_CONTACT } from "@lib/site-content";
import { Logo } from "@/components/atoms/logo";
import { Separator } from "@/components/atoms/separator";
import { NewsletterForm } from "@/components/molecules/newsletter-form";

function PaymentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-secondary-foreground/15 bg-secondary-foreground/4 text-2xs text-secondary-foreground/85 inline-flex h-9 items-center rounded-md border px-4 font-bold tracking-wider uppercase">
      {children}
    </span>
  );
}

const SHOP_LINKS = [
  { label: "Toate produsele", href: "/store" },
  { label: "Reduceri active", href: "/store?on_sale=true" },
  { label: "Noutăți", href: "/store?sortBy=created_at" },
  { label: "Ghid DYLLU", href: "/branduri" },
];

const SUPPORT_LINKS = [
  { label: "Contact", href: "/contact" },
  { label: "Livrare și plată", href: "/livrare" },
  { label: "Returnări și garanție", href: "/returnari" },
  { label: "Termeni și condiții", href: "/termeni" },
  { label: "Politica de confidențialitate", href: "/confidentialitate" },
];

export function SiteFooter({ categories }: { categories: CategoryNode[] }) {
  const topCategories = categories.slice(0, 6);
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="content-container small:grid-cols-12 small:gap-12 grid gap-12 py-16">
        <div className="small:col-span-4 space-y-6">
          <Logo className="text-secondary-foreground h-8" />
          <div className="max-w-sm space-y-2">
            <p className="text-secondary-foreground text-base font-semibold">
              Descoperă-ți talentul cu DYLLU!
            </p>
            <p className="text-secondary-foreground/70 text-sm">
              Scule profesionale, echipamente de atelier și soluții de protecție
              în Republica Moldova.
            </p>
          </div>
          <div className="space-y-4 text-sm">
            <a
              href={SITE_CONTACT.phoneHref}
              className="text-secondary-foreground/85 hover:text-secondary-foreground flex items-center gap-4 transition-colors"
            >
              <Phone className="text-primary size-4" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <a
              href={SITE_CONTACT.emailHref}
              className="text-secondary-foreground/85 hover:text-secondary-foreground flex items-center gap-4 transition-colors"
            >
              <Mail className="text-primary size-4" />
              {SITE_CONTACT.email}
            </a>
            <div className="text-secondary-foreground/85 flex items-start gap-4">
              <MapPin className="text-primary mt-0.5 size-4" />
              <span>{SITE_CONTACT.showroomSummary}</span>
            </div>
          </div>
        </div>

        <div className="small:col-span-5 small:grid-cols-3 grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-secondary-foreground/75 text-sm font-semibold tracking-wide">
              Categorii
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {topCategories.map((c) => (
                <li key={c.handle}>
                  <Link
                    href={`/categories/${c.handle}`}
                    className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
                    data-testid="category-link"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-secondary-foreground/75 text-sm font-semibold tracking-wide">
              Produse
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-secondary-foreground/75 text-sm font-semibold tracking-wide">
              Suport
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="small:col-span-3 space-y-4">
          <h2 className="text-secondary-foreground/75 text-sm font-semibold tracking-wide">
            Noutăți DYLLU
          </h2>
          <p className="text-secondary-foreground/70 text-sm">
            Promoții săptămânale, ghiduri de utilizare și produse noi direct în
            email.
          </p>
          <NewsletterForm invert />
          <p className="text-secondary-foreground/60 text-xs">
            Pentru solicitări comerciale și suport, scrie-ne la{" "}
            <a
              href={SITE_CONTACT.emailHref}
              className="hover:text-secondary-foreground underline underline-offset-4"
            >
              {SITE_CONTACT.email}
            </a>
            .
          </p>
        </div>
      </div>

      <Separator className="bg-secondary-foreground/10" />

      <div className="content-container small:flex-row small:justify-between flex flex-col items-center gap-4 py-6">
        <span className="text-secondary-foreground/60 text-xs font-semibold tracking-[0.18em] uppercase">
          Comenzi și confirmare
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge>Confirmare telefonică</PaymentBadge>
          <PaymentBadge>Detalii de plată la procesare</PaymentBadge>
          <PaymentBadge>Facturare pentru firme</PaymentBadge>
        </div>
      </div>

      <Separator className="bg-secondary-foreground/10" />

      <div className="content-container text-secondary-foreground/60 small:flex-row flex flex-col items-center justify-between gap-4 py-6 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            © {new Date().getFullYear()} DYLLU. Toate drepturile rezervate.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="text-primary size-4" /> Date validate la
            confirmarea comenzii
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="text-primary size-4" /> Livrare în toată Moldova
          </span>
          <span className="inline-flex items-center gap-2">
            <Wallet className="text-primary size-4" /> MDL · EUR · USD
          </span>
        </div>
      </div>
    </footer>
  );
}
