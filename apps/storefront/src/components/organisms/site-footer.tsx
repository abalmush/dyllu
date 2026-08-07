import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

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

export async function SiteFooter({
  categories,
}: {
  categories: CategoryNode[];
}) {
  const t = await getTranslations("SiteFooter");
  const tContact = await getTranslations("SiteContact");
  const topCategories = categories.slice(0, 6);
  const shopLinks = [
    { label: t("shopLinks.allProducts"), href: "/store" },
    { label: t("shopLinks.activeDeals"), href: "/store?on_sale=true" },
    { label: t("shopLinks.newArrivals"), href: "/store?sortBy=created_at" },
    { label: t("shopLinks.brandsAndGuides"), href: "/branduri" },
  ];
  const supportLinks = [
    { label: t("supportLinks.contact"), href: "/contact" },
    { label: t("supportLinks.shippingAndPayment"), href: "/livrare" },
    { label: t("supportLinks.returnsAndWarranty"), href: "/returnari" },
    { label: t("supportLinks.termsAndConditions"), href: "/termeni" },
    { label: t("supportLinks.privacyPolicy"), href: "/confidentialitate" },
  ];
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="content-container small:grid-cols-12 small:gap-12 grid gap-12 py-16">
        <div className="small:col-span-4 space-y-6">
          <Logo className="text-secondary-foreground h-8" />
          <p className="text-secondary-foreground/70 max-w-sm text-sm">
            {t("tagline")}
          </p>
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
              <span>{tContact("showroomSummary")}</span>
            </div>
          </div>
        </div>

        <div className="small:col-span-5 small:grid-cols-3 grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-secondary-foreground/75 text-sm font-semibold tracking-wide">
              {t("categories")}
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
              {t("shop")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {shopLinks.map((l) => (
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
              {t("support")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {supportLinks.map((l) => (
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
            {t("newsletter.title")}
          </h2>
          <p className="text-secondary-foreground/70 text-sm">
            {t("newsletter.body")}
          </p>
          <NewsletterForm invert />
          <p className="text-secondary-foreground/60 text-xs">
            {t("newsletter.contactPrefix")}{" "}
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
          {t("orderConfirmation.heading")}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge>
            {t("orderConfirmation.phoneConfirmation")}
          </PaymentBadge>
          <PaymentBadge>
            {t("orderConfirmation.paymentAtProcessing")}
          </PaymentBadge>
          <PaymentBadge>
            {t("orderConfirmation.businessInvoicing")}
          </PaymentBadge>
        </div>
      </div>

      <Separator className="bg-secondary-foreground/10" />

      <div className="content-container text-secondary-foreground/60 small:flex-row flex flex-col items-center justify-between gap-4 py-6 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="text-primary size-4" />{" "}
            {t("trustBadges.validatedData")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="text-primary size-4" />{" "}
            {t("trustBadges.nationwideShipping")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Wallet className="text-primary size-4" /> MDL · EUR · USD
          </span>
        </div>
      </div>
    </footer>
  );
}
