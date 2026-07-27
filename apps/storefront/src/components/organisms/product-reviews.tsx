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
    <section className="bg-surface-subtle small:py-20 py-16">
      <Container>
        <h2 className="font-display text-foreground small:text-3xl text-2xl font-extrabold tracking-tight">
          Recenzii clienți
        </h2>

        <div className="medium:grid-cols-[minmax(0,320px)_1fr] medium:gap-16 mt-8 grid gap-12">
          <div className="clip-corner-cut-lg bg-card ring-border h-fit p-6 ring-1">
            <div className="flex items-end gap-4">
              <span className="font-display text-foreground text-5xl leading-none font-extrabold">
                {average.toFixed(1)}
              </span>
              <div className="pb-1">
                <Stars rating={average} />
                <p className="text-muted-foreground mt-1 text-xs">
                  {count} recenzii
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-2">
              {distribution
                .map((n, i) => ({ stars: 5 - i, n }))
                .map(({ stars, n }) => (
                  <li key={stars} className="flex items-center gap-4">
                    <span className="text-muted-foreground w-8 shrink-0 text-xs">
                      {stars}★
                    </span>
                    <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-warning block h-full rounded-full"
                        style={{ width: `${(n / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-6 shrink-0 text-right text-xs">
                      {n}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <ul className="space-y-6">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border-border border-b pb-6 last:border-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground font-semibold">
                    {review.author}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {review.date}
                  </span>
                </div>
                <Stars rating={review.rating} className="mt-1.5" />
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
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
