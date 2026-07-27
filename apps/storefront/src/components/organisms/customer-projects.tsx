import * as React from "react";
import Image from "next/image";
import { Camera, MapPin } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";

type Project = {
  src: string;
  width: number;
  height: number;
  handle: string;
  city: string;
  caption: string;
  spanClass: string;
};

const PROJECTS: Project[] = [
  {
    src: "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
    width: 800,
    height: 1000,
    handle: "@atelier_auto_md",
    city: "Chișinău",
    caption: "Restaurare motor — set complet DYLLU 20V.",
    spanClass: "small:col-span-2 small:row-span-2",
  },
  {
    src: "/images/grinder-sparks.jpeg",
    width: 800,
    height: 600,
    handle: "@constructori_bv",
    city: "Bălți",
    caption: "Renovare apartament — set scule manuale.",
    spanClass: "small:col-span-2",
  },
  {
    src: "/images/dyllu-consumables.png",
    width: 800,
    height: 600,
    handle: "@gradina_dan",
    city: "Cahul",
    caption: "Pregătire de primăvară — accesorii grădină.",
    spanClass: "small:col-span-2",
  },
  {
    src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
    width: 800,
    height: 800,
    handle: "@workshop_md",
    city: "Orhei",
    caption: "Atelier tâmplărie — bormașină pro.",
    spanClass: "small:col-span-2",
  },
  {
    src: "/images/dyllu-safety-gear.png",
    width: 800,
    height: 800,
    handle: "@meserii_md",
    city: "Tighina",
    caption: "Sudură + protecție EIP completă.",
    spanClass: "small:col-span-2",
  },
];

export function CustomerProjects() {
  return (
    <section className="bg-foreground text-background small:py-24 py-16">
      <Container>
        <header className="small:flex-row small:items-end mb-12 flex flex-col items-start justify-between gap-6">
          <div className="flex flex-col gap-4">
            <Eyebrow icon={<Camera className="size-3.5" />}>
              Construit cu DYLLU
            </Eyebrow>
            <h2 className="font-display text-display-sm text-background small:text-display-md max-w-2xl font-extrabold tracking-tight">
              Proiecte reale, din ateliere reale.
            </h2>
            <p className="text-background/65 small:text-base max-w-xl text-sm">
              Profesioniști și pasionați din toată Moldova folosesc DYLLU în
              fiecare zi. Iată câteva din proiectele lor.
            </p>
          </div>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            #ConstruitCuDYLLU
          </a>
        </header>
        <div className="small:grid-cols-6 small:gap-4 grid grid-cols-2 gap-4">
          {PROJECTS.map((p) => (
            <ProjectCard key={`${p.handle}-${p.city}`} project={p} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <figure
      className={`clip-corner-cut-md group bg-background/5 relative overflow-hidden ${project.spanClass}`}
    >
      <Image
        src={project.src}
        alt={`${project.handle} — ${project.caption}`}
        width={project.width}
        height={project.height}
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <span
        aria-hidden
        className="from-foreground via-foreground/40 pointer-events-none absolute inset-0 bg-linear-to-t to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100"
      />
      <figcaption className="text-background small:p-6 absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
        <span className="text-2xs text-primary flex items-center gap-2 font-semibold tracking-[0.18em] uppercase">
          {project.handle}
          <span className="bg-background/40 size-1 rounded-full" />
          <span className="text-background/70 inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {project.city}
          </span>
        </span>
        <p className="text-background/90 text-sm leading-snug font-medium">
          {project.caption}
        </p>
      </figcaption>
    </figure>
  );
}
