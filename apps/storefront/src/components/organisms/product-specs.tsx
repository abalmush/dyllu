import * as React from "react";

import { Container } from "@/components/atoms/container";

export type SpecRow = { label: string; value: string };

type Props = {
  description?: string;
  specs: SpecRow[];
};

export function ProductSpecs({ description, specs }: Props) {
  return (
    <section className="bg-surface-subtle py-16 small:py-20">
      <Container>
        <div className="grid gap-10 medium:grid-cols-[1fr_1fr] medium:gap-16">
          {description && (
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
                Descriere
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground small:text-base">
                {description}
              </p>
            </div>
          )}

          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
              Specificații
            </h2>
            <dl className="mt-4 divide-y divide-border border-y border-border">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <dt className="text-sm text-muted-foreground">
                    {spec.label}
                  </dt>
                  <dd className="text-right text-sm font-semibold text-foreground">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
