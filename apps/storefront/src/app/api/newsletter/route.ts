import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendUrl =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_URL ||
    "http://localhost:9000";
  try {
    const body = await request.text();
    const response = await fetch(`${backendUrl}/store/newsletter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const payload = await response.json().catch(() => ({
      error: "invalid_response",
      message: "Abonarea nu este disponibilă momentan.",
    }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: "email_unavailable",
        message: "Abonarea nu este disponibilă momentan.",
      },
      { status: 503 }
    );
  }
}
