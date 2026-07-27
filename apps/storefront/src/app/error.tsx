"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront route error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
        Eroare temporară
      </p>
      <h1 className="font-display text-foreground text-3xl font-bold">
        Pagina nu a putut fi încărcată
      </h1>
      <p className="text-muted-foreground max-w-xl">
        Te rugăm să încerci din nou. Dacă problema persistă, revino peste câteva
        minute.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-foreground text-background min-h-11 px-6 py-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid"
      >
        Încearcă din nou
      </button>
    </main>
  );
}
