import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";

export interface ProductRailSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  background?: "default" | "subtle";
  children: React.ReactNode;
  className?: string;
}

export function ProductRailSection({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel = "Vezi toate",
  background = "default",
  children,
  className,
}: ProductRailSectionProps) {
  return (
    <section
      className={cn(
        "py-14 small:py-20",
        background === "subtle" && "bg-surface-subtle/60",
        className
      )}
    >
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 small:flex-row small:items-end">
          <div>
            {eyebrow && <Eyebrow variant="dark">{eyebrow}</Eyebrow>}
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground small:text-display-sm">
              {title}
            </h2>
            {description && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {viewAllLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        <div className="mt-10">{children}</div>
      </Container>
    </section>
  );
}
