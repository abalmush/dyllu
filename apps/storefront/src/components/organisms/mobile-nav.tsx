"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Menu, Phone, User } from "lucide-react";

import { SITE_CONTACT } from "@lib/site-content";
import { cn } from "@lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { IconButton } from "@/components/atoms/icon-button";
import { Logo } from "@/components/atoms/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import { type CategoryNode } from "@lib/data/categories";

export interface MobileNavProps {
  categories: CategoryNode[];
}

export function MobileNav({ categories }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          label="Deschide meniul"
          variant="ghost"
          size="md"
          className="medium:hidden"
        >
          <Menu className="size-5" />
        </IconButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col gap-0 p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-6 py-5">
          <Logo className="h-7" />
          <SheetTitle className="sr-only">Navigare</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
          <nav className="flex-1 overflow-y-auto px-2 pb-6">
            <Link
              href="/store"
              onClick={close}
              className="mx-2 mt-3 flex items-center justify-between rounded-lg bg-surface px-4 py-3 text-sm font-semibold tracking-tight text-foreground hover:bg-surface-strong"
            >
              Toate produsele
              <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
            </Link>
            <Accordion type="multiple" className="px-2">
              {categories.map((category) => (
                <AccordionItem
                  key={category.handle}
                  value={category.handle}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <AccordionTrigger className="text-sm font-semibold tracking-tight">
                    <Link
                      href={`/categories/${category.handle}`}
                      onClick={(e) => {
                        if (category.children.length === 0) {
                          close();
                        } else {
                          e.preventDefault();
                        }
                      }}
                      className="flex-1 text-left"
                    >
                      {category.name}
                    </Link>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-0.5 pl-3">
                    <Link
                      href={`/categories/${category.handle}`}
                      onClick={close}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
                    >
                      Vezi tot {category.name}
                    </Link>
                    {category.children.map((child) => (
                      <div key={child.handle} className="space-y-0.5">
                        <Link
                          href={`/categories/${child.handle}`}
                          onClick={close}
                          className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          {child.name}
                        </Link>
                        {child.children.length > 0 && (
                          <ul className="ml-3 space-y-0.5 border-l border-border pl-3">
                            {child.children.map((grand) => (
                              <li key={grand.handle}>
                                <Link
                                  href={`/categories/${grand.handle}`}
                                  onClick={close}
                                  className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  {grand.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
          <div className="border-t border-border bg-surface-subtle px-6 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/account"
                onClick={close}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted"
                )}
              >
                <User className="size-4" /> Cont
              </Link>
            </div>
            <a
              href={SITE_CONTACT.phoneHref}
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Phone className="size-4" />
              {SITE_CONTACT.phoneDisplay}
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
