import { Link } from "@/i18n/navigation";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import { PageHero } from "@/components/molecules/page-hero";
import { SITE_CONTACT, type InfoPageData } from "@lib/site-content";

export async function InfoPageTemplate({ page }: { page: InfoPageData }) {
  const t = await getTranslations("InfoPageTemplate");
  const tContact = await getTranslations("SiteContact");

  return (
    <div className="bg-surface-subtle">
      <Container className="small:py-12 py-8">
        <PageHero
          eyebrow={{ label: page.eyebrow }}
          title={page.title}
          lede={page.description}
          surface="default"
        />

        <div className="small:mt-12 large:grid-cols-[minmax(0,1fr)_320px] mt-8 grid gap-8">
          <div className="space-y-6">
            {page.sections.map((section) => (
              <section
                key={section.title}
                className="clip-corner-cut-lg bg-card ring-border small:p-8 p-6 ring-1"
              >
                <h2 className="font-display text-foreground text-2xl font-bold tracking-tight">
                  {section.title}
                </h2>

                {section.paragraphs?.length ? (
                  <div className="text-muted-foreground mt-4 space-y-4 text-sm leading-relaxed">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}

                {section.bullets?.length ? (
                  <ul className="text-muted-foreground mt-4 space-y-2 text-sm leading-relaxed">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-4">
                        <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.note ? (
                  <div className="clip-corner-cut-md bg-surface-subtle/70 text-foreground ring-border/70 mt-6 p-4 text-sm ring-1">
                    {section.note}
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="clip-corner-cut-lg bg-card ring-border small:sticky small:top-28 p-6 ring-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                {t("supportEyebrow")}
              </span>
              <h2 className="font-display text-foreground mt-2 text-2xl font-bold tracking-tight">
                {t("needHelpTitle")}
              </h2>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {t("needHelpBody")}
              </p>

              <div className="mt-6 space-y-4">
                <a
                  href={SITE_CONTACT.phoneHref}
                  className="border-border bg-background text-foreground hover:border-foreground/30 flex items-center gap-4 rounded-2xl border px-4 py-4 text-sm font-medium transition-colors"
                >
                  <Phone className="text-primary size-4" />
                  {SITE_CONTACT.phoneDisplay}
                </a>
                <a
                  href={SITE_CONTACT.emailHref}
                  className="border-border bg-background text-foreground hover:border-foreground/30 flex items-center gap-4 rounded-2xl border px-4 py-4 text-sm font-medium transition-colors"
                >
                  <Mail className="text-primary size-4" />
                  {SITE_CONTACT.email}
                </a>
              </div>

              <p className="text-muted-foreground mt-4 text-xs">
                {t("hoursPrefix", { hours: tContact("hoursShort") })}
              </p>

              <Button
                asChild
                size="lg"
                className="clip-corner-cut-sm mt-6 w-full rounded-none"
              >
                <Link href="/contact">
                  {t("contactCta")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
