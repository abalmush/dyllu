import { ArrowRight, Home, Search } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/atoms/button";

export const metadata: Metadata = {
  title: "Pagina nu a fost găsită",
  description: "Pagina pe care încerci să o accesezi nu există.",
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-6 px-6 text-center outline-hidden"
    >
      <span className="bg-primary/15 text-brand-900 rounded-full px-4 py-1 text-sm font-semibold tracking-wide">
        Eroare 404
      </span>
      <h1 className="font-display text-display-md text-foreground sm:text-display-lg font-extrabold tracking-tight">
        Pagina nu a fost
        <span className="text-brand-800 block">găsită.</span>
      </h1>
      <p className="text-muted-foreground max-w-md text-sm sm:text-base">
        Linkul pe care l-ai accesat nu există sau a fost mutat. Întoarce-te la
        pagina principală sau caută produsul direct.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">
            <Home className="size-4" />
            Înapoi acasă
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href="/store">
            <Search className="size-4" />
            Vezi toate produsele
          </Link>
        </Button>
      </div>
    </main>
  );
}
