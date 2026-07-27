import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/atoms/container";

export function ProductSpotlight() {
  return (
    <section className="bg-foreground small:py-24 py-16">
      <Container>
        <Link
          href="/products/dyllu-p20s-vacuum"
          aria-label="DYLLU P20S — aspirator portabil 20V Max Lithium"
          className="clip-corner-cut-lg group relative mx-auto block w-full max-w-3xl overflow-hidden shadow-[0_40px_120px_-40px_rgba(0,0,0,0.6)] transition-transform duration-500 hover:scale-[1.01] focus-visible:outline-hidden"
        >
          <Image
            src="/images/dyllu-vacuum-p20s.png"
            alt="DYLLU P20S — aspirator portabil 20V Max Lithium"
            width={1200}
            height={1200}
            sizes="(min-width: 1024px) 768px, 100vw"
            className="block h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </Link>
      </Container>
    </section>
  );
}
