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
    <section className="small:py-24 py-16">
      <Container>
        <header className="small:flex-row small:items-end mb-12 flex flex-col items-start justify-between gap-4">
          <div>
            <Eyebrow icon={<BookOpen className="size-3.5" />}>
              Ghiduri și resurse
            </Eyebrow>
            <h2 className="font-display text-display-sm text-foreground small:text-display-md mt-4 max-w-2xl font-extrabold tracking-tight">
              Învață, compară, alege scula potrivită.
            </h2>
          </div>
          <Link
            href="/branduri"
            className="group text-foreground inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Toate ghidurile
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </header>
        <div className="small:grid-cols-3 grid gap-6">
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
      className="clip-corner-cut-md group bg-card small:p-8 relative flex flex-col gap-6 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.45)]"
    >
      <div className="text-2xs text-muted-foreground flex items-center gap-4 font-semibold tracking-[0.18em] uppercase">
        <span className="text-foreground">{category}</span>
        <span className="bg-border size-1 rounded-full" />
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3" />
          {readTime}
        </span>
      </div>
      <h3 className="font-display text-foreground group-hover:text-primary small:text-2xl text-xl leading-snug font-bold tracking-tight transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
      <span className="text-foreground mt-auto inline-flex items-center gap-2 text-sm font-semibold">
        Citește ghidul
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
