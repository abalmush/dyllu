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
        "small:py-20 py-16",
        background === "subtle" && "bg-surface-subtle/60",
        className
      )}
    >
      <Container>
        <div className="small:flex-row small:items-end flex flex-col items-start justify-between gap-6">
          <div>
            {eyebrow && <Eyebrow variant="dark">{eyebrow}</Eyebrow>}
            <h2 className="font-display text-foreground small:text-display-sm mt-4 text-2xl font-extrabold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-xl text-sm">
                {description}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              {viewAllLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        <div className="mt-12">{children}</div>
      </Container>
    </section>
  );
}
