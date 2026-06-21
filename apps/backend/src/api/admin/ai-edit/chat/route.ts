import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type HistoryMessage = { role: "user" | "assistant" | "system"; text: string };

type ChatRequestBody = {
  product_id?: string;
  message?: string;
  history?: HistoryMessage[];
};

type ProposedChange =
  | {
      kind: "description";
      currentValue: string;
      proposedValue: string;
      summary: string;
    }
  | {
      kind: "title";
      currentValue: string;
      proposedValue: string;
      summary: string;
    }
  | {
      kind: "image_edit";
      sourceUrl: string;
      previewUrl: string;
      summary: string;
    };

type ChatResponse = {
  reply: string;
  proposal?: ProposedChange;
};

export async function POST(
  req: MedusaRequest<ChatRequestBody>,
  res: MedusaResponse<ChatResponse>
) {
  const body = req.body ?? {};
  const productId = body.product_id ?? "";
  const message = (body.message ?? "").trim();
  if (!productId || !message) {
    res
      .status(400)
      .json({ reply: "product_id and message are required" } as ChatResponse);
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "description", "thumbnail", "images.url"],
    filters: { id: productId },
  });
  const product = (data as Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    images?: Array<{ url: string }>;
  }>)[0];
  if (!product) {
    res.status(404).json({ reply: "product not found" });
    return;
  }

  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  if (!hasGeminiKey) {
    res.json(stubResponse(message, product));
    return;
  }

  // TODO: replace this branch with the real Gemini call + tool routing
  // once the API key is provisioned. For now mirror the stub behaviour so
  // the UI loop is exercisable end-to-end.
  res.json(stubResponse(message, product));
}

function stubResponse(
  message: string,
  product: {
    title: string;
    description: string | null;
    thumbnail: string | null;
    images?: Array<{ url: string }>;
  }
): ChatResponse {
  const lower = message.toLowerCase();
  const mentionsImage = /imag|fundal|background|cur[ăa][țt]/.test(lower);
  const mentionsDescription = /descriere|descri|rescri|copie/.test(lower);
  const mentionsTitle = /titlu|seo/.test(lower);

  if (mentionsImage) {
    const sourceUrl = product.thumbnail ?? product.images?.[0]?.url ?? "";
    return {
      reply:
        "(stub) Voi curăța imaginea — fundal alb pur, fără badge-uri sau insetări. Apăsă „Aplică” pentru a accepta previzualizarea.\n\nAcest răspuns va deveni real odată ce este setat GEMINI_API_KEY.",
      proposal: {
        kind: "image_edit",
        sourceUrl,
        previewUrl: sourceUrl,
        summary: "Curățare imagine — fundal alb",
      },
    };
  }

  if (mentionsDescription) {
    const current = product.description ?? "";
    return {
      reply:
        "(stub) Aici ar veni o descriere rescrisă pe baza textului actual. Activează GEMINI_API_KEY pentru a folosi modelul real.",
      proposal: {
        kind: "description",
        currentValue: current.slice(0, 600),
        proposedValue:
          (current.split(/\n\s*\n/)[0] ?? "Descriere produs DYLLU.") +
          "\n\n[Versiune AI — disponibilă după setarea GEMINI_API_KEY]",
        summary: "Rescriere descriere (stub)",
      },
    };
  }

  if (mentionsTitle) {
    return {
      reply:
        "(stub) Pot propune un titlu mai scurt, SEO-friendly. Activează GEMINI_API_KEY pentru titluri generate de AI.",
      proposal: {
        kind: "title",
        currentValue: product.title,
        proposedValue: product.title + " — DYLLU",
        summary: "Titlu propus (stub)",
      },
    };
  }

  return {
    reply:
      "(stub) Asistentul nu este încă conectat la Gemini. Setează GEMINI_API_KEY în apps/backend/.env și repornește serverul. Între timp, încearcă unul din promptii: „curăță imaginea”, „rescrie descrierea”, „propune un titlu SEO”.",
  };
}
