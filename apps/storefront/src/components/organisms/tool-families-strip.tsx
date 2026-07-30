import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { type CategoryNode } from "@lib/data/categories";

const getRepresentativeImage = (category: CategoryNode): string | undefined =>
  category.navThumbnailUrl ??
  category.children
    .map(getRepresentativeImage)
    .find((image): image is string => Boolean(image));

export function ToolFamiliesStrip({
  categories = [],
}: {
  categories?: CategoryNode[];
}) {
  const families = categories.slice(0, 6);
  if (families.length === 0) return null;

  return (
    <section className="border-border bg-background small:py-16 border-y py-12">
      <Container>
        <header className="mb-8 flex flex-col items-start gap-4">
          <Eyebrow>Tot ce produce DYLLU</Eyebrow>
          <h2 className="font-display text-foreground small:text-3xl text-2xl font-bold tracking-tight">
            Alege după tipul sculei.
          </h2>
        </header>
        <ul className="small:grid-cols-6 small:gap-4 grid grid-cols-2 gap-3">
          {families.map((family) => {
            const image = getRepresentativeImage(family);

            return (
              <li key={family.handle}>
                <Link
                  href={`/categories/${family.handle}`}
                  className="clip-corner-cut-md group bg-foreground flex h-full min-h-52 flex-col items-center justify-end overflow-hidden p-5 text-center"
                >
                  {image && (
                    <span className="relative mb-2 block h-28 w-full">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(max-width: 767px) 50vw, 16vw"
                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </span>
                  )}
                  <span className="text-background relative z-10 text-sm font-semibold tracking-tight">
                    {family.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
