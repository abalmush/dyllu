import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

import { AiApplyBody } from "../../../_shared/contracts";
import { logRouteError } from "../../../_shared/logging";

type ProductForApply = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: Array<{ url: string }>;
};

export async function POST(
  req: AuthenticatedMedusaRequest<AiApplyBody>,
  res: MedusaResponse
) {
  if (process.env.NODE_ENV === "production") {
    res.status(503).json({
      error: "feature_unavailable",
      message: "AI product editing is not available in this environment.",
    });
    return;
  }

  const { product_id: productId, proposal } = req.validatedBody;
  const container = req.scope;

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "description", "thumbnail", "images.url"],
      filters: { id: productId },
    });
    const product = (data as ProductForApply[])[0];
    if (!product) {
      res.status(404).json({ error: "product_not_found" });
      return;
    }

    if (proposal.kind === "title") {
      if (product.title !== proposal.currentValue) {
        res.status(409).json({ error: "stale_proposal" });
        return;
      }
      await updateProductsWorkflow(container).run({
        input: {
          products: [{ id: productId, title: proposal.proposedValue }],
        },
      });
      logProductMutation(req, productId, proposal.kind);
      res.json({ applied: true, kind: proposal.kind });
      return;
    }

    if (proposal.kind === "description") {
      if ((product.description ?? "") !== proposal.currentValue) {
        res.status(409).json({ error: "stale_proposal" });
        return;
      }
      await updateProductsWorkflow(container).run({
        input: {
          products: [{ id: productId, description: proposal.proposedValue }],
        },
      });
      logProductMutation(req, productId, proposal.kind);
      res.json({ applied: true, kind: proposal.kind });
      return;
    }

    const sourceExists =
      product.thumbnail === proposal.sourceUrl ||
      (product.images ?? []).some((image) => image.url === proposal.sourceUrl);
    if (!sourceExists) {
      res.status(409).json({ error: "stale_proposal" });
      return;
    }

    const nextImages = (product.images ?? []).map((image) =>
      image.url === proposal.sourceUrl
        ? { url: proposal.previewUrl }
        : { url: image.url }
    );
    const nextThumbnail =
      product.thumbnail === proposal.sourceUrl
        ? proposal.previewUrl
        : product.thumbnail;

    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: productId,
            thumbnail: nextThumbnail,
            images: nextImages,
          },
        ],
      },
    });
    logProductMutation(req, productId, proposal.kind);
    res.json({ applied: true, kind: proposal.kind });
  } catch (error) {
    logRouteError(req, "admin.ai_edit.apply.failed", error);
    res.status(500).json({
      error: "internal_error",
      message: "Unable to apply the product change.",
    });
  }
}

function logProductMutation(
  req: AuthenticatedMedusaRequest<AiApplyBody>,
  productId: string,
  kind: AiApplyBody["proposal"]["kind"]
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  logger.info(
    JSON.stringify({
      event: "admin.ai_edit.applied",
      request_id: req.requestId,
      actor_id: req.auth_context?.actor_id,
      product_id: productId,
      proposal_kind: kind,
    })
  );
}
