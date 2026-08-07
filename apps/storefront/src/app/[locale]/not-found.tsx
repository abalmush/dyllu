import { ArrowRight, Home, Search } from "lucide-react";
import { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/atoms/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-6 px-6 text-center outline-hidden"
    >
      <span className="bg-primary/15 text-brand-900 rounded-full px-4 py-1 text-sm font-semibold tracking-wide">
        {t("badge")}
      </span>
      <h1 className="font-display text-display-md text-foreground sm:text-display-lg font-extrabold tracking-tight">
        {t("title")}
        <span className="text-brand-800 block">{t("titleHighlight")}</span>
      </h1>
      <p className="text-muted-foreground max-w-md text-sm sm:text-base">
        {t("body")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">
            <Home className="size-4" />
            {t("home")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href="/store">
            <Search className="size-4" />
            {t("browse")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
