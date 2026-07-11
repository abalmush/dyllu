import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";

export type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  body: string;
};

type Props = {
  average: number;
  count: number;
  distribution: [number, number, number, number, number];
  reviews: Review[];
};

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(rating)
              ? "fill-warning text-warning"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </span>
  );
}

export function ProductReviews({
  average,
  count,
  distribution,
  reviews,
}: Props) {
  const maxBar = Math.max(1, ...distribution);

  return (
    <section className="bg-surface-subtle py-16 small:py-20">
      <Container>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
          Recenzii clienți
        </h2>

        <div className="mt-8 grid gap-10 medium:grid-cols-[minmax(0,320px)_1fr] medium:gap-16">
          <div className="clip-corner-cut-lg h-fit bg-card p-6 ring-1 ring-border">
            <div className="flex items-end gap-3">
              <span className="font-display text-5xl font-extrabold leading-none text-foreground">
                {average.toFixed(1)}
              </span>
              <div className="pb-1">
                <Stars rating={average} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {count} recenzii
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-2">
              {distribution
                .map((n, i) => ({ stars: 5 - i, n }))
                .map(({ stars, n }) => (
                  <li key={stars} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-xs text-muted-foreground">
                      {stars}★
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-warning"
                        style={{ width: `${(n / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                      {n}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <ul className="space-y-5">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border-b border-border pb-5 last:border-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-foreground">
                    {review.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {review.date}
                  </span>
                </div>
                <Stars rating={review.rating} className="mt-1.5" />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
