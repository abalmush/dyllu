import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Container } from "@/components/atoms/container";
import { PageHero } from "@/components/molecules/page-hero";
import { SITE_CONTACT, type InfoPageData } from "@lib/site-content";

export function InfoPageTemplate({ page }: { page: InfoPageData }) {
  return (
    <div className="bg-surface-subtle">
      <Container className="py-8 small:py-12">
        <PageHero
          eyebrow={{ label: page.eyebrow }}
          title={page.title}
          lede={page.description}
          surface="default"
        />

        <div className="mt-8 grid gap-8 small:mt-10 large:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {page.sections.map((section) => (
              <section
                key={section.title}
                className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border small:p-8"
              >
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {section.title}
                </h2>

                {section.paragraphs?.length ? (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}

                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.note ? (
                  <div className="clip-corner-cut-md mt-5 bg-surface-subtle/70 p-4 text-sm text-foreground ring-1 ring-border/70">
                    {section.note}
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="flex flex-col gap-5">
            <div className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border small:sticky small:top-28">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Suport DYLLU
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
                Ai nevoie de ajutor?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Echipa noastră te poate ajuta cu selecția produselor,
                confirmarea comenzilor, service și întrebări despre livrare.
              </p>

              <div className="mt-5 space-y-3">
                <a
                  href={SITE_CONTACT.phoneHref}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  <Phone className="size-4 text-primary" />
                  {SITE_CONTACT.phoneDisplay}
                </a>
                <a
                  href={SITE_CONTACT.emailHref}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  <Mail className="size-4 text-primary" />
                  {SITE_CONTACT.email}
                </a>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Program general: {SITE_CONTACT.hoursShort}
              </p>

              <Button
                asChild
                size="lg"
                className="clip-corner-cut-sm mt-6 w-full rounded-none"
              >
                <Link href="/contact">
                  Pagina de contact
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
