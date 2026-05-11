import { VariantPrice } from "types/global";

import { PriceBlock } from "@/components/molecules/price-block";

export default function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) return null;
  return <PriceBlock price={price} size="md" />;
}
