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
    <section className="small:py-20 py-12">
      <Container>
        {title && (
          <h2 className="font-display text-foreground small:mb-12 small:text-3xl medium:text-4xl mb-8 text-center text-2xl font-extrabold tracking-tight uppercase">
            {title}
          </h2>
        )}
        <div className="medium:grid-cols-3 medium:gap-6 grid grid-cols-1 gap-6">
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
    <article className="clip-corner-cut-md bg-foreground text-background flex flex-col overflow-hidden">
      <div className="relative aspect-4/3 w-full overflow-hidden">
        <Image
          src={testimonial.image.src}
          alt={testimonial.image.alt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="small:p-8 flex flex-1 flex-col gap-6 p-6">
        <h3 className="font-display small:text-lg text-base leading-snug font-extrabold tracking-tight uppercase">
          <span className="text-primary">{testimonial.heading}</span>{" "}
          <span className="text-background">{testimonial.productName}</span>
        </h3>
        <p className="text-background/85 small:text-base text-sm leading-relaxed">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <p className="text-background/60 small:text-sm mt-auto pt-2 text-right text-xs font-medium">
          — {testimonial.author}
        </p>
      </div>
    </article>
  );
}
