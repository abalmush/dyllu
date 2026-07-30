import {
  ProductDescriptionProposal,
  ProductPriceProposal,
} from "../../domain/types";
import { requestPublishConfirmation } from "../confirmation-gate";

const proposal: ProductDescriptionProposal = {
  id: "proposal_1",
  kind: "description_update",
  status: "pending",
  actorId: "user_andrei",
  productId: "prod_drill",
  productTitle: "Mașină de găurit",
  variantId: null,
  priceId: null,
  currencyCode: null,
  beforeValue: "Descriere veche",
  proposedValue: "Descriere nouă",
  targetUpdatedAt: new Date("2026-07-29T09:00:00.000Z"),
  contentHash: "sha256:exact",
  reason: "Corectură",
  sourceRevisionId: null,
  createdAt: new Date("2026-07-29T09:30:00.000Z"),
  expiresAt: new Date("2026-07-29T10:30:00.000Z"),
};

describe("requestPublishConfirmation", () => {
  it("binds explicit user acceptance to the exact proposal hash", async () => {
    const elicitInput = jest.fn().mockResolvedValue({
      action: "accept",
      content: { confirm: true },
    });

    const receipt = await requestPublishConfirmation(
      { elicitInput },
      proposal,
      () => new Date("2026-07-29T10:00:00.000Z")
    );

    expect(receipt).toEqual({
      action: "accept",
      proposalId: proposal.id,
      contentHash: proposal.contentHash,
      confirmedAt: new Date("2026-07-29T10:00:00.000Z"),
    });
    expect(elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "form",
        message: expect.stringContaining(proposal.contentHash),
        requestedSchema: expect.objectContaining({
          required: ["confirm"],
        }),
      })
    );
  });

  it("does not create a receipt when the user declines", async () => {
    const receipt = await requestPublishConfirmation(
      {
        elicitInput: async () => ({
          action: "decline",
        }),
      },
      proposal,
      () => new Date("2026-07-29T10:00:00.000Z")
    );

    expect(receipt).toBeNull();
  });

  it("shows the exact currency and amounts for a price confirmation", async () => {
    const priceProposal: ProductPriceProposal = {
      ...proposal,
      kind: "price_update",
      variantId: "variant_drill",
      priceId: "price_mdl",
      currencyCode: "mdl",
      beforeValue: "1500",
      proposedValue: "1799",
    };
    const elicitInput = jest.fn().mockResolvedValue({
      action: "accept",
      content: { confirm: true },
    });

    await requestPublishConfirmation(
      { elicitInput },
      priceProposal,
      () => new Date("2026-07-29T10:00:00.000Z")
    );

    expect(elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("1500 MDL → 1799 MDL"),
      })
    );
  });
});
