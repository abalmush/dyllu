import { Metadata } from "next";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import { INFO_PAGES } from "@lib/site-content";

const page = INFO_PAGES.branduri;

export const metadata: Metadata = {
  title: "Branduri și ghiduri",
  description: page.description,
};

export default function BrandsPage() {
  return <InfoPageTemplate page={page} />;
}
