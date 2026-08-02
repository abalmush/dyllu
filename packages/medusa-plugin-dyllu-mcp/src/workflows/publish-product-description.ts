import {
  MedusaContainer,
  ProductTypes,
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
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

import {
  Actor,
  ProductDescriptionProposal,
  ProductDescriptionRevision,
} from "../domain/types";
import { createProductDescriptionHash } from "../domain/product-description-hash";
import { MedusaProductCatalog } from "../infrastructure/medusa-directory";
import { MedusaGovernanceStore } from "../infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishProductDescriptionWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedChange = {
  proposal: ProductDescriptionProposal;
};

type UpdatedChange = {
  updatedProducts: ProductTypes.ProductDTO[];
};

const dylluMcpValidateDescriptionChangeStep = createStep(
  "dyllu-mcp-validate-description-change",
  async (input: PublishProductDescriptionWorkflowInput, { container }) => {
    const governance = resolveGovernance(container);
    const proposal = await governance.findProposal(input.proposalId);
    if (
      !proposal ||
      (proposal.kind !== "description_update" &&
        proposal.kind !== "description_rollback") ||
      proposal.actorId !== input.actor.id ||
      proposal.status !== "pending" ||
      proposal.contentHash !== input.contentHash ||
      proposal.contentHash !==
        createProductDescriptionHash({
          productId: proposal.productId,
          productUpdatedAt: proposal.targetUpdatedAt,
          beforeValue: proposal.beforeValue,
          proposedValue: proposal.proposedValue,
        }) ||
      proposal.expiresAt.getTime() <= Date.now()
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP proposal is no longer publishable"
      );
    }

    const products = new MedusaProductCatalog(resolveQuery(container));
    const product = await products.findById(proposal.productId);
    if (
      !product ||
      product.updatedAt.getTime() !== proposal.targetUpdatedAt.getTime() ||
      (product.description ?? "") !== proposal.beforeValue
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The DYLLU product changed after the MCP proposal was created"
      );
    }

    return new StepResponse<ValidatedChange>({
      proposal: proposal as ProductDescriptionProposal,
    });
  }
);

const dylluMcpRecordDescriptionRevisionStep = createStep(
  "dyllu-mcp-record-description-revision",
  async (
    input: PublishProductDescriptionWorkflowInput &
      ValidatedChange &
      UpdatedChange,
    { container }
  ) => {
    const updatedProduct = input.updatedProducts[0];
    if (
      input.updatedProducts.length !== 1 ||
      updatedProduct?.id !== input.proposal.productId ||
      (updatedProduct.description ?? "") !== input.proposal.proposedValue
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The DYLLU product changed while the MCP proposal was publishing"
      );
    }
    const service = resolveGovernanceService(container);
    const revision: ProductDescriptionRevision = {
      id: generateEntityId(undefined, "mcprev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action:
        input.proposal.kind === "description_rollback" ? "rollback" : "update",
      actor: input.actor,
      productId: input.proposal.productId,
      productTitle: input.proposal.productTitle,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue: input.proposal.beforeValue,
      afterValue: input.proposal.proposedValue,
      sourceRevisionId: input.proposal.sourceRevisionId,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
    };
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

export const dylluMcpPublishProductDescriptionWorkflow = createWorkflow(
  "dyllu-mcp-publish-product-description",
  (input: PublishProductDescriptionWorkflowInput) => {
    const validated = dylluMcpValidateDescriptionChangeStep(input);
    const updateInput = transform(validated, ({ proposal }) => ({
      selector: {
        id: proposal.productId,
        updated_at: proposal.targetUpdatedAt.toISOString(),
      },
      update: {
        description: proposal.proposedValue,
      },
    }));
    const updatedProducts = updateProductsWorkflow.runAsStep({
      input: updateInput,
    });
    const revisionInput = transform(
      { input, validated, updatedProducts },
      ({
        input: workflowInput,
        validated: change,
        updatedProducts: products,
      }) => ({
        ...workflowInput,
        ...change,
        updatedProducts: products,
      })
    );
    const revision = dylluMcpRecordDescriptionRevisionStep(revisionInput);
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
