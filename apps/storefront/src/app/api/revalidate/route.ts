import { NextResponse } from "next/server";
import { revalidateTag as nextRevalidateTag } from "next/cache";

const DEFAULT_TAGS = [
  "products",
  "categories",
  "collections",
  "compatible-accessories",
];
const ALLOWED_TAGS = new Set(DEFAULT_TAGS);

const revalidateTag = (tag: string) => nextRevalidateTag(tag, "max");

async function secretsMatch(actual: string | null, expected: string) {
  if (!actual) return false;

  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;

  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "REVALIDATE_SECRET is missing or too short; refusing revalidation"
    );
    return json({ error: "revalidation unavailable" }, 503);
  }

  if (
    !(await secretsMatch(request.headers.get("x-revalidate-secret"), secret))
  ) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = (await request.json().catch(() => null)) as {
    tags?: unknown;
  } | null;
  if (!body) {
    return json({ error: "invalid JSON body" }, 400);
  }

  const requestedTags = body.tags ?? DEFAULT_TAGS;
  if (
    !Array.isArray(requestedTags) ||
    requestedTags.length === 0 ||
    requestedTags.length > ALLOWED_TAGS.size ||
    requestedTags.some(
      (tag) => typeof tag !== "string" || !ALLOWED_TAGS.has(tag)
    )
  ) {
    return json({ error: "invalid revalidation tags" }, 400);
  }

  const tags = [...new Set(requestedTags as string[])];

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return json({ revalidated: tags });
}
