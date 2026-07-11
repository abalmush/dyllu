import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";

import { categoriesTree } from "@lib/data/categories-tree";
import { SITE_CONTACT } from "@lib/site-content";
import { Logo } from "@/components/atoms/logo";
import { Separator } from "@/components/atoms/separator";
import { NewsletterForm } from "@/components/molecules/newsletter-form";

function PaymentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 items-center rounded-md border border-secondary-foreground/15 bg-secondary-foreground/[0.04] px-3 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground/85">
      {children}
    </span>
  );
}

const SHOP_LINKS = [
  { label: "Toate produsele", href: "/store" },
  { label: "Reduceri active", href: "/store?on_sale=true" },
  { label: "Noutăți", href: "/store?sortBy=created_at" },
  { label: "Branduri și ghiduri", href: "/branduri" },
];

const SUPPORT_LINKS = [
  { label: "Contact", href: "/contact" },
  { label: "Livrare și plată", href: "/livrare" },
  { label: "Returnări și garanție", href: "/returnari" },
  { label: "Termeni și condiții", href: "/termeni" },
  { label: "Politica de confidențialitate", href: "/confidentialitate" },
];

export function SiteFooter() {
  const topCategories = categoriesTree.slice(0, 6);
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="content-container grid gap-12 py-16 small:grid-cols-12 small:gap-10">
        <div className="space-y-6 small:col-span-4">
          <Logo className="h-8 text-secondary-foreground" />
          <p className="max-w-sm text-sm text-secondary-foreground/70">
            DYLLU este partenerul tău pentru scule profesionale, echipamente de
            atelier și soluții de protecție în Republica Moldova.
          </p>
          <div className="space-y-3 text-sm">
            <a
              href={SITE_CONTACT.phoneHref}
              className="flex items-center gap-3 text-secondary-foreground/85 transition-colors hover:text-secondary-foreground"
            >
              <Phone className="size-4 text-primary" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <a
              href={SITE_CONTACT.emailHref}
              className="flex items-center gap-3 text-secondary-foreground/85 transition-colors hover:text-secondary-foreground"
            >
              <Mail className="size-4 text-primary" />
              {SITE_CONTACT.email}
            </a>
            <div className="flex items-start gap-3 text-secondary-foreground/85">
              <MapPin className="mt-0.5 size-4 text-primary" />
              <span>{SITE_CONTACT.showroomSummary}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 small:col-span-5 small:grid-cols-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">
              Categorii
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {topCategories.map((c) => (
                <li key={c.handle}>
                  <Link
                    href={`/categories/${c.handle}`}
                    className="text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                    data-testid="category-link"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">
              Magazin
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">
              Suport
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4 small:col-span-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">
            Noutăți DYLLU
          </h4>
          <p className="text-sm text-secondary-foreground/70">
            Promoții săptămânale, ghiduri de utilizare și produse noi direct în
            email.
          </p>
          <NewsletterForm invert />
          <p className="text-xs text-secondary-foreground/60">
            Pentru solicitări comerciale și suport, scrie-ne la{" "}
            <a
              href={SITE_CONTACT.emailHref}
              className="underline underline-offset-4 hover:text-secondary-foreground"
            >
              {SITE_CONTACT.email}
            </a>
            .
          </p>
        </div>
      </div>

      <Separator className="bg-secondary-foreground/10" />

      <div className="content-container flex flex-col items-center gap-4 py-6 small:flex-row small:justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">
          Comenzi și confirmare
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge>Confirmare telefonică</PaymentBadge>
          <PaymentBadge>Detalii de plată la procesare</PaymentBadge>
          <PaymentBadge>Facturare pentru firme</PaymentBadge>
        </div>
      </div>

      <Separator className="bg-secondary-foreground/10" />

      <div className="content-container flex flex-col items-center justify-between gap-4 py-6 text-xs text-secondary-foreground/60 small:flex-row">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            © {new Date().getFullYear()} DYLLU. Toate drepturile rezervate.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Date validate la
            confirmarea comenzii
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="size-4 text-primary" /> Livrare în toată Moldova
          </span>
          <span className="inline-flex items-center gap-2">
            <Wallet className="size-4 text-primary" /> MDL · EUR · USD
          </span>
        </div>
      </div>
    </footer>
  );
}
