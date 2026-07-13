import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { AiChatBody, AiProposal } from "../../../_shared/contracts";
import { logRouteError } from "../../../_shared/logging";

type ChatResponse = {
  reply: string;
  proposal?: AiProposal;
};

type ProductForChat = {
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: Array<{ url: string }>;
};

export async function POST(
  req: AuthenticatedMedusaRequest<AiChatBody>,
  res: MedusaResponse<ChatResponse>
) {
  if (process.env.NODE_ENV === "production") {
    res.status(503).json({
      reply: "AI product editing is not available in this environment.",
    });
    return;
  }

  const { product_id: productId, message } = req.validatedBody;

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "description", "thumbnail", "images.url"],
      filters: { id: productId },
    });
    const product = (data as Array<ProductForChat & { id: string }>)[0];
    if (!product) {
      res.status(404).json({ reply: "product not found" });
      return;
    }

    res.json(stubResponse(message, product));
  } catch (error) {
    logRouteError(req, "admin.ai_edit.chat.failed", error);
    res.status(500).json({
      reply: "Unable to process the AI edit request.",
    });
  }
}

function stubResponse(message: string, product: ProductForChat): ChatResponse {
  const lower = message.toLowerCase();
  const mentionsImage = /imag|fundal|background|cur[ăa][țt]/.test(lower);
  const mentionsDescription = /descriere|descri|rescri|copie/.test(lower);
  const mentionsTitle = /titlu|seo/.test(lower);

  if (mentionsImage) {
    const sourceUrl = product.thumbnail ?? product.images?.[0]?.url;
    if (!sourceUrl) {
      return {
        reply:
          "(development stub) Produsul nu are o imagine care poate fi previzualizată.",
      };
    }
    return {
      reply:
        "(development stub) Previzualizarea imaginii este neschimbată. Nu folosi această propunere în producție.",
      proposal: {
        kind: "image_edit",
        sourceUrl,
        previewUrl: sourceUrl,
        summary: "Curățare imagine — development stub",
      },
    };
  }

  if (mentionsDescription) {
    const current = product.description ?? "";
    return {
      reply:
        "(development stub) Aceasta este o propunere locală de test și nu este generată de un model AI.",
      proposal: {
        kind: "description",
        currentValue: current,
        proposedValue:
          (current.split(/\n\s*\n/)[0] ?? "Descriere produs DYLLU.") +
          "\n\n[Development stub — nu publica]",
        summary: "Rescriere descriere — development stub",
      },
    };
  }

  if (mentionsTitle) {
    return {
      reply:
        "(development stub) Aceasta este o propunere locală de test și nu este generată de un model AI.",
      proposal: {
        kind: "title",
        currentValue: product.title,
        proposedValue: product.title + " — DYLLU",
        summary: "Titlu propus — development stub",
      },
    };
  }

  return {
    reply:
      "(development stub) Nicio integrare AI nu este activă. Folosește acest răspuns doar pentru testarea interfeței locale.",
  };
}
