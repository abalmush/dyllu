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
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Eroare 404
      </span>
      <h1 className="font-display text-display-md font-extrabold tracking-tight text-foreground sm:text-display-lg">
        Pagina nu a fost
        <span className="block text-primary">găsită.</span>
      </h1>
      <p className="max-w-md text-sm text-muted-foreground sm:text-base">
        Linkul pe care l-ai accesat nu există sau a fost mutat. Întoarce-te la
        pagina principală sau caută produsul direct.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
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
    </div>
  );
}
