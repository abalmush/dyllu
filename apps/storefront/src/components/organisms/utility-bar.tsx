import * as React from "react";
import Link from "next/link";
import { Clock, MapPin, Phone, Wrench } from "lucide-react";

import { Container } from "@/components/atoms/container";

export function UtilityBar() {
  return (
    <div className="hidden border-b border-border bg-surface-subtle/60 text-foreground/70 medium:block">
      <Container>
        <div className="flex h-9 items-center justify-between text-[12px]">
          <div className="flex items-center gap-5">
            <a
              href="tel:+37322000000"
              className="inline-flex items-center gap-1.5 font-medium tracking-tight transition-colors hover:text-foreground"
            >
              <Phone className="size-3.5" />
              +373 22 000 000
            </a>
            <span className="inline-flex items-center gap-1.5 text-foreground/55">
              <Clock className="size-3.5" />
              L–V 9:00–18:00
            </span>
          </div>
          <nav aria-label="Linkuri utile" className="flex items-center gap-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              Magazinul DYLLU
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Wrench className="size-3.5" />
              Service & piese de schimb
            </Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
