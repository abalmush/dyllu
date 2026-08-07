import * as React from "react";
import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { NewsletterForm } from "@/components/molecules/newsletter-form";
import { Link } from "@/i18n/navigation";

export async function NewsletterBand() {
  const t = await getTranslations("NewsletterBand");
  return (
    <section className="small:py-24 py-16">
      <Container>
        <div className="clip-corner-cut-lg bg-secondary text-secondary-foreground small:p-16 relative overflow-hidden p-8">
          <div aria-hidden className="ds-grid-bg absolute inset-0 opacity-20" />
          <div
            aria-hidden
            className="bg-primary/30 absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
          />
          <div className="small:grid-cols-2 relative grid items-center gap-12">
            <div className="space-y-4">
              <Eyebrow icon={<Mail className="size-3.5" />}>
                {t("eyebrow")}
              </Eyebrow>
              <h2 className="font-display text-display-sm small:text-display-md font-extrabold tracking-tight">
                {t.rich("title", {
                  highlight: (chunks) => (
                    <span className="text-primary">{chunks}</span>
                  ),
                })}
              </h2>
              <p className="text-secondary-foreground/70 small:text-base text-sm">
                {t("body")}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <NewsletterForm invert />
              <p className="text-secondary-foreground/60 text-xs">
                {t.rich("consent", {
                  privacyLink: (chunks) => (
                    <Link
                      href="/confidentialitate"
                      className="hover:text-secondary-foreground underline underline-offset-4"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
