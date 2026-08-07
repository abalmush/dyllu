import { Button, Container, Text } from "@lib/ui-compat";
import { cookies as nextCookies } from "next/headers";
import { getTranslations } from "next-intl/server";

async function ProductOnboardingCta() {
  if (process.env.NODE_ENV === "production") return null;

  const cookies = await nextCookies();

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true";

  if (!isOnboarding) {
    return null;
  }

  const t = await getTranslations("ProductOnboardingCta");

  return (
    <Container className="bg-ui-bg-subtle h-full w-full max-w-4xl p-8">
      <div className="center flex flex-col gap-y-4">
        <Text className="text-ui-fg-base text-xl">{t("successMessage")}</Text>
        <Text className="text-small-regular text-ui-fg-subtle">
          {t("continueMessage")}
        </Text>
        <a href="http://localhost:9000/backend/orders?onboarding_step=create_order_nextjs">
          <Button className="w-full">{t("continueCta")}</Button>
        </a>
      </div>
    </Container>
  );
}

export default ProductOnboardingCta;
