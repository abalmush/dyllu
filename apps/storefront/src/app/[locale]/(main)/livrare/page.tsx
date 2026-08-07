import { Metadata } from "next";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import { INFO_PAGES } from "@lib/site-content";

const page = INFO_PAGES.livrare;

export const metadata: Metadata = {
  title: "Livrare și plată",
  description: page.description,
};

export default function DeliveryPage() {
  return <InfoPageTemplate page={page} />;
}
