import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { PlpProductCard } from "@/components/organisms/plp-product-card";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { toPlpProduct } from "@modules/store/lib/to-plp-product";

const EmptyCartMessage = async () => {
  const region = await getRegion();
  const recommended = region
    ? await listProducts({
        pageParam: 1,
        queryParams: { limit: 4 },
      }).catch(() => null)
    : null;

  return (
    <div className="flex flex-col gap-12" data-testid="empty-cart-message">
      <div className="flex flex-col items-start justify-center gap-5 px-2 pt-16 small:pt-24">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ShoppingBag className="size-5" />
        </span>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-foreground sm:text-display-md">
          Coșul tău este gol.
        </h1>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          Descoperă scule manuale, electrice și echipamente de protecție
          profesionale. Am pregătit selecții pentru orice atelier.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/store">
              Explorează produsele
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/categories/scule-manuale">Scule manuale</Link>
          </Button>
        </div>
      </div>

      {region && recommended?.response.products.length ? (
        <section className="space-y-6 pb-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight small:text-2xl">
                Recomandări pentru tine
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecția noastră de produse populare săptămâna aceasta.
              </p>
            </div>
            <Link
              href="/store"
              className="hidden text-sm font-semibold text-primary hover:underline small:inline"
            >
              Vezi toate produsele →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 small:grid-cols-3 medium:grid-cols-4">
            {recommended.response.products.slice(0, 4).map((p) => (
              <li key={p.id}>
                <PlpProductCard product={toPlpProduct(p)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default EmptyCartMessage;
