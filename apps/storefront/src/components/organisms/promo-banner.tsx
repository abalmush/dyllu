import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getFeaturedPromos } from "@lib/promos";

export function PromoBanner() {
  const promos = getFeaturedPromos();

  if (promos.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">
          Colecții recomandate
        </h2>
        <Link
          href="/store"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Vezi tot
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {promos.map((promo) => (
          <Link
            key={promo.slug}
            href={`/c/${promo.slug}`}
            className="group border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/60 flex flex-col justify-between gap-6 rounded-2xl border p-6 transition-colors"
          >
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold">
                {promo.title}
              </h3>
              {promo.subtitle && (
                <p className="text-muted-foreground text-sm">
                  {promo.subtitle}
                </p>
              )}
            </div>
            <span className="text-brand-800 inline-flex items-center gap-1.5 text-base font-semibold">
              Explorează
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
