import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { type CategoryNode } from "@lib/data/categories";

const STORIES = [
  {
    categoryHandle: "scule-electrice",
    href: "/categories/scule-electrice",
    eyebrow: "Atelier de lemn",
    title: "Precizie de la prima tăiere",
    description:
      "Descoperă sculele electrice și accesoriile pentru debitare, ajustare și finisare.",
    image: "/images/home/story-woodworking.webp",
  },
  {
    href: "/c/service-auto",
    eyebrow: "Service auto",
    title: "Unelte pregătite pentru intervenții zilnice",
    description:
      "Explorează soluțiile DYLLU pentru întreținere, reparații și organizarea service-ului.",
    image: "/images/home/story-auto-service.webp",
  },
] as const;

const flattenCategories = (categories: CategoryNode[]): CategoryNode[] =>
  categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children),
  ]);

export function ShopStories({ categories }: { categories: CategoryNode[] }) {
  const visibleHandles = new Set(
    flattenCategories(categories).map((category) => category.handle)
  );
  const stories = STORIES.filter((story) =>
    "categoryHandle" in story
      ? visibleHandles.has(story.categoryHandle)
      : true
  );

  if (stories.length === 0) return null;

  return (
    <section className="bg-foreground text-background small:py-24 py-16">
      <Container>
        <header className="mb-10 flex max-w-3xl flex-col gap-4">
          <Eyebrow icon={<Wrench className="size-3.5" />}>
            Alege după lucrare
          </Eyebrow>
          <h2 className="font-display text-display-sm text-background small:text-display-md font-extrabold tracking-tight">
            Unelte pentru atelier, șantier și service.
          </h2>
          <p className="text-background/65 small:text-base max-w-2xl text-sm leading-relaxed">
            Pornește de la proiectul tău și găsește mai repede gama potrivită.
          </p>
        </header>

        <div className="medium:grid-cols-2 grid gap-5">
          {stories.map((story) => (
            <Link
              key={story.href}
              href={story.href}
              className="clip-corner-cut-lg group relative min-h-[420px] overflow-hidden"
            >
              <Image
                src={story.image}
                alt={story.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span
                aria-hidden
                className="from-foreground via-foreground/35 absolute inset-0 bg-linear-to-t to-transparent"
              />
              <span className="small:p-9 absolute inset-x-0 bottom-0 flex flex-col gap-3 p-7">
                <span className="text-2xs text-primary font-semibold tracking-[0.18em] uppercase">
                  {story.eyebrow}
                </span>
                <span className="font-display small:text-3xl max-w-lg text-2xl leading-tight font-bold tracking-tight">
                  {story.title}
                </span>
                <span className="text-background/75 max-w-lg text-sm leading-relaxed">
                  {story.description}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                  Vezi selecția
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
