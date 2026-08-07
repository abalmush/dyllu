"use client";

import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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
  orderChildCategoriesForNavigation,
  orderCategoriesForNavigation,
} from "@lib/data/category-navigation";

function ColumnItem({ node }: { node: CategoryNode }) {
  return (
    <div className="space-y-1">
      <NavigationMenuLink asChild>
        <Link
          href={`/categories/${node.handle}`}
          className="group hover:border-primary/40 hover:bg-primary/5 flex items-stretch justify-between gap-2 rounded-md border border-transparent transition-colors"
        >
          {node.navThumbnailUrl ? (
            <span className="relative h-[52px] w-[72px] shrink-0 overflow-hidden rounded-l-md">
              <Image
                src={node.navThumbnailUrl}
                alt=""
                fill
                sizes="72px"
                className="object-contain"
              />
            </span>
          ) : null}
          <span className="text-foreground flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-sm leading-snug font-medium tracking-tight">
            <span className="min-w-0 flex-1">{node.name}</span>
            <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </NavigationMenuLink>
      {node.children.length > 0 && (
        <ul className="list-none space-y-1 pl-4">
          {node.children.map((child) => (
            <li key={child.handle} className="list-none">
              <NavigationMenuLink asChild>
                <Link
                  href={`/categories/${child.handle}`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-2 py-1 text-sm transition-colors"
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
}

export function MegaMenu({
  categories,
  includeSaleLink = true,
}: MegaMenuProps) {
  const navigationCategories = getPrimaryCategoriesForNavigation(categories);
  const allCategories = orderCategoriesForNavigation(categories);
  const itemClassName = cn(
    navigationMenuTriggerStyle(),
    "min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold tracking-tight text-background hover:bg-background/10 hover:text-background focus:bg-background/10 focus:text-background focus-visible:ring-2 focus-visible:ring-background/60 data-[active]:bg-background/10 data-[active]:text-background data-[state=open]:bg-background/10 data-[state=open]:text-background"
  );

  if (navigationCategories.length === 0 && !includeSaleLink) {
    return null;
  }

  return (
    <NavigationMenu className="small:flex hidden w-full max-w-none">
      <NavigationMenuList className="w-full flex-nowrap justify-center gap-x-1 py-1">
        {navigationCategories.map((category) => {
          const hasChildren = category.children.length > 0;
          const displayName = getCategoryNavLabel(category);
          const childCategories = orderChildCategoriesForNavigation(category);
          const useThreeColumns = childCategories.length >= 12;
          const gridColumnsClass = useThreeColumns
            ? "grid-cols-3 gap-x-4 gap-y-1.5"
            : "grid-cols-2 gap-x-6 gap-y-1.5";
          const panelWidthClass = useThreeColumns
            ? "w-[min(760px,calc(100vw-96px))] grid-cols-1"
            : "w-[min(700px,calc(100vw-96px))] grid-cols-1";
          return (
            <NavigationMenuItem key={category.handle}>
              {hasChildren ? (
                <>
                  <NavigationMenuTrigger className={itemClassName}>
                    {displayName}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div
                      className={cn(
                        "border-border/80 bg-background grid gap-6 overflow-hidden rounded-[22px] border p-6 shadow-[0_26px_80px_rgba(0,0,0,0.18)]",
                        panelWidthClass
                      )}
                    >
                      <div className="space-y-4">
                        <div className="border-border/70 flex items-end justify-between gap-4 border-b pb-4">
                          <div className="space-y-1">
                            <span className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
                              Explorează categoria
                            </span>
                            <div className="font-display text-foreground text-xl font-bold tracking-tight">
                              {displayName}
                            </div>
                          </div>
                          <Link
                            href={`/categories/${category.handle}`}
                            className="text-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                          >
                            Vezi tot
                            <ArrowRight className="size-4" />
                          </Link>
                        </div>
                        <div className={cn("grid", gridColumnsClass)}>
                          {childCategories.map((child) => (
                            <ColumnItem key={child.handle} node={child} />
                          ))}
                        </div>
                      </div>
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
        <NavigationMenuItem>
          <NavigationMenuTrigger className={itemClassName}>
            Toate categoriile
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="border-border/80 bg-background w-[min(900px,calc(100vw-96px))] overflow-hidden rounded-[22px] border p-6 shadow-[0_26px_80px_rgba(0,0,0,0.18)]">
              <div className="border-border/70 flex items-end justify-between gap-4 border-b pb-4">
                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
                    Catalog DYLLU
                  </span>
                  <div className="font-display text-foreground text-xl font-bold tracking-tight">
                    Toate categoriile
                  </div>
                </div>
                <Link
                  href="/store"
                  className="text-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                >
                  Toate produsele
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 pt-4">
                {allCategories.map((category) => (
                  <NavigationMenuLink key={category.handle} asChild>
                    <Link
                      href={`/categories/${category.handle}`}
                      className="group text-foreground hover:bg-muted/80 flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm leading-snug font-medium transition-colors"
                    >
                      <span>{getCategoryNavLabel(category)}</span>
                      <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </NavigationMenuLink>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {includeSaleLink ? (
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href="/store?on_sale=true"
                className={cn(
                  itemClassName,
                  "text-red-300 hover:text-red-200 focus:text-red-200"
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
