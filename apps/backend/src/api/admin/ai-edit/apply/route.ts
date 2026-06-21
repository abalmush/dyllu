import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

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

type ApplyRequestBody = {
  product_id?: string;
  proposal?: ProposedChange;
};

export async function POST(
  req: MedusaRequest<ApplyRequestBody>,
  res: MedusaResponse
) {
  const body = req.body ?? {};
  const productId = body.product_id ?? "";
  const proposal = body.proposal;
  if (!productId || !proposal) {
    res.status(400).json({ error: "product_id and proposal are required" });
    return;
  }

  const container = req.scope;

  try {
    if (proposal.kind === "title") {
      await updateProductsWorkflow(container).run({
        input: {
          products: [
            {
              id: productId,
              title: proposal.proposedValue,
            },
          ],
        },
      });
      res.json({ applied: true, kind: proposal.kind });
      return;
    }
    if (proposal.kind === "description") {
      await updateProductsWorkflow(container).run({
        input: {
          products: [
            {
              id: productId,
              description: proposal.proposedValue,
            },
          ],
        },
      });
      res.json({ applied: true, kind: proposal.kind });
      return;
    }
    if (proposal.kind === "image_edit") {
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "thumbnail", "images.url"],
        filters: { id: productId },
      });
      const product = (data as Array<{
        id: string;
        thumbnail: string | null;
        images?: Array<{ url: string }>;
      }>)[0];
      if (!product) {
        res.status(404).json({ error: "product not found" });
        return;
      }
      const nextImages = (product.images ?? []).map((img) =>
        img.url === proposal.sourceUrl
          ? { url: proposal.previewUrl }
          : { url: img.url }
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
      res.json({ applied: true, kind: proposal.kind });
      return;
    }
    res.status(400).json({ error: "unknown proposal kind" });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}
