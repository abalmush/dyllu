"use client";

import * as React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";

import { cn } from "@lib/utils";
import { useShowcasePinned } from "@lib/stores/showcase-pinned";
import { Logo } from "@/components/atoms/logo";
import { IconButton } from "@/components/atoms/icon-button";
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
  const [primaryMenuOverlay, setPrimaryMenuOverlay] = React.useState(false);
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
        "sticky top-0 z-40 w-full border-b text-background transition-all duration-300",
        scrolled
          ? "border-background/10 bg-foreground/85 shadow-sm backdrop-blur-md"
          : "border-transparent bg-foreground",
        showcasePinned &&
          "medium:pointer-events-none medium:-translate-y-full medium:opacity-0"
      )}
    >
      <div className="content-container flex h-16 items-center gap-4 small:h-20 small:gap-6">
        <div className="flex shrink-0 items-center gap-1">
          <MobileNav categories={categories} />
          <Link
            href="/"
            aria-label="Pagina principală DYLLU"
            className="flex items-center text-background"
          >
            <Logo className="h-7 small:h-8" />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center medium:flex">
          <MegaMenu
            categories={categories}
            tier="primary"
            includeSaleLink
            onOverlayStateChange={setPrimaryMenuOverlay}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 small:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-full border border-background/15 bg-background/5 px-4 text-left text-sm text-background/70 transition-colors hover:border-background/30 hover:bg-background/10 xlarge:flex xlarge:w-64 2xlarge:w-72"
          >
            <Search className="size-4 shrink-0 text-background/60" />
            <span className="flex-1 truncate">Caută scule, accesorii…</span>
            <kbd className="hidden shrink-0 items-center gap-1 rounded border border-background/20 bg-background/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-background/70 2xlarge:inline-flex">
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
            className="hidden size-10 place-items-center rounded-full text-background transition-colors hover:bg-background/10 medium:grid"
          >
            <User className="size-5" />
          </Link>
          <CartDrawer cart={cart} />
        </div>
      </div>
      <div
        className={cn(
          "hidden border-t border-background/10 transition-opacity duration-150 medium:block",
          primaryMenuOverlay && "pointer-events-none opacity-0"
        )}
      >
        <div className="content-container flex min-h-12 items-center">
          <MegaMenu
            categories={categories}
            tier="secondary"
            includeSaleLink={false}
          />
        </div>
      </div>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
