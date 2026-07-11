import { Metadata } from "next";

import { InfoPageTemplate } from "@/components/templates/info-page-template";
import { INFO_PAGES } from "@lib/site-content";

const page = INFO_PAGES.returnari;

export const metadata: Metadata = {
  title: "Returnări și garanție",
  description: page.description,
};

export default function ReturnsPage() {
  return <InfoPageTemplate page={page} />;
}
