import {
  MedusaContainer,
  PricingTypes,
  Query,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  generateEntityId,
} from "@medusajs/framework/utils";
import {
  StepResponse,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

import {
  Actor,
  ProductPriceProposal,
  ProductPriceRevision,
} from "../domain/types";
import { createCatalogChangeHash } from "../domain/catalog-change-hash";
import { MedusaProductCatalog } from "../infrastructure/medusa-directory";
import { MedusaGovernanceStore } from "../infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishProductPriceWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedPriceChange = {
  proposal: ProductPriceProposal;
};

type UpdatedPriceChange = {
  updatedVariants: Array<{
    id: string;
    price_set?: {
      prices?: PricingTypes.PriceDTO[];
    };
  }>;
};

const validatePriceChangeStep = createStep(
  "validate-price-change",
  async (input: PublishProductPriceWorkflowInput, { container }) => {
    const governance = resolveGovernance(container);
    const proposal = await governance.findProposal(input.proposalId);
    if (
      !proposal ||
      (proposal.kind !== "price_update" &&
        proposal.kind !== "price_rollback") ||
      !proposal.variantId ||
      !proposal.priceId ||
      !proposal.currencyCode ||
      proposal.actorId !== input.actor.id ||
      proposal.status !== "pending" ||
      proposal.contentHash !== input.contentHash ||
      proposal.contentHash !==
        createCatalogChangeHash({
          kind: proposal.kind,
          productId: proposal.productId,
          variantId: proposal.variantId,
          priceId: proposal.priceId,
          currencyCode: proposal.currencyCode,
          targetUpdatedAt: proposal.targetUpdatedAt,
          beforeValue: proposal.beforeValue,
          proposedValue: proposal.proposedValue,
        }) ||
      proposal.expiresAt.getTime() <= Date.now()
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP price proposal is no longer publishable"
      );
    }

    const products = new MedusaProductCatalog(resolveQuery(container));
    const target = await products.findVariantPrice({
      productId: proposal.productId,
      variantId: proposal.variantId,
      priceId: proposal.priceId,
      currencyCode: proposal.currencyCode,
    });
    if (
      !target ||
      target.updatedAt.getTime() !== proposal.targetUpdatedAt.getTime() ||
      String(target.amount) !== proposal.beforeValue
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The price changed after the MCP proposal was created"
      );
    }

    return new StepResponse<ValidatedPriceChange>({
      proposal: proposal as ProductPriceProposal,
    });
  }
);

const recordPriceRevisionStep = createStep(
  "record-price-revision",
  async (
    input: PublishProductPriceWorkflowInput &
      ValidatedPriceChange &
      UpdatedPriceChange,
    { container }
  ) => {
    const updatedVariant = input.updatedVariants[0];
    const updatedPrice = updatedVariant?.price_set?.prices?.find(
      (price) => price.id === input.proposal.priceId
    );
    if (
      input.updatedVariants.length !== 1 ||
      updatedVariant?.id !== input.proposal.variantId ||
      !updatedPrice ||
      updatedPrice.amount !== Number(input.proposal.proposedValue) ||
      updatedPrice.currency_code !== input.proposal.currencyCode
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The price changed while the MCP proposal was publishing"
      );
    }

    const revision: ProductPriceRevision = {
      id: generateEntityId(undefined, "mcprev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action: input.proposal.kind === "price_rollback" ? "rollback" : "update",
      actor: input.actor,
      productId: input.proposal.productId,
      productTitle: input.proposal.productTitle,
      variantId: input.proposal.variantId,
      priceId: input.proposal.priceId,
      currencyCode: input.proposal.currencyCode,
      beforeValue: input.proposal.beforeValue,
      afterValue: input.proposal.proposedValue,
      sourceRevisionId: input.proposal.sourceRevisionId,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
    };
    const service = resolveGovernanceService(container);
    await service.completeCatalogChange({
      actor: input.actor,
      proposal: input.proposal,
      revision,
      confirmedEventId: generateEntityId(undefined, "mcpevt"),
      appliedEventId: generateEntityId(undefined, "mcpevt"),
      confirmedAt: input.confirmedAt,
    });
    return new StepResponse(revision);
  }
);

export const dylluMcpPublishProductPriceWorkflow = createWorkflow(
  "dyllu-mcp-publish-product-price",
  (input: PublishProductPriceWorkflowInput) => {
    const validated = validatePriceChangeStep(input);
    const updateInput = transform(validated, ({ proposal }) => ({
      selector: {
        id: proposal.variantId,
        product_id: proposal.productId,
      },
      update: {
        prices: [
          {
            id: proposal.priceId,
            amount: Number(proposal.proposedValue),
            currency_code: proposal.currencyCode,
          },
        ],
      },
    }));
    const updatedVariants = updateProductVariantsWorkflow.runAsStep({
      input: updateInput,
    });
    const revisionInput = transform(
      { input, validated, updatedVariants },
      ({
        input: workflowInput,
        validated: change,
        updatedVariants: variants,
      }) => ({
        ...workflowInput,
        ...change,
        updatedVariants: variants,
      })
    );
    const revision = recordPriceRevisionStep(revisionInput);
    return new WorkflowResponse(revision);
  }
);

function resolveQuery(container: MedusaContainer) {
  return container.resolve<Query>(ContainerRegistrationKeys.QUERY);
}

function resolveGovernanceService(container: MedusaContainer) {
  return container.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
}

function resolveGovernance(container: MedusaContainer) {
  return new MedusaGovernanceStore(resolveGovernanceService(container));
}
