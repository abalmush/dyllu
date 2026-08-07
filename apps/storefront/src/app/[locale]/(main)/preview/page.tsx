import { Metadata } from "next";

import { PreviewTemplate } from "@/components/templates/preview-template";

export const metadata: Metadata = {
  title: "Previzualizare componente",
  description:
    "Pagină de previzualizare pentru componentele magazinului — variante experimentale și machete vechi.",
  robots: { index: false, follow: false },
};

export default function Preview() {
  return <PreviewTemplate />;
}
