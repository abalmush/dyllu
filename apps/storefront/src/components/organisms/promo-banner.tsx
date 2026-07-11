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
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Vezi tot
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {promos.map((promo) => (
          <Link
            key={promo.slug}
            href={`/c/${promo.slug}`}
            className="group flex flex-col justify-between gap-6 rounded-2xl border border-border bg-muted/30 p-5 transition-colors hover:border-primary/50 hover:bg-muted/60"
          >
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold">
                {promo.title}
              </h3>
              {promo.subtitle && (
                <p className="text-sm text-muted-foreground">
                  {promo.subtitle}
                </p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Explorează
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
