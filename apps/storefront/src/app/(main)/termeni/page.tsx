import { Metadata } from "next";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import { INFO_PAGES } from "@lib/site-content";

const page = INFO_PAGES.termeni;

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: page.description,
};

export default function TermsPage() {
  return <InfoPageTemplate page={page} />;
}
