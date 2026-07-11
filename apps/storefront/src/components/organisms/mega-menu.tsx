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
import {
  getCategoryNavLabel,
  getPrimaryCategoriesForNavigation,
  getSecondaryCategoriesForNavigation,
} from "@lib/data/category-navigation";

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
  "consumabile-si-accesorii": [
    {
      eyebrow: "Consumabile",
      title: "Burghie SDS+ −20%",
      ctaLabel: "Vezi consumabilele",
      href: "/categories/consumabile-si-accesorii",
      imageUrl: "/images/dyllu-consumables.png",
      imageAlt: "Consumabile DYLLU — burghie și discuri",
    },
    {
      eyebrow: "Stoc nou",
      title: "Acumulatori 4.0Ah Li-Ion",
      ctaLabel: "Vezi acumulatorii",
      href: "/categories/consumabile-si-accesorii",
      imageUrl:
        "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285509.webp",
      imageAlt: "Acumulator DYLLU 20V",
    },
  ],
  gradinarit: [
    {
      eyebrow: "Sezon de primăvară",
      title: "Pregătește grădina",
      ctaLabel: "Vezi accesoriile",
      href: "/categories/gradinarit",
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
  "echipament-de-protectie": [
    {
      eyebrow: "EIP certificat",
      title: "Pachete protecție −15%",
      ctaLabel: "Vezi pachetele",
      href: "/categories/echipament-de-protectie",
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
        className="clip-corner-cut-md group relative flex min-h-[136px] overflow-hidden bg-secondary text-secondary-foreground transition-transform duration-300 hover:-translate-y-0.5"
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
        <div className="relative z-[1] flex w-full flex-col justify-between gap-2.5 p-3.5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
              {eyebrow}
            </span>
            <span className="font-display text-[13px] font-bold leading-tight tracking-tight">
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
          className="group flex items-start justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium leading-snug tracking-tight text-foreground transition-colors hover:bg-muted/80"
        >
          <span className="min-w-0 flex-1">{node.name}</span>
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </NavigationMenuLink>
      {node.children.length > 0 && (
        <ul className="list-none space-y-1 pl-3">
          {node.children.map((child) => (
            <li key={child.handle} className="list-none">
              <NavigationMenuLink asChild>
                <Link
                  href={`/categories/${child.handle}`}
                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
  includeSaleLink?: boolean;
  tier?: "primary" | "secondary";
  onOverlayStateChange?: (active: boolean) => void;
}

export function MegaMenu({
  categories,
  includeSaleLink = true,
  tier = "secondary",
  onOverlayStateChange,
}: MegaMenuProps) {
  const navigationCategories =
    tier === "primary"
      ? getPrimaryCategoriesForNavigation(categories)
      : getSecondaryCategoriesForNavigation(categories);
  const isPrimary = tier === "primary";
  const itemClassName = cn(
    navigationMenuTriggerStyle(),
    isPrimary
      ? "h-10 whitespace-nowrap rounded-full px-3.5 text-[15px] font-semibold tracking-tight text-background/92 hover:bg-background/10 hover:text-background focus:bg-background/10 focus:text-background data-[active]:bg-background/10 data-[state=open]:bg-background/10"
      : "h-9 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium tracking-tight text-background/78 hover:bg-background/10 hover:text-background focus:bg-background/10 focus:text-background data-[active]:bg-background/10 data-[state=open]:bg-background/10"
  );

  if (navigationCategories.length === 0 && !includeSaleLink) {
    return null;
  }

  return (
    <NavigationMenu
      className="hidden w-full max-w-none small:flex"
      onMouseLeave={() => onOverlayStateChange?.(false)}
      onBlurCapture={() => onOverlayStateChange?.(false)}
    >
      <NavigationMenuList
        className={cn(
          "w-full",
          isPrimary
            ? "flex-wrap justify-center gap-x-1.5 gap-y-1 py-1"
            : "flex-wrap justify-start gap-x-1 gap-y-1 py-2"
        )}
      >
        {navigationCategories.map((category) => {
          const deals = CATEGORY_DEALS[category.handle];
          const hasChildren = category.children.length > 0;
          const displayName = getCategoryNavLabel(category);
          const useThreeColumns = category.children.length >= 12;
          const gridColumnsClass = useThreeColumns
            ? "grid-cols-3 gap-x-4 gap-y-1.5"
            : "grid-cols-2 gap-x-5 gap-y-1.5";
          const panelWidthClass = deals?.length
            ? isPrimary
              ? useThreeColumns
                ? "w-[min(1000px,calc(100vw-96px))] grid-cols-[minmax(0,1fr)_240px]"
                : "w-[min(920px,calc(100vw-96px))] grid-cols-[minmax(0,1fr)_240px]"
              : "w-[820px] grid-cols-[minmax(0,1fr)_220px]"
            : isPrimary
              ? useThreeColumns
                ? "w-[min(760px,calc(100vw-96px))] grid-cols-1"
                : "w-[min(700px,calc(100vw-96px))] grid-cols-1"
              : "w-[640px] grid-cols-1";
          return (
            <NavigationMenuItem key={category.handle}>
              {hasChildren ? (
                <>
                  <NavigationMenuTrigger
                    className={itemClassName}
                    onMouseEnter={() => {
                      if (isPrimary) {
                        onOverlayStateChange?.(true);
                      }
                    }}
                    onFocus={() => {
                      if (isPrimary) {
                        onOverlayStateChange?.(true);
                      }
                    }}
                  >
                    {displayName}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    onMouseEnter={() => {
                      if (isPrimary) {
                        onOverlayStateChange?.(true);
                      }
                    }}
                    onFocusCapture={() => {
                      if (isPrimary) {
                        onOverlayStateChange?.(true);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "grid gap-6 overflow-hidden rounded-[22px] border border-border/80 bg-background p-6 shadow-[0_26px_80px_rgba(0,0,0,0.18)]",
                        panelWidthClass
                      )}
                    >
                      <div className="space-y-4">
                        <div className="flex items-end justify-between gap-4 border-b border-border/70 pb-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Explorează categoria
                            </span>
                            <div className="font-display text-xl font-bold tracking-tight text-foreground">
                              {displayName}
                            </div>
                          </div>
                          <Link
                            href={`/categories/${category.handle}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            Vezi tot
                            <ArrowRight className="size-4" />
                          </Link>
                        </div>
                        <div className={cn("grid", gridColumnsClass)}>
                          {category.children.map((child) => (
                            <ColumnItem key={child.handle} node={child} />
                          ))}
                        </div>
                      </div>
                      {deals?.length ? (
                        <div className="flex flex-col gap-2.5 border-l border-border/70 pl-5">
                          <div className="flex items-baseline justify-between">
                            <span className="max-w-[15ch] text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
                              Oferte {displayName}
                            </span>
                            <Link
                              href="/store?on_sale=true"
                              className="text-[11px] font-semibold text-destructive transition-colors hover:text-destructive/80"
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
                    className={itemClassName}
                  >
                    {displayName}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          );
        })}
        {includeSaleLink ? (
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href="/store?on_sale=true"
                className={cn(
                  itemClassName,
                  "text-destructive hover:text-destructive focus:text-destructive"
                )}
              >
                Reduceri
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ) : null}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
