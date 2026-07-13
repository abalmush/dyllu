export default function medusaError(error: unknown): never {
  const details =
    typeof error === "object" && error
      ? (error as {
          name?: string;
          message?: string;
          status?: number;
          response?: { status?: number };
        })
      : {};
  const status = details.status ?? details.response?.status;

  console.error("Medusa request failed", {
    name: details.name ?? "UnknownError",
    status,
    message: details.message ?? "Unknown error",
  });

  if (status === 400 || status === 422) {
    throw new Error("Datele trimise nu sunt valide.");
  }
  if (status === 401 || status === 403) {
    throw new Error("Sesiunea nu este autorizată. Autentifică-te din nou.");
  }
  if (status === 404) {
    throw new Error("Resursa solicitată nu a fost găsită.");
  }
  if (status === 409) {
    throw new Error(
      "Datele s-au modificat. Reîncarcă pagina și încearcă din nou."
    );
  }
  if (status === 429) {
    throw new Error(
      "Prea multe solicitări. Încearcă din nou în câteva momente."
    );
  }

  throw new Error("Serviciul magazinului este temporar indisponibil.");
}
