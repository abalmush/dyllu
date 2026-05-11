import Link from "next/link";
import { ArrowRight, UserCircle2 } from "lucide-react";

import { Button } from "@/components/atoms/button";

export default function SignInPrompt() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-border bg-surface-subtle/60 p-5 small:flex-row small:items-center">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <UserCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ai deja un cont DYLLU?
          </p>
          <p className="text-xs text-muted-foreground">
            Conectează-te pentru livrare mai rapidă și istoricul comenzilor.
          </p>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="rounded-full"
        data-testid="sign-in-button"
      >
        <Link href="/account">
          Autentificare
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
