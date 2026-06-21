import { Metadata } from "next";

import { PreviewTemplate } from "@/components/templates/preview-template";

export const metadata: Metadata = {
  title: "DYLLU — Preview componente",
  description:
    "Pagină de preview pentru componente storefront — variante experimentale și layout-uri vechi.",
  robots: { index: false, follow: false },
};

export default function Preview() {
  return <PreviewTemplate />;
}
