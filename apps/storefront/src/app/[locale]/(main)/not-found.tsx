import { Metadata } from "next";

import InteractiveLink from "@modules/common/components/interactive-link";

export const metadata: Metadata = {
  title: "404",
  description: "Pagina căutată nu există.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl-semi text-ui-fg-base">Pagina nu a fost găsită</h1>
      <p className="text-small-regular text-ui-fg-base">
        Pagina pe care ai încercat să o accesezi nu există.
      </p>
      <InteractiveLink href="/">Înapoi la pagina principală</InteractiveLink>
    </div>
  );
}
