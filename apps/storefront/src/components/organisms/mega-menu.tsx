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
import { categoriesTree, type CategoryNode } from "@lib/data/categories-tree";

const FEATURED_BANNERS: Record<
  string,
  { title: string; description: string; cta: string; href: string; bg: string }
> = {
  "auto-moto": {
    title: "Atelier auto",
    description: "Echipament profesional pentru garaj și service.",
    cta: "Descoperă",
    href: "/categories/auto-moto",
    bg: "from-amber-200 via-amber-100 to-orange-50",
  },
  consumabile: {
    title: "Consumabile pro",
    description: "Burghie, discuri și markere pentru lucrări precise.",
    cta: "Vezi consumabile",
    href: "/categories/consumabile",
    bg: "from-rose-100 via-orange-100 to-amber-100",
  },
  "echipamente-de-protectie": {
    title: "Siguranță întâi",
    description: "EIP certificat — căști, mănuși, ochelari, măști.",
    cta: "Echipează-te",
    href: "/categories/echipamente-de-protectie",
    bg: "from-emerald-100 via-emerald-50 to-teal-50",
  },
  "gospodarie-intretinere": {
    title: "Gospodărie",
    description: "Soluții pentru întreținere și securitate de zi cu zi.",
    cta: "Descoperă",
    href: "/categories/gospodarie-intretinere",
    bg: "from-sky-100 via-indigo-50 to-slate-50",
  },
  gradinarit: {
    title: "Sezon de grădină",
    description: "Inventar, unelte și accesorii pentru grădină.",
    cta: "Vezi grădina",
    href: "/categories/gradinarit",
    bg: "from-lime-100 via-emerald-50 to-emerald-100",
  },
  "scule-manuale": {
    title: "Scule manuale premium",
    description: "Mărci profesionale pentru ateliere serioase.",
    cta: "Vezi sculele",
    href: "/categories/scule-manuale",
    bg: "from-orange-100 via-orange-50 to-amber-50",
  },
};

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

export function MegaMenu() {
  return (
    <NavigationMenu className="hidden small:flex">
      <NavigationMenuList className="gap-0.5">
        {categoriesTree.map((category) => {
          const banner = FEATURED_BANNERS[category.handle];
          const hasChildren = category.children.length > 0;
          return (
            <NavigationMenuItem key={category.handle}>
              {hasChildren ? (
                <>
                  <NavigationMenuTrigger>{category.name}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[680px] grid-cols-[1fr_240px] gap-6 p-6 lg:w-[860px] lg:grid-cols-[1fr_260px]">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        {category.children.map((child) => (
                          <ColumnItem key={child.handle} node={child} />
                        ))}
                      </div>
                      {banner && (
                        <Link
                          href={banner.href}
                          className={cn(
                            "group relative flex flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br p-5 text-foreground",
                            banner.bg
                          )}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
                            {category.name}
                          </span>
                          <h4 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight">
                            {banner.title}
                          </h4>
                          <p className="mt-1 text-xs text-foreground/70">
                            {banner.description}
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                            {banner.cta}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Link>
                      )}
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
