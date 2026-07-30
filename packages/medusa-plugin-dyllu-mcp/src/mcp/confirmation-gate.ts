import { ElicitRequestFormParams } from "@modelcontextprotocol/sdk/types.js";

import { ConfirmationReceipt, ProductChangeProposal } from "../domain/types";

type ElicitationResult = {
  action: "accept" | "decline" | "cancel";
  content?: Record<string, unknown>;
};

export type Elicitor = {
  elicitInput(params: ElicitRequestFormParams): Promise<ElicitationResult>;
};

export async function requestPublishConfirmation(
  elicitor: Elicitor,
  proposal: ProductChangeProposal,
  now: () => Date
): Promise<ConfirmationReceipt | null> {
  const isPrice =
    proposal.kind === "price_update" || proposal.kind === "price_rollback";
  const changeSummary = isPrice
    ? [
        `Publish price for "${proposal.productTitle}"?`,
        `Variant: ${proposal.variantId}`,
        `${proposal.beforeValue} ${proposal.currencyCode?.toUpperCase()} → ${proposal.proposedValue} ${proposal.currencyCode?.toUpperCase()}`,
      ]
    : [
        `Publish description for "${proposal.productTitle}"?`,
        "",
        "Current description:",
        proposal.beforeValue,
        "",
        "Proposed description:",
        proposal.proposedValue,
      ];
  const result = await elicitor.elicitInput({
    mode: "form",
    message: [
      ...changeSummary,
      `Proposal: ${proposal.id}`,
      `Hash: ${proposal.contentHash}`,
    ].join("\n"),
    requestedSchema: {
      type: "object",
      properties: {
        confirm: {
          type: "boolean",
          title: "Publish now",
          description:
            "Confirm that the exact change shown above is ready for the public site.",
        },
      },
      required: ["confirm"],
    },
  });

  if (result.action !== "accept" || result.content?.confirm !== true) {
    return null;
  }

  return {
    action: "accept",
    proposalId: proposal.id,
    contentHash: proposal.contentHash,
    confirmedAt: now(),
  };
}
