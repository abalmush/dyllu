import * as React from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { Button } from "@/components/atoms/button";

type Props = {
  icon: LucideIcon;
  title: string;
  message: string;
  cta?: { label: string; href: string };
};

export function EmptyState({ icon: Icon, title, message, cta }: Props) {
  return (
    <div className="clip-corner-cut-lg flex flex-col items-center gap-4 bg-card px-6 py-16 text-center ring-1 ring-border">
      <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h3 className="font-display text-xl font-bold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {cta && (
        <Button asChild size="lg" className="clip-corner-cut-sm rounded-none">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
