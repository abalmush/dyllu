import * as React from "react";
import Image from "next/image";

import { Container } from "@/components/atoms/container";

export type TestimonialData = {
  image: { src: string; alt: string };
  heading: string;
  productName: string;
  quote: string;
  author: string;
};

export interface CustomerTestimonialsProps {
  title?: string;
  testimonials: TestimonialData[];
}

export function CustomerTestimonials({
  title,
  testimonials,
}: CustomerTestimonialsProps) {
  if (!testimonials.length) return null;

  return (
    <section className="py-12 small:py-20">
      <Container>
        {title && (
          <h2 className="mb-8 text-center font-display text-2xl font-extrabold uppercase tracking-tight text-foreground small:mb-12 small:text-3xl medium:text-4xl">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-5 medium:grid-cols-3 medium:gap-6">
          {testimonials.map((t, i) => (
            <TestimonialCard key={`${t.author}-${i}`} testimonial={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: TestimonialData }) {
  return (
    <article className="clip-corner-cut-md flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={testimonial.image.src}
          alt={testimonial.image.alt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="flex flex-1 flex-col gap-5 p-6 small:p-8">
        <h3 className="font-display text-base font-extrabold uppercase leading-snug tracking-tight small:text-lg">
          <span className="text-primary">{testimonial.heading}</span>{" "}
          <span className="text-background">{testimonial.productName}</span>
        </h3>
        <p className="text-sm leading-relaxed text-background/85 small:text-base">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <p className="mt-auto pt-2 text-right text-xs font-medium text-background/60 small:text-sm">
          — {testimonial.author}
        </p>
      </div>
    </article>
  );
}
