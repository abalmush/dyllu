import { Metadata } from "next";

import { HomeTemplate } from "@/components/templates/home-template";

export const metadata: Metadata = {
  title: "DYLLU — Scule și echipamente profesionale",
  description:
    "Scule manuale, electrice, echipamente de protecție și grădinărit pentru profesioniști și pasionați. Livrare rapidă în Moldova.",
};

export default function Home() {
  return <HomeTemplate />;
}
