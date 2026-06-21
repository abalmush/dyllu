import * as React from "react";
import Link from "next/link";
import {
  Drill,
  Flame,
  Hammer,
  HardHat,
  PackageOpen,
  Sprout,
} from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";

type Family = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const FAMILIES: Family[] = [
  {
    label: "Scule electrice",
    href: "/store",
    icon: <Drill className="size-6" strokeWidth={1.75} />,
  },
  {
    label: "Sudură",
    href: "/store",
    icon: <Flame className="size-6" strokeWidth={1.75} />,
  },
  {
    label: "Grădinărit",
    href: "/categories/gradinarit",
    icon: <Sprout className="size-6" strokeWidth={1.75} />,
  },
  {
    label: "Scule manuale",
    href: "/categories/scule-manuale",
    icon: <Hammer className="size-6" strokeWidth={1.75} />,
  },
  {
    label: "Protecție",
    href: "/categories/echipamente-de-protectie",
    icon: <HardHat className="size-6" strokeWidth={1.75} />,
  },
  {
    label: "Consumabile",
    href: "/categories/consumabile",
    icon: <PackageOpen className="size-6" strokeWidth={1.75} />,
  },
];

export function ToolFamiliesStrip() {
  return (
    <section className="border-y border-border bg-background py-10 small:py-14">
      <Container>
        <header className="mb-8 flex flex-col items-start gap-3">
          <Eyebrow>Tot ce produce DYLLU</Eyebrow>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground small:text-3xl">
            Alege după tipul sculei.
          </h2>
        </header>
        <ul className="grid grid-cols-3 gap-3 small:grid-cols-6 small:gap-4">
          {FAMILIES.map((f) => (
            <li key={f.label}>
              <Link
                href={f.href}
                className="clip-corner-cut-md group flex h-full flex-col items-center justify-center gap-4 bg-foreground p-5 text-center transition-all duration-300 hover:-translate-y-1"
              >
                <span className="grid size-14 place-items-center rounded-full bg-primary/15 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  {f.icon}
                </span>
                <span className="text-sm font-semibold tracking-tight text-background">
                  {f.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
