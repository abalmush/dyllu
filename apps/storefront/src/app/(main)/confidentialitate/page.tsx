import { Metadata } from "next";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import { INFO_PAGES } from "@lib/site-content";

const page = INFO_PAGES.confidentialitate;

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description: page.description,
};

export default function PrivacyPage() {
  return <InfoPageTemplate page={page} />;
}
