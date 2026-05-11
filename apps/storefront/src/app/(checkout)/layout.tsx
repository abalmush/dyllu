import Link from "next/link";
import { ChevronDown, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/atoms/logo";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-background">
      <header className="border-b border-border bg-background">
        <nav className="content-container flex h-16 items-center justify-between gap-4">
          <Link
            href="/cart"
            data-testid="back-to-cart-link"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className="size-4 rotate-90" />
            <span className="hidden small:inline">Înapoi la coș</span>
            <span className="inline small:hidden">Înapoi</span>
          </Link>
          <Link
            href="/"
            data-testid="store-link"
            aria-label="DYLLU homepage"
            className="flex items-center"
          >
            <Logo className="h-7" />
          </Link>
          <div className="flex flex-1 basis-0 items-center justify-end gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" />
            <span className="hidden small:inline">Plată securizată MAIB</span>
          </div>
        </nav>
      </header>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
      <footer className="border-t border-border bg-surface-subtle">
        <div className="content-container flex h-14 items-center justify-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} DYLLU · Plăți procesate securizat prin MAIB
        </div>
      </footer>
    </div>
  );
}
