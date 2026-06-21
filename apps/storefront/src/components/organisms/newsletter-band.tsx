import * as React from "react";
import { Mail } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { NewsletterForm } from "@/components/molecules/newsletter-form";

export function NewsletterBand() {
  return (
    <section className="py-16 small:py-24">
      <Container>
        <div className="clip-corner-cut-lg relative overflow-hidden bg-secondary p-8 text-secondary-foreground small:p-14">
          <div aria-hidden className="ds-grid-bg absolute inset-0 opacity-20" />
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/30 blur-3xl"
          />
          <div className="relative grid items-center gap-10 small:grid-cols-2">
            <div className="space-y-4">
              <Eyebrow icon={<Mail className="size-3.5" />}>
                Newsletter DYLLU
              </Eyebrow>
              <h2 className="font-display text-display-sm font-extrabold tracking-tight small:text-display-md">
                Promoții, sfaturi tehnice și
                <span className="text-primary"> stocuri limitate</span> înainte
                de toți.
              </h2>
              <p className="text-sm text-secondary-foreground/70 small:text-base">
                Primești săptămânal selecția redacției — fără spam, dezabonare
                cu un click.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <NewsletterForm invert />
              <p className="text-xs text-secondary-foreground/60">
                Prin abonare ești de acord cu{" "}
                <a
                  href="/confidentialitate"
                  className="underline underline-offset-4 hover:text-secondary-foreground"
                >
                  politica de confidențialitate
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
