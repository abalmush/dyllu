"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState("ro");

  useEffect(() => {
    console.error("Storefront root error", {
      digest: error.digest,
      message: error.message,
    });
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    if (match) setLang(decodeURIComponent(match[1]));
  }, [error]);

  const copy =
    lang === "ru"
      ? {
          title: "Магазин временно недоступен",
          body: "Пожалуйста, попробуйте снова через несколько минут.",
          retry: "Повторить",
        }
      : {
          title: "Magazinul este temporar indisponibil",
          body: "Te rugăm să încerci din nou peste câteva momente.",
          retry: "Încearcă din nou",
        };

  return (
    <html lang={lang}>
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
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: "44px", padding: "0.75rem 1.5rem" }}
          >
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
