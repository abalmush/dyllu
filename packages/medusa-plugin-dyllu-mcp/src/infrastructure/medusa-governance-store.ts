import { CapabilityStore, GovernanceStore } from "../application/ports";
import {
  AuditEvent,
  Capability,
  ProductChangeProposal,
  ProductChangeRevision,
  capabilities,
} from "../domain/types";
import { ILockingModule } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export class MedusaCapabilityStore implements CapabilityStore {
  constructor(
    private readonly service: DylluMcpGovernanceModuleService,
    private readonly locking: ILockingModule
  ) {}

  async listForUser(userId: string) {
    if (await this.service.isBootstrapUser(userId)) {
      return [...capabilities];
    }
    const grants = await this.service.listDylluMcpCapabilityGrants(
      { user_id: userId },
      { take: capabilities.length }
    );
    const granted = new Set(
      grants
        .map((grant) => grant.capability)
        .filter((capability): capability is Capability =>
          capabilities.includes(capability as Capability)
        )
    );
    return capabilities.filter((capability) => granted.has(capability));
  }

  async replaceForUser(
    input: Parameters<CapabilityStore["replaceForUser"]>[0]
  ) {
    await this.locking.execute(
      `dyllu-mcp:capabilities:${input.userId}`,
      () => this.service.replaceCapabilityGrants(input),
      { timeout: 5 }
    );
  }
}

export class MedusaGovernanceStore implements GovernanceStore {
  constructor(private readonly service: DylluMcpGovernanceModuleService) {}

  async createProposal(
    input: Parameters<GovernanceStore["createProposal"]>[0]
  ) {
    await this.service.createCatalogProposal(input);
  }

  async findProposal(proposalId: string) {
    const proposals = await this.service.listDylluMcpChangeProposals(
      { id: proposalId },
      { take: 1 }
    );
    const proposal = proposals[0];
    return proposal ? this.toProposal(proposal) : null;
  }

  async findRevision(revisionId: string) {
    const revisions = await this.service.listDylluMcpChangeRevisions(
      { id: revisionId },
      { take: 1 }
    );
    const revision = revisions[0];
    return revision ? this.toRevision(revision) : null;
  }

  async listRevisions(productId: string, limit: number) {
    const revisions = await this.service.listDylluMcpChangeRevisions(
      { product_id: productId },
      {
        take: limit,
        order: { created_at: "DESC" },
      }
    );
    return revisions.map((revision) => this.toRevision(revision));
  }

  async listEvents(input: Parameters<GovernanceStore["listEvents"]>[0]) {
    const events = await this.service.listDylluMcpAuditEvents(
      {
        ...(input.actorId ? { actor_id: input.actorId } : {}),
        ...(input.targetId ? { target_id: input.targetId } : {}),
      },
      {
        take: input.limit,
        order: { occurred_at: "DESC" },
      }
    );
    return events.map((event) => ({
      id: event.id,
      name: event.name,
      actorId: event.actor_id,
      targetId: event.target_id,
      proposalId: event.proposal_id,
      revisionId: event.revision_id,
      requestId: event.request_id,
      details: auditDetailsSchema.parse(event.details),
      occurredAt: event.occurred_at,
    }));
  }

  async appendEvent(event: AuditEvent) {
    await this.service.createDylluMcpAuditEvents({
      id: event.id,
      name: event.name,
      actor_id: event.actorId,
      target_id: event.targetId,
      proposal_id: event.proposalId,
      revision_id: event.revisionId,
      request_id: event.requestId,
      details: event.details,
      occurred_at: event.occurredAt,
    });
  }

  async closeProposal(input: Parameters<GovernanceStore["closeProposal"]>[0]) {
    await this.service.closeCatalogProposal(input);
  }

  private toProposal(
    proposal: Awaited<
      ReturnType<DylluMcpGovernanceModuleService["listDylluMcpChangeProposals"]>
    >[number]
  ): ProductChangeProposal {
    const base = {
      id: proposal.id,
      status: proposal.status,
      actorId: proposal.actor_id,
      productId: proposal.product_id,
      productTitle: proposal.product_title,
      beforeValue: proposal.before_value,
      proposedValue: proposal.proposed_value,
      targetUpdatedAt: proposal.target_updated_at,
      contentHash: proposal.content_hash,
      reason: proposal.reason,
      sourceRevisionId: proposal.source_revision_id,
      createdAt: proposal.created_at,
      expiresAt: proposal.expires_at,
    };
    if (
      proposal.kind === "price_update" ||
      proposal.kind === "price_rollback"
    ) {
      if (
        !proposal.variant_id ||
        !proposal.price_id ||
        !proposal.currency_code
      ) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Stored price proposal has incomplete target data"
        );
      }
      return {
        ...base,
        kind: proposal.kind,
        variantId: proposal.variant_id,
        priceId: proposal.price_id,
        currencyCode: proposal.currency_code,
      };
    }
    if (proposal.variant_id || proposal.price_id || proposal.currency_code) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Stored description proposal has unexpected target data"
      );
    }
    return {
      ...base,
      kind: proposal.kind,
      variantId: null,
      priceId: null,
      currencyCode: null,
    };
  }

  private toRevision(
    revision: Awaited<
      ReturnType<DylluMcpGovernanceModuleService["listDylluMcpChangeRevisions"]>
    >[number]
  ): ProductChangeRevision {
    const base = {
      id: revision.id,
      proposalId: revision.proposal_id,
      action: revision.action,
      actor: {
        id: revision.actor_id,
        email: revision.actor_email,
        name: revision.actor_name,
      },
      productId: revision.product_id,
      productTitle: revision.product_title,
      beforeValue: revision.before_value,
      afterValue: revision.after_value,
      sourceRevisionId: revision.source_revision_id,
      reason: revision.reason,
      requestId: revision.request_id,
      createdAt: revision.created_at,
    };
    if (
      revision.kind === "price_update" ||
      revision.kind === "price_rollback"
    ) {
      if (
        !revision.variant_id ||
        !revision.price_id ||
        !revision.currency_code
      ) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Stored price revision has incomplete target data"
        );
      }
      return {
        ...base,
        kind: revision.kind,
        variantId: revision.variant_id,
        priceId: revision.price_id,
        currencyCode: revision.currency_code,
      };
    }
    if (revision.variant_id || revision.price_id || revision.currency_code) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Stored description revision has unexpected target data"
      );
    }
    return {
      ...base,
      kind: revision.kind,
      variantId: null,
      priceId: null,
      currencyCode: null,
    };
  }
}

const auditDetailsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);
