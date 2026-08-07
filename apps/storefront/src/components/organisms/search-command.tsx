"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  History,
  Layers,
  Search,
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
import { type CategoryNode } from "@lib/data/categories";

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
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [liveHits, setLiveHits] = React.useState<LiveHit[]>([]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveHits([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { hits: LiveHit[] }) => setLiveHits(data.hits))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

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
                >
                  {hit.thumbnail ? (
                    <Image
                      src={hit.thumbnail}
                      alt=""
                      width={64}
                      height={64}
                      className="bg-muted size-16 shrink-0 rounded-md object-contain"
                    />
                  ) : (
                    <span className="bg-muted flex size-16 shrink-0 items-center justify-center rounded-md">
                      <Search className="text-muted-foreground size-6" />
                    </span>
                  )}
                  <span className="flex-1">{hit.title}</span>
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
