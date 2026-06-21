import * as React from "react";
import Image from "next/image";
import { Camera, MapPin } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";

type Project = {
  seed: string;
  width: number;
  height: number;
  handle: string;
  city: string;
  caption: string;
  spanClass: string;
};

const PROJECTS: Project[] = [
  {
    seed: "dyllu-atelier-auto",
    width: 800,
    height: 1000,
    handle: "@atelier_auto_md",
    city: "Chișinău",
    caption: "Restaurare motor — DYLLU 20V combo kit.",
    spanClass: "small:col-span-2 small:row-span-2",
  },
  {
    seed: "dyllu-renovare",
    width: 800,
    height: 600,
    handle: "@constructori_bv",
    city: "Bălți",
    caption: "Renovare apartament — set scule manuale.",
    spanClass: "small:col-span-2",
  },
  {
    seed: "dyllu-gradina",
    width: 800,
    height: 600,
    handle: "@gradina_dan",
    city: "Cahul",
    caption: "Pregătire de primăvară — accesorii grădină.",
    spanClass: "small:col-span-2",
  },
  {
    seed: "dyllu-tamplarie",
    width: 800,
    height: 800,
    handle: "@workshop_md",
    city: "Orhei",
    caption: "Atelier tâmplărie — bormașină pro.",
    spanClass: "small:col-span-2",
  },
  {
    seed: "dyllu-sudura",
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
    <section className="bg-foreground py-16 text-background small:py-24">
      <Container>
        <header className="mb-10 flex flex-col items-start justify-between gap-6 small:flex-row small:items-end">
          <div className="flex flex-col gap-3">
            <Eyebrow icon={<Camera className="size-3.5" />}>
              Construit cu DYLLU
            </Eyebrow>
            <h2 className="max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-background small:text-display-md">
              Proiecte reale, din ateliere reale.
            </h2>
            <p className="max-w-xl text-sm text-background/65 small:text-base">
              Profesioniști și pasionați din toată Moldova folosesc DYLLU în
              fiecare zi. Iată câteva din proiectele lor.
            </p>
          </div>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            #ConstruitCuDYLLU
          </a>
        </header>
        <div className="grid grid-cols-2 gap-3 small:grid-cols-6 small:gap-4">
          {PROJECTS.map((p) => (
            <ProjectCard key={p.seed} project={p} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <figure
      className={`clip-corner-cut-md group relative overflow-hidden bg-background/5 ${project.spanClass}`}
    >
      <Image
        src={`https://picsum.photos/seed/${project.seed}/${project.width}/${project.height}`}
        alt={`${project.handle} — ${project.caption}`}
        width={project.width}
        height={project.height}
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-background small:p-5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {project.handle}
          <span className="size-1 rounded-full bg-background/40" />
          <span className="inline-flex items-center gap-1 text-background/70">
            <MapPin className="size-3" />
            {project.city}
          </span>
        </span>
        <p className="text-sm font-medium leading-snug text-background/90">
          {project.caption}
        </p>
      </figcaption>
    </figure>
  );
}
