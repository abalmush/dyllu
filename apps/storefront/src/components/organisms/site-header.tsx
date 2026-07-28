"use client";

import * as React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";

import { cn } from "@lib/utils";
import { useShowcasePinned } from "@lib/stores/showcase-pinned";
import { Logo } from "@/components/atoms/logo";
import { IconButton } from "@/components/atoms/icon-button";
import { NavigationProgress } from "@/components/atoms/navigation-progress";
import { CartDrawer } from "@/components/organisms/cart-drawer";
import { MegaMenu } from "@/components/organisms/mega-menu";
import { MobileNav } from "@/components/organisms/mobile-nav";
import { SearchCommand } from "@/components/organisms/search-command";
import { type CategoryNode } from "@lib/data/categories";
import { HttpTypes } from "@medusajs/types";

export interface SiteHeaderProps {
  cart: HttpTypes.StoreCart | null;
  categories: CategoryNode[];
}

export function SiteHeader({ cart, categories }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const showcasePinned = useShowcasePinned((state) => state.pinnedCount > 0);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={cn(
        "text-background sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow,transform,opacity] duration-300",
        scrolled
          ? "border-background/10 bg-foreground/85 shadow-xs backdrop-blur-md"
          : "bg-foreground border-transparent",
        showcasePinned &&
          "medium:pointer-events-none medium:-translate-y-full medium:opacity-0"
      )}
    >
      <div className="content-container small:h-20 small:gap-6 flex h-16 items-center gap-4">
        <div className="flex shrink-0 items-center gap-1">
          <MobileNav categories={categories} />
          <Link
            href="/"
            aria-label="Pagina principală DYLLU"
            className="text-background flex items-center"
          >
            <Logo className="small:h-8 h-7" />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center min-[1120px]:flex">
          <MegaMenu categories={categories} includeSaleLink />
        </div>

        <div className="small:gap-2 ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="border-background/15 bg-background/5 text-background/70 hover:border-background/30 hover:bg-background/10 xlarge:flex xlarge:w-64 2xlarge:w-72 hidden h-10 items-center gap-2 rounded-full border px-4 text-left text-sm transition-colors"
          >
            <Search
              aria-hidden="true"
              className="text-background/75 size-4 shrink-0"
            />
            <span className="flex-1 truncate">Caută scule, accesorii…</span>
            <kbd className="border-background/20 bg-background/5 text-2xs text-background/70 2xlarge:inline-flex hidden shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono font-semibold">
              ⌘K
            </kbd>
          </button>
          <IconButton
            label="Caută"
            variant="ghost"
            onClick={() => setSearchOpen(true)}
            className="text-background hover:bg-background/10 xlarge:hidden"
          >
            <Search className="size-5" />
          </IconButton>
          <Link
            href="/account"
            aria-label="Contul tău"
            className="text-background hover:bg-background/10 hidden size-11 place-items-center rounded-full transition-colors min-[1120px]:grid"
          >
            <User aria-hidden="true" className="size-5" />
          </Link>
          <CartDrawer cart={cart} />
        </div>
      </div>
      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        categories={categories}
      />
      <React.Suspense fallback={null}>
        <NavigationProgress />
      </React.Suspense>
    </header>
  );
}
