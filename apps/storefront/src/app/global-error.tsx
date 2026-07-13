"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront root error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="ro">
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1>Magazinul este temporar indisponibil</h1>
          <p>Te rugăm să încerci din nou peste câteva momente.</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: "44px", padding: "0.75rem 1.5rem" }}
          >
            Încearcă din nou
          </button>
        </main>
      </body>
    </html>
  );
}
