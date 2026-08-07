import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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
    <section className="bg-surface-subtle relative overflow-hidden">
      <span aria-hidden className="ds-grid-bg absolute inset-0 opacity-30" />
      <span
        aria-hidden
        className="bg-primary/15 absolute top-1/2 -right-32 size-[640px] -translate-y-1/2 rounded-full blur-3xl"
      />
      <Container className="relative">
        <div className="medium:grid-cols-[1.1fr_1fr] medium:gap-16 medium:py-24 grid items-center gap-12 py-16">
          <div className="flex flex-col gap-8">
            {eyebrow && (
              <Eyebrow icon={<Zap className="size-3.5" />}>{eyebrow}</Eyebrow>
            )}
            <h1 className="font-display text-display-md text-foreground small:text-display-lg medium:text-display-xl leading-[1.02] font-extrabold tracking-tight">
              {headline}
            </h1>
            {description && (
              <p className="text-muted-foreground small:text-lg max-w-xl text-base">
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
                  className="group text-foreground inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
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
              className="bg-foreground/30 absolute inset-x-8 bottom-6 h-10 rounded-full blur-2xl"
            />
            <div className="clip-corner-cut-lg bg-background relative aspect-square w-full overflow-hidden shadow-[0_60px_120px_-50px_rgba(15,23,42,0.45)]">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width ?? 900}
                height={image.height ?? 900}
                priority
                sizes="(min-width: 1024px) 540px, (min-width: 640px) 80vw, 92vw"
                className="medium:p-12 size-full object-contain p-6"
              />
              {badge && (
                <span className="bg-foreground text-2xs text-background absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold tracking-[0.18em] uppercase shadow-md">
                  <span className="bg-primary size-1.5 rounded-full" />
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
