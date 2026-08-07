"use client";

import { HttpTypes } from "@medusajs/types";
import { FileText, Hammer, Truck, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import {
  getVariantDescription,
  getVariantSpecifications,
} from "@modules/products/lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
};

export default function ProductTabs({ product, variant }: Props) {
  const t = useTranslations("ProductTabs");
  // Prefer the catalog's structured specs (published into metadata.specs); fall
  // back to Medusa's native attribute fields when absent.
  const metadataSpecs = getVariantSpecifications(product, variant);
  const description = getVariantDescription(product, variant);
  const specs =
    metadataSpecs.length > 0
      ? metadataSpecs
      : [
          { label: t("specLabelMaterial"), value: product.material || "—" },
          {
            label: t("specLabelOrigin"),
            value: product.origin_country || "—",
          },
          { label: t("specLabelType"), value: product.type?.value || "—" },
          {
            label: t("specLabelWeight"),
            value: product.weight ? `${product.weight} g` : "—",
          },
          {
            label: t("specLabelDimensions"),
            value:
              product.length && product.width && product.height
                ? `${product.length}L × ${product.width}W × ${product.height}H`
                : "—",
          },
        ];

  return (
    <section aria-labelledby="product-details-heading">
      <h2 id="product-details-heading" className="sr-only">
        {t("srHeading")}
      </h2>
      <Accordion type="multiple" defaultValue={["specs"]} className="w-full">
        <AccordionItem value="specs">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Hammer aria-hidden="true" className="text-brand-800 size-5" />{" "}
              {t("specsTab")}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="small:grid-cols-2 grid grid-cols-1 gap-4 text-sm">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="bg-surface-subtle flex flex-col gap-0.5 rounded-lg px-4 py-2"
                >
                  <dt className="text-2xs text-muted-foreground font-semibold tracking-wider uppercase">
                    {s.label}
                  </dt>
                  <dd className="text-foreground font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>

        {description ? (
          <AccordionItem value="description">
            <AccordionTrigger className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <FileText
                  aria-hidden="true"
                  className="text-brand-800 size-5"
                />{" "}
                {t("descriptionTab")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p
                className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
                data-testid="product-description"
              >
                {description}
              </p>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="shipping">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Truck aria-hidden="true" className="text-brand-800 size-5" />{" "}
              {t("shippingTab")}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("shippingText")}
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="returns">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Undo2 aria-hidden="true" className="text-brand-800 size-5" />{" "}
              {t("returnsTab")}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("returnsText")}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
