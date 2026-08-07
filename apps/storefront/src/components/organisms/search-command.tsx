"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  Check,
  History,
  Layers,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/atoms/command";
import { useCart } from "@lib/cart/cart-context";
import { type CategoryNode } from "@lib/data/categories";
import { convertToLocale } from "@lib/util/money";
import { toMedusaLocale } from "@/i18n/medusa-locale";

const QUICK_LINKS = [
  { label: "Produse noi", icon: Sparkles, href: "/store?sortBy=created_at" },
  { label: "Reduceri active", icon: Tag, href: "/store?on_sale=true" },
  { label: "Toate categoriile", icon: Layers, href: "/store" },
];

const POPULAR = [
  "Burghie SDS+",
  "Mănuși de protecție",
  "Ciocan rotopercutor",
  "Șurubelnițe",
  "Discuri pe metal",
  "Chei tubulare",
];

const RECENT_KEY = "dyllu_recent_search";

type LiveHit = {
  objectID: string;
  title: string;
  thumbnail: string | null;
  handle: string;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
  variant_id: string | null;
  variant_title: string | null;
};

export interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryNode[];
}

export function SearchCommand({
  open,
  onOpenChange,
  categories,
}: SearchCommandProps) {
  const router = useRouter();
  const medusaLocale = toMedusaLocale(useLocale());
  const { addItem } = useCart();
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [liveHits, setLiveHits] = React.useState<LiveHit[]>([]);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addedId, setAddedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveHits([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&locale=${encodeURIComponent(medusaLocale)}`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data: { hits: LiveHit[] }) => setLiveHits(data.hits))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, medusaLocale]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      setRecent([]);
    }
  }, [open]);

  const persistRecent = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    }
  };

  const go = (href: string, term?: string) => {
    if (term) persistRecent(term);
    onOpenChange(false);
    router.push(href);
  };

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    go(`/store?q=${encodeURIComponent(query.trim())}`, query.trim());
  };

  const handleAddToCart = async (hit: LiveHit) => {
    if (!hit.variant_id || addingId) return;
    setAddingId(hit.objectID);
    try {
      await addItem(
        { variantId: hit.variant_id, quantity: 1 },
        {
          variantId: hit.variant_id,
          productHandle: hit.handle,
          title: hit.title,
          variantTitle: hit.variant_title ?? undefined,
          thumbnail: hit.thumbnail ?? undefined,
          quantity: 1,
          unitPrice: hit.price ?? 0,
          currencyCode: "mdl",
        }
      );
      setAddedId(hit.objectID);
      window.setTimeout(() => setAddedId(null), 2500);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Căutare DYLLU"
      description="Caută produse, categorii sau accesează rapid o pagină."
    >
      <CommandInput
        placeholder="Caută burghie, ciocane, accesorii…"
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleSubmit}
      />
      <CommandList>
        <CommandEmpty>
          Niciun rezultat. Apasă Enter ca să cauți „{query}”.
        </CommandEmpty>
        {liveHits.length > 0 && (
          <>
            <CommandGroup heading="Produse">
              {liveHits.map((hit) => (
                <CommandItem
                  key={hit.objectID}
                  value={hit.title}
                  onSelect={() => go(`/products/${hit.handle}`, query.trim())}
                  className="!py-1.5"
                >
                  <span className="bg-muted relative aspect-square size-20 shrink-0 overflow-hidden rounded-md">
                    {hit.thumbnail ? (
                      <Image
                        src={hit.thumbnail}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-muted-foreground absolute inset-0 grid place-items-center">
                        <Search className="size-6" />
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span>{hit.title}</span>
                    {hit.price !== null && (
                      <span className="flex items-center gap-2">
                        <span className="text-foreground font-semibold">
                          {convertToLocale({
                            amount: hit.price,
                            currency_code: "MDL",
                          })}
                        </span>
                        {hit.on_sale && hit.original_price !== null && (
                          <span className="text-muted-foreground line-through">
                            {convertToLocale({
                              amount: hit.original_price,
                              currency_code: "MDL",
                            })}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Adaugă ${hit.title} în coș`}
                    disabled={!hit.variant_id || addingId === hit.objectID}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAddToCart(hit);
                    }}
                    className="bg-foreground text-background hover:bg-foreground/90 ml-auto grid size-9 shrink-0 place-items-center self-center rounded-md transition-colors disabled:opacity-40"
                  >
                    {addedId === hit.objectID ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <ShoppingCart aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {recent.length > 0 && (
          <>
            <CommandGroup heading="Căutări recente">
              {recent.map((term) => (
                <CommandItem
                  key={term}
                  value={term}
                  onSelect={() =>
                    go(`/store?q=${encodeURIComponent(term)}`, term)
                  }
                >
                  <History className="text-muted-foreground size-4" />
                  <span>{term}</span>
                  <ArrowRight className="text-muted-foreground ml-auto size-3" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Acces rapid">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <CommandItem
                key={link.href}
                value={link.label}
                onSelect={() => go(link.href)}
              >
                <Icon className="text-primary size-4" />
                <span>{link.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Populare">
          {POPULAR.map((term) => (
            <CommandItem
              key={term}
              value={term}
              onSelect={() => go(`/store?q=${encodeURIComponent(term)}`, term)}
            >
              <Sparkles className="text-muted-foreground size-4" />
              <span>{term}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Categorii">
          {categories.map((c) => (
            <CommandItem
              key={c.handle}
              value={c.name}
              onSelect={() => go(`/categories/${c.handle}`)}
            >
              <Layers className="text-muted-foreground size-4" />
              <span>{c.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
