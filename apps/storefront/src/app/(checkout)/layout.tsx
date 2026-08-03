import Link from "next/link";
import { ChevronDown, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/atoms/logo";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background relative min-h-screen w-full">
      <header className="border-border bg-background border-b">
        <nav className="content-container flex h-16 items-center justify-between gap-4">
          <Link
            href="/cart"
            data-testid="back-to-cart-link"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ChevronDown className="size-4 rotate-90" />
            <span className="small:inline hidden">Înapoi la coș</span>
            <span className="small:hidden inline">Înapoi</span>
          </Link>
          <Link
            href="/"
            data-testid="store-link"
            aria-label="Pagina principală DYLLU"
            className="flex items-center"
          >
            <Logo className="h-7" />
          </Link>
          <div className="text-muted-foreground flex flex-1 basis-0 items-center justify-end gap-2 text-sm">
            <ShieldCheck aria-hidden="true" className="text-success size-5" />
            <span className="small:inline hidden">
              Confirmare și verificare înainte de procesare
            </span>
          </div>
        </nav>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="relative outline-hidden"
        data-testid="checkout-container"
      >
        {children}
      </main>
      <footer className="border-border bg-surface-subtle border-t">
        <div className="content-container text-muted-foreground flex min-h-14 items-center justify-center py-4 text-center text-sm">
          © {new Date().getFullYear()} DYLLU · Comenzile sunt validate înainte
          de procesare
        </div>
      </footer>
    </div>
  );
}
