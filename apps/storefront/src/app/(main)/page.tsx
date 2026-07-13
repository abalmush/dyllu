import type { Metadata } from "next";

import { HomeTemplate } from "@/components/templates/home-template";
import { PromoBanner } from "@/components/organisms/promo-banner";
import {
  buildSocialMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
} from "@/lib/seo/metadata";

export const metadata: Metadata = buildSocialMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
  imageAlt: "Scule și echipamente profesionale DYLLU",
});

export default function Home() {
  return (
    <>
      <HomeTemplate />
      <PromoBanner />
    </>
  );
}
