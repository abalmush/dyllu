import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";

export interface BannerCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel: string;
  href: string;
  variant?: "primary" | "dark" | "muted" | "image";
  imageUrl?: string;
  className?: string;
  align?: "left" | "center";
  headingLevel?: "h1" | "h2" | "h3";
  imagePriority?: boolean;
}

const variantMap = {
  primary: "bg-primary text-primary-foreground",
  dark: "bg-secondary text-secondary-foreground",
  muted: "bg-surface text-foreground",
  image: "bg-secondary text-secondary-foreground",
};

const ctaMap = {
  primary: "bg-foreground text-background hover:bg-foreground/90",
  dark: "bg-primary text-primary-foreground hover:bg-primary/90",
  muted: "bg-foreground text-background hover:bg-foreground/90",
  image: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export function BannerCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  href,
  variant = "primary",
  imageUrl,
  className,
  align = "left",
  headingLevel = "h3",
  imagePriority = false,
}: BannerCardProps) {
  const HeadingTag = headingLevel;

  return (
    <Link
      href={href}
      className={cn(
        "clip-corner-cut-lg group small:min-h-[280px] relative flex min-h-[260px] overflow-hidden border border-transparent transition-all duration-300 hover:-translate-y-0.5",
        variantMap[variant],
        className
      )}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority={imagePriority}
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover object-center opacity-75 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
      {imageUrl && (
        <span
          aria-hidden
          className="from-foreground/80 via-foreground/40 to-foreground/10 absolute inset-0 bg-linear-to-r"
        />
      )}
      <div
        className={cn(
          "small:p-10 small:pb-16 medium:p-12 medium:pb-16 relative z-1 flex w-full flex-col justify-between gap-6 p-8 pb-16",
          align === "center" && "items-center text-center"
        )}
      >
        <div className="flex max-w-md flex-col gap-4">
          {eyebrow && (
            <span className="text-2xs font-semibold tracking-[0.18em] uppercase opacity-80">
              {eyebrow}
            </span>
          )}
          <HeadingTag className="font-display text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {title}
          </HeadingTag>
          {description && (
            <p className="text-sm/relaxed opacity-80">{description}</p>
          )}
        </div>
        <span
          className={cn(
            "clip-corner-cut-sm mt-2 inline-flex shrink-0 items-center gap-2 self-start px-6 py-2.5 text-sm font-semibold transition-colors",
            ctaMap[variant]
          )}
        >
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
