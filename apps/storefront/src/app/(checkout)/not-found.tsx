import InteractiveLink from "@modules/common/components/interactive-link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404",
  description: "Pagina de checkout nu există.",
};

export default async function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl-semi text-ui-fg-base">Pagina nu a fost găsită</h1>
      <p className="text-small-regular text-ui-fg-base">
        Pasul de checkout pe care ai încercat să îl accesezi nu există.
      </p>
      <InteractiveLink href="/">Înapoi la pagina principală</InteractiveLink>
    </div>
  );
}
