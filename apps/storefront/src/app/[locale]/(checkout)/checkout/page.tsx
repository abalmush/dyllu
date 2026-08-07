import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import { hasCheckoutAmountDue } from "@lib/checkout/state";
import CheckoutSubmission from "@modules/checkout/components/checkout-submission";
import CheckoutForm from "@modules/checkout/templates/checkout-form";
import CheckoutSummary from "@modules/checkout/templates/checkout-summary";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout.page");
  return {
    title: t("title"),
  };
}

export default async function Checkout() {
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ]);

  if (!cart?.items?.length) {
    redirect({ href: "/cart", locale: await getLocale() });
    return;
  }

  const t = await getTranslations("Checkout.page");

  return (
    <div className="bg-surface-subtle">
      <Container className="small:py-12 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: t("breadcrumbHome"), href: "/" },
              { label: t("breadcrumbCart"), href: "/cart" },
              { label: t("breadcrumbCurrent") },
            ]}
          />
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="font-display text-display-sm text-foreground small:text-display-md font-extrabold tracking-tight text-balance">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t("description")}
          </p>
        </div>

        <CheckoutSubmission
          hasAmountDue={hasCheckoutAmountDue(cart)}
          details={<CheckoutForm cart={cart} customer={customer} />}
          summary={
            <CheckoutSummary
              cart={
                cart as typeof cart & {
                  promotions: import("@medusajs/types").HttpTypes.StorePromotion[];
                }
              }
            />
          }
        />
      </Container>
    </div>
  );
}
