import { Link } from "@/i18n/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/atoms/button";
import { PlpProductCard } from "@/components/organisms/plp-product-card";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { toPlpProduct } from "@modules/store/lib/to-plp-product";

const EmptyCartMessage = async () => {
  const t = await getTranslations("Cart");
  const region = await getRegion();
  const recommended = region
    ? await listProducts({
        pageParam: 1,
        queryParams: { limit: 4 },
      }).catch(() => null)
    : null;

  return (
    <div className="flex flex-col gap-12" data-testid="empty-cart-message">
      <div className="small:pt-8 flex flex-col items-start justify-center gap-6 px-2 pt-4">
        <span className="bg-primary/15 text-brand-800 grid size-12 place-items-center rounded-full">
          <ShoppingBag aria-hidden="true" className="size-5" />
        </span>
        <h1 className="font-display text-display-sm text-foreground sm:text-display-md font-extrabold tracking-tight">
          {t("emptyTitle")}
        </h1>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          {t("emptyBody")}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/store">
              {t("emptyBrowse")}
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/categories/scule-de-mana">{t("emptyHandTools")}</Link>
          </Button>
        </div>
      </div>

      {region && recommended?.response.products.length ? (
        <section className="space-y-6 pb-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display small:text-2xl text-xl font-semibold tracking-tight">
                {t("emptyRecommendedTitle")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("emptyRecommendedSubtitle")}
              </p>
            </div>
            <Link
              href="/store"
              className="text-brand-800 small:inline hidden text-base font-semibold hover:underline"
            >
              {t("emptyRecommendedViewAll")}
            </Link>
          </div>
          <ul className="small:grid-cols-3 medium:grid-cols-4 grid grid-cols-2 gap-4">
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
