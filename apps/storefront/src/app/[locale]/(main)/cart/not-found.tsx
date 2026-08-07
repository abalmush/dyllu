import { Metadata } from "next";

import InteractiveLink from "@modules/common/components/interactive-link";

export const metadata: Metadata = {
  title: "404",
  description: "Coșul nu a putut fi găsit.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center">
      <h1 className="text-2xl-semi text-ui-fg-base">Coșul nu a fost găsit</h1>
      <p className="text-small-regular text-ui-fg-base">
        Coșul pe care ai încercat să îl accesezi nu există. Șterge cookie-urile
        și încearcă din nou.
      </p>
      <InteractiveLink href="/">Înapoi la pagina principală</InteractiveLink>
    </div>
  );
}
