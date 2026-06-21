import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const DEFAULT_TAGS = [
  "products",
  "categories",
  "collections",
  "compatible-accessories",
];

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const headerSecret = request.headers.get("x-revalidate-secret");
  if (secret && headerSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: string[] };
  const tags =
    Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : DEFAULT_TAGS;

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tagsParam = url.searchParams.get("tags");
  const tags = tagsParam
    ? tagsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : DEFAULT_TAGS;
  for (const tag of tags) {
    revalidateTag(tag);
  }
  return NextResponse.json({ revalidated: tags });
}
