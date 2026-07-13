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
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Eroare temporară
      </p>
      <h1 className="font-display text-3xl font-bold text-foreground">
        Pagina nu a putut fi încărcată
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Te rugăm să încerci din nou. Dacă problema persistă, revino peste câteva
        minute.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 bg-foreground px-6 py-3 font-semibold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Încearcă din nou
      </button>
    </main>
  );
}
