import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Clock, MapPin, Phone, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SITE_CONTACT } from "@lib/site-content";
import { Container } from "@/components/atoms/container";
import { LocaleSwitcher } from "@/components/molecules/locale-switcher";

export async function UtilityBar() {
  const t = await getTranslations("UtilityBar");

  return (
    <div className="border-border bg-surface-subtle text-muted-foreground medium:block hidden border-b">
      <Container>
        <div className="flex min-h-11 items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a
              href={SITE_CONTACT.phoneHref}
              className="hover:text-foreground inline-flex items-center gap-1.5 font-medium tracking-tight transition-colors"
            >
              <Phone aria-hidden="true" className="size-4" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />
              {SITE_CONTACT.hoursShort}
            </span>
          </div>
          <nav
            aria-label={t("usefulLinks")}
            className="flex items-center gap-6"
          >
            <Link
              href="/contact"
              className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <MapPin aria-hidden="true" className="size-4" />
              {t("stores")}
            </Link>
            <Link
              href="/returnari"
              className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <Wrench aria-hidden="true" className="size-4" />
              {t("service")}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </Container>
    </div>
  );
}
