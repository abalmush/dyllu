"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
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
import {
  getCategoryNavLabel,
  orderChildCategoriesForNavigation,
  orderCategoriesForNavigation,
} from "@lib/data/category-navigation";

export interface MobileNavProps {
  categories: CategoryNode[];
}

export function MobileNav({ categories }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  const navigationCategories = orderCategoriesForNavigation(categories);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          label="Deschide meniul"
          variant="ghost"
          size="md"
          className="min-[1120px]:hidden"
        >
          <Menu className="size-5" />
        </IconButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col gap-0 p-0"
      >
        <SheetHeader className="border-border flex flex-row items-center justify-between gap-2 border-b px-6 py-6">
          <Logo className="h-7" />
          <SheetTitle className="sr-only">Navigare</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
          <nav className="flex-1 overflow-y-auto px-2 pb-6">
            <Link
              href="/store"
              onClick={close}
              className="bg-surface text-foreground hover:bg-surface-strong mx-2 mt-4 flex items-center justify-between rounded-lg px-4 py-4 text-sm font-semibold tracking-tight"
            >
              Toate produsele
              <ChevronDown className="text-muted-foreground size-4 -rotate-90" />
            </Link>
            <Accordion type="multiple" className="px-2">
              {navigationCategories.map((category) => {
                const displayName = getCategoryNavLabel(category);
                const childCategories =
                  orderChildCategoriesForNavigation(category);

                return (
                  <AccordionItem
                    key={category.handle}
                    value={category.handle}
                    className="border-border/60 border-b last:border-b-0"
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
                        {displayName}
                      </Link>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-0.5 pl-4">
                      <Link
                        href={`/categories/${category.handle}`}
                        onClick={close}
                        className="text-primary hover:bg-muted block rounded-md px-4 py-2 text-sm font-medium"
                      >
                        Vezi tot {displayName}
                      </Link>
                      {childCategories.map((child) => (
                        <div key={child.handle} className="space-y-0.5">
                          <Link
                            href={`/categories/${child.handle}`}
                            onClick={close}
                            className="text-foreground hover:bg-muted block rounded-md px-4 py-2 text-sm"
                          >
                            {child.name}
                          </Link>
                          {child.children.length > 0 && (
                            <ul className="border-border ml-4 space-y-0.5 border-l pl-4">
                              {child.children.map((grand) => (
                                <li key={grand.handle}>
                                  <Link
                                    href={`/categories/${grand.handle}`}
                                    onClick={close}
                                    className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-4 py-2 text-xs"
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
                );
              })}
            </Accordion>
          </nav>
          <div className="border-border bg-surface-subtle border-t px-6 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/account"
                onClick={close}
                className={cn(
                  "border-border bg-background hover:bg-muted flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium"
                )}
              >
                <User className="size-4" /> Cont
              </Link>
            </div>
            <a
              href={SITE_CONTACT.phoneHref}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
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
