import * as React from "react";
import Link from "next/link";
import { Clock, MapPin, Phone, Wrench } from "lucide-react";

import { SITE_CONTACT } from "@lib/site-content";
import { Container } from "@/components/atoms/container";

export function UtilityBar() {
  return (
    <div className="hidden border-b border-border bg-surface-subtle text-muted-foreground medium:block">
      <Container>
        <div className="flex min-h-11 items-center justify-between text-sm">
          <div className="flex items-center gap-5">
            <a
              href={SITE_CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 font-medium tracking-tight transition-colors hover:text-foreground"
            >
              <Phone aria-hidden="true" className="size-4" />
              {SITE_CONTACT.phoneDisplay}
            </a>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock aria-hidden="true" className="size-4" />
              {SITE_CONTACT.hoursShort}
            </span>
          </div>
          <nav aria-label="Linkuri utile" className="flex items-center gap-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <MapPin aria-hidden="true" className="size-4" />
              Magazine DYLLU
            </Link>
            <Link
              href="/returnari"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Wrench aria-hidden="true" className="size-4" />
              Service și piese de schimb
            </Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
