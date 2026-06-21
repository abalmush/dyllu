import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Button } from "@/components/atoms/button";
import { Eyebrow } from "@/components/molecules/eyebrow";

export interface PromoHeroProps {
  eyebrow?: string;
  headline: React.ReactNode;
  description?: string;
  badge?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image: { src: string; alt: string; width?: number; height?: number };
}

export function PromoHero({
  eyebrow,
  headline,
  description,
  badge,
  primaryCta,
  secondaryCta,
  image,
}: PromoHeroProps) {
  return (
    <section className="relative overflow-hidden bg-surface-subtle">
      <span aria-hidden className="ds-grid-bg absolute inset-0 opacity-30" />
      <span
        aria-hidden
        className="absolute -right-32 top-1/2 size-[640px] -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <Container className="relative">
        <div className="grid items-center gap-12 py-14 medium:grid-cols-[1.1fr_1fr] medium:gap-16 medium:py-24">
          <div className="flex flex-col gap-7">
            {eyebrow && (
              <Eyebrow icon={<Zap className="size-3.5" />}>{eyebrow}</Eyebrow>
            )}
            <h1 className="font-display text-display-md font-extrabold leading-[1.02] tracking-tight text-foreground small:text-display-lg medium:text-display-xl">
              {headline}
            </h1>
            {description && (
              <p className="max-w-xl text-base text-muted-foreground small:text-lg">
                {description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="xl" variant="brand">
                <Link href={primaryCta.href}>
                  {primaryCta.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  {secondaryCta.label}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-x-8 bottom-6 h-10 rounded-full bg-foreground/30 blur-2xl"
            />
            <div className="clip-corner-cut-lg relative aspect-square w-full overflow-hidden bg-background shadow-[0_60px_120px_-50px_rgba(15,23,42,0.45)]">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width ?? 900}
                height={image.height ?? 900}
                priority
                sizes="(min-width: 1024px) 540px, (min-width: 640px) 80vw, 92vw"
                className="size-full object-contain p-6 medium:p-10"
              />
              {badge && (
                <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-background shadow-md">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
