import * as React from "react";

import { Container } from "@/components/atoms/container";

export type SpecRow = { label: string; value: string };

type Props = {
  description?: string;
  specs: SpecRow[];
};

export function ProductSpecs({ description, specs }: Props) {
  return (
    <section className="bg-surface-subtle small:py-20 py-16">
      <Container>
        <div className="medium:grid-cols-[1fr_1fr] medium:gap-16 grid gap-12">
          {description && (
            <div>
              <h2 className="font-display text-foreground small:text-3xl text-2xl font-extrabold tracking-tight">
                Descriere
              </h2>
              <p className="text-muted-foreground small:text-base mt-4 text-sm leading-relaxed">
                {description}
              </p>
            </div>
          )}

          <div>
            <h2 className="font-display text-foreground small:text-3xl text-2xl font-extrabold tracking-tight">
              Specificații
            </h2>
            <dl className="divide-border border-border mt-4 divide-y border-y">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 py-4"
                >
                  <dt className="text-muted-foreground text-sm">
                    {spec.label}
                  </dt>
                  <dd className="text-foreground text-right text-sm font-semibold">
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
