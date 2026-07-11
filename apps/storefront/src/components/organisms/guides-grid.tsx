import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";

type Guide = {
  category: string;
  readTime: string;
  title: string;
  description: string;
  href: string;
};

const GUIDES: Guide[] = [
  {
    category: "Scule electrice",
    readTime: "5 min",
    title: "Cum alegi un polizor unghiular potrivit",
    description:
      "Diametru disc, putere, turații variabile — ce contează pentru lucrul tău și ce e doar marketing.",
    href: "/branduri",
  },
  {
    category: "Sudură",
    readTime: "7 min",
    title: "MIG vs TIG — ghid practic pentru atelier",
    description:
      "Două tehnologii, două cazuri de utilizare. Cum decizi care e potrivită pentru proiectul tău.",
    href: "/branduri",
  },
  {
    category: "Întreținere",
    readTime: "4 min",
    title: "Cum prelungești viața sculelor electrice",
    description:
      "Curățare, depozitare, schimb de perii și acumulatori — pași simpli care înseamnă ani în plus.",
    href: "/branduri",
  },
];

export function GuidesGrid() {
  return (
    <section className="py-16 small:py-24">
      <Container>
        <header className="mb-10 flex flex-col items-start justify-between gap-4 small:flex-row small:items-end">
          <div>
            <Eyebrow icon={<BookOpen className="size-3.5" />}>
              Ghiduri și resurse
            </Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-foreground small:text-display-md">
              Învață, compară, alege scula potrivită.
            </h2>
          </div>
          <Link
            href="/branduri"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Toate ghidurile
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </header>
        <div className="grid gap-5 small:grid-cols-3">
          {GUIDES.map((g) => (
            <GuideCard key={g.title} {...g} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function GuideCard({ category, readTime, title, description, href }: Guide) {
  return (
    <Link
      href={href}
      className="clip-corner-cut-md group relative flex flex-col gap-5 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.45)] small:p-8"
    >
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground">{category}</span>
        <span className="size-1 rounded-full bg-border" />
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3" />
          {readTime}
        </span>
      </div>
      <h3 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary small:text-2xl">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        Citește ghidul
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
