"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/atoms/navigation-menu";
import { type CategoryNode } from "@lib/data/categories";

type MegaDeal = {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
};

const CATEGORY_DEALS: Record<string, MegaDeal[]> = {
  "scule-electrice": [
    {
      eyebrow: "Săptămâna sculelor",
      title: "−30% la bormașini brushless",
      ctaLabel: "Vezi oferta",
      href: "/store?on_sale=true",
      imageUrl:
        "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
      imageAlt: "Bormașină DYLLU 20V brushless",
    },
    {
      eyebrow: "Combo 20V Max",
      title: "Set 2 piese — preț pachet",
      ctaLabel: "Vezi setul",
      href: "/categories/scule-electrice",
      imageUrl:
        "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
      imageAlt: "Set DYLLU 20V combo kit",
    },
  ],
  "accesorii-si-consumabile": [
    {
      eyebrow: "Consumabile",
      title: "Burghie SDS+ −20%",
      ctaLabel: "Vezi consumabilele",
      href: "/categories/accesorii-si-consumabile",
      imageUrl: "/images/dyllu-consumables.png",
      imageAlt: "Consumabile DYLLU — burghie și discuri",
    },
    {
      eyebrow: "Stoc nou",
      title: "Acumulatori 4.0Ah Li-Ion",
      ctaLabel: "Vezi acumulatorii",
      href: "/categories/accesorii-si-consumabile",
      imageUrl:
        "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285509.webp",
      imageAlt: "Acumulator DYLLU 20V",
    },
  ],
  gradina: [
    {
      eyebrow: "Sezon de primăvară",
      title: "Pregătește grădina",
      ctaLabel: "Vezi accesoriile",
      href: "/categories/gradina",
      imageUrl: "/images/grinder-sparks.jpeg",
      imageAlt: "Pregătire grădină DYLLU",
    },
  ],
  "scule-manuale": [
    {
      eyebrow: "Atelier complet",
      title: "Truse de șurubelnițe & chei",
      ctaLabel: "Vezi trusele",
      href: "/categories/scule-manuale",
      imageUrl:
        "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
      imageAlt: "Truse DYLLU pentru atelier",
    },
  ],
  "protectie-si-imbracaminte": [
    {
      eyebrow: "EIP certificat",
      title: "Pachete protecție −15%",
      ctaLabel: "Vezi pachetele",
      href: "/categories/protectie-si-imbracaminte",
      imageUrl: "/images/dyllu-safety-gear.png",
      imageAlt: "Echipament individual de protecție DYLLU",
    },
  ],
  depozitare: [
    {
      eyebrow: "Organizare atelier",
      title: "Cutii & dulapuri modulare",
      ctaLabel: "Vezi soluțiile",
      href: "/categories/depozitare",
      imageUrl: "/images/dyllu-grinder-thermal.png",
      imageAlt: "Soluții de depozitare DYLLU",
    },
  ],
};

function DealTile({
  eyebrow,
  title,
  ctaLabel,
  href,
  imageUrl,
  imageAlt,
}: MegaDeal) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        aria-label={`${title} — ${ctaLabel}`}
        className="clip-corner-cut-md group relative flex min-h-[150px] overflow-hidden bg-secondary text-secondary-foreground transition-transform duration-300 hover:-translate-y-0.5"
      >
        <span
          aria-hidden
          role="img"
          aria-label={imageAlt}
          className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-tr from-foreground/85 via-foreground/45 to-foreground/10"
        />
        <div className="relative z-[1] flex w-full flex-col justify-between gap-3 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
              {eyebrow}
            </span>
            <span className="font-display text-sm font-bold leading-tight tracking-tight">
              {title}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start text-xs font-semibold">
            {ctaLabel}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </NavigationMenuLink>
  );
}

function ColumnItem({ node }: { node: CategoryNode }) {
  return (
    <div className="space-y-1">
      <NavigationMenuLink asChild>
        <Link
          href={`/categories/${node.handle}`}
          className="block rounded-md px-2 py-1.5 text-sm font-semibold tracking-tight text-foreground hover:bg-muted"
        >
          {node.name}
        </Link>
      </NavigationMenuLink>
      {node.children.length > 0 && (
        <ul className="ml-2 list-none space-y-0.5 border-l border-border pl-3">
          {node.children.map((child) => (
            <li key={child.handle} className="list-none">
              <NavigationMenuLink asChild>
                <Link
                  href={`/categories/${child.handle}`}
                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {child.name}
                </Link>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface MegaMenuProps {
  categories: CategoryNode[];
}

export function MegaMenu({ categories }: MegaMenuProps) {
  return (
    <NavigationMenu className="hidden small:flex">
      <NavigationMenuList className="gap-0.5">
        {categories.map((category) => {
          const deals = CATEGORY_DEALS[category.handle];
          const hasChildren = category.children.length > 0;
          return (
            <NavigationMenuItem key={category.handle}>
              {hasChildren ? (
                <>
                  <NavigationMenuTrigger>{category.name}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div
                      className={cn(
                        "grid gap-6 p-6",
                        deals?.length
                          ? "w-[760px] grid-cols-[1fr_280px] lg:w-[980px] lg:grid-cols-[1fr_320px]"
                          : "w-[680px] grid-cols-1 lg:w-[860px]"
                      )}
                    >
                      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        {category.children.map((child) => (
                          <ColumnItem key={child.handle} node={child} />
                        ))}
                      </div>
                      {deals?.length ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Oferte {category.name}
                            </span>
                            <Link
                              href="/store?on_sale=true"
                              className="text-[11px] font-semibold text-destructive hover:underline"
                            >
                              Toate
                            </Link>
                          </div>
                          <div
                            className={cn(
                              "grid gap-3",
                              deals.length > 1 ? "grid-rows-2" : "grid-rows-1"
                            )}
                          >
                            {deals.slice(0, 2).map((deal, i) => (
                              <DealTile key={`${deal.title}-${i}`} {...deal} />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink asChild>
                  <Link
                    href={`/categories/${category.handle}`}
                    className={navigationMenuTriggerStyle()}
                  >
                    {category.name}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          );
        })}
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/store?on_sale=true"
              className={cn(
                navigationMenuTriggerStyle(),
                "text-destructive hover:text-destructive"
              )}
            >
              Reduceri
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
