import * as React from "react";
import Link from "next/link";
import { Clock, MapPin, Phone, Wrench } from "lucide-react";

import { SITE_CONTACT } from "@lib/site-content";
import { Container } from "@/components/atoms/container";

export function UtilityBar() {
  return (
    <div className="hidden border-b border-border bg-surface-subtle/60 text-foreground/70 medium:block">
      <Container>
        <div className="flex h-9 items-center justify-between text-[12px]">
          <div className="flex items-center gap-5">
            <a
              href={SITE_CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 font-medium tracking-tight transition-colors hover:text-foreground"
            >
              <Phone className="size-3.5" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <span className="inline-flex items-center gap-1.5 text-foreground/55">
              <Clock className="size-3.5" />
              {SITE_CONTACT.hoursShort}
            </span>
          </div>
          <nav aria-label="Linkuri utile" className="flex items-center gap-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              Magazine DYLLU by INGCO
            </Link>
            <Link
              href="/returnari"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Wrench className="size-3.5" />
              Service și piese de schimb
            </Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
