import { EntityManager } from "@medusajs/framework/mikro-orm/knex";
import { Context } from "@medusajs/framework/types";
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
  generateEntityId,
} from "@medusajs/framework/utils";

import {
  Actor,
  Capability,
  ProductChangeProposal,
  ProductChangeRevision,
  OperationProposal,
  OperationRevision,
} from "../../domain/types";
import { Auth0AccessTokenVerifier } from "../../auth/auth0-access-token-verifier";
import { Auth0JwksSigningKeyProvider } from "../../auth/auth0-jwks-signing-key-provider";
import { authenticateMcpAuthorization } from "../../auth/authenticate-mcp-authorization";
import {
  DylluMcpModuleOptions,
  ParsedDylluMcpOptions,
  parseDylluMcpOptions,
} from "../../auth/options";
import {
  DylluMcpAuditEvent,
  DylluMcpCapabilityGrant,
  DylluMcpChangeProposal,
  DylluMcpChangeRevision,
  DylluMcpOperationProposal,
  DylluMcpOperationRevision,
} from "./models";

export type CompleteCatalogChangeInput = {
  actor: Actor;
  proposal: ProductChangeProposal;
  revision: ProductChangeRevision;
  confirmedEventId: string;
  appliedEventId: string;
  confirmedAt: Date;
};

export type SupersedeCatalogProposalsInput = {
  actorId: string;
  productId: string;
  requestId: string;
  occurredAt: Date;
};

export type CreateCatalogProposalInput = {
  proposal: ProductChangeProposal;
  requestId: string;
};

export type CloseCatalogProposalInput = {
  actorId: string;
  proposalId: string;
  productId: string;
  requestId: string;
  occurredAt: Date;
  status: "expired" | "failed" | "rejected";
  reason: string;
};

export type CreateOperationProposalInput = {
  proposal: OperationProposal;
  requestId: string;
};

export type CloseOperationProposalInput = {
  actorId: string;
  proposalId: string;
  targetKey: string;
  requestId: string;
  occurredAt: Date;
  status: "expired" | "failed" | "rejected";
  reason: string;
};

export type CompleteOperationChangeInput = {
  actor: Actor;
  proposal: OperationProposal;
  revision: OperationRevision;
  confirmedEventId: string;
  appliedEventId: string;
  confirmedAt: Date;
};

export type { DylluMcpModuleOptions } from "../../auth/options";

export class DylluMcpGovernanceModuleService extends MedusaService({
  DylluMcpAuditEvent,
  DylluMcpCapabilityGrant,
  DylluMcpChangeProposal,
  DylluMcpChangeRevision,
  DylluMcpOperationProposal,
  DylluMcpOperationRevision,
}) {
  private readonly options_: ParsedDylluMcpOptions;
  private readonly accessTokenVerifier_: Auth0AccessTokenVerifier | null;

  constructor(
    _container: Record<string, unknown>,
    options?: DylluMcpModuleOptions
  ) {
    super(...arguments);
    this.options_ = parseDylluMcpOptions(options);
    const oauth = this.options_.oauth;
    this.accessTokenVerifier_ = oauth
      ? new Auth0AccessTokenVerifier(
          {
            allowedClientIds: oauth.allowedClientIds,
            audience: oauth.resource,
            issuer: oauth.issuer,
            medusaUserIdClaim: oauth.medusaUserIdClaim,
            requiredScopes: oauth.requiredScopes,
          },
          new Auth0JwksSigningKeyProvider(oauth.jwksUri)
        )
      : null;
  }

  async isEnabled() {
    return this.options_.enabled;
  }

  async isBootstrapUser(userId: string) {
    return this.options_.bootstrapUserIds.includes(userId);
  }

  async authenticateMcpAuthorization(authorization: string | undefined) {
    if (!this.options_.enabled || !this.accessTokenVerifier_) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "DYLLU MCP OAuth is unavailable"
      );
    }
    return authenticateMcpAuthorization(
      authorization,
      this.accessTokenVerifier_
    );
  }

  async getOAuthResourceMetadata() {
    const oauth = this.options_.oauth;
    if (!oauth) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "DYLLU MCP OAuth is unavailable"
      );
    }
    return {
      resource: oauth.resource,
      authorization_servers: [oauth.issuer],
      scopes_supported: oauth.requiredScopes,
      resource_documentation: "https://dyllu.md",
    };
  }

  async getOAuthChallenge() {
    const oauth = this.options_.oauth;
    if (!oauth) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "DYLLU MCP OAuth is unavailable"
      );
    }
    return [
      `Bearer resource_metadata="${oauth.protectedResourceMetadataUrl}"`,
      `scope="${oauth.requiredScopes.join(" ")}"`,
    ].join(", ");
  }

  @InjectTransactionManager()
  protected async completeCatalogChange_(
    input: CompleteCatalogChangeInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to complete an MCP change"
      );
    }

    const affected = await transactionManager.nativeUpdate(
      "dyllu_mcp_change_proposal",
      {
        id: input.proposal.id,
        actor_id: input.actor.id,
        status: "pending",
        content_hash: input.proposal.contentHash,
      },
      {
        status: "applied",
        updated_at: input.confirmedAt,
      }
    );
    if (affected !== 1) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP proposal is no longer publishable"
      );
    }

    await this.createDylluMcpChangeRevisions(
      [
        {
          id: input.revision.id,
          proposal_id: input.revision.proposalId,
          kind: input.revision.kind,
          action: input.revision.action,
          actor_id: input.revision.actor.id,
          actor_email: input.revision.actor.email,
          actor_name: input.revision.actor.name,
          product_id: input.revision.productId,
          product_title: input.revision.productTitle,
          variant_id: input.revision.variantId,
          price_id: input.revision.priceId,
          currency_code: input.revision.currencyCode,
          before_value: input.revision.beforeValue,
          after_value: input.revision.afterValue,
          source_revision_id: input.revision.sourceRevisionId,
          reason: input.revision.reason,
          request_id: input.revision.requestId,
        },
      ],
      sharedContext
    );
    await this.createDylluMcpAuditEvents(
      [
        {
          id: input.confirmedEventId,
          name: "proposal.confirmed",
          actor_id: input.actor.id,
          target_id: input.proposal.productId,
          proposal_id: input.proposal.id,
          revision_id: null,
          request_id: input.revision.requestId,
          details: {
            content_hash: input.proposal.contentHash,
          },
          occurred_at: input.confirmedAt,
        },
        {
          id: input.appliedEventId,
          name: "proposal.applied",
          actor_id: input.actor.id,
          target_id: input.proposal.productId,
          proposal_id: input.proposal.id,
          revision_id: input.revision.id,
          request_id: input.revision.requestId,
          details: {
            action: input.revision.action,
            source_revision_id: input.revision.sourceRevisionId,
          },
          occurred_at: input.revision.createdAt,
        },
      ],
      sharedContext
    );

    return input.revision;
  }

  @InjectManager()
  async completeCatalogChange(
    input: CompleteCatalogChangeInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.completeCatalogChange_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async supersedeCatalogProposals_(
    input: SupersedeCatalogProposalsInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to supersede MCP proposals"
      );
    }
    const pending = await this.listDylluMcpChangeProposals(
      {
        actor_id: input.actorId,
        product_id: input.productId,
        status: "pending",
      },
      {},
      sharedContext
    );
    if (pending.length === 0) {
      return [];
    }

    const proposalIds = pending.map((proposal) => proposal.id);
    await transactionManager.nativeUpdate(
      DylluMcpChangeProposal,
      { id: { $in: proposalIds }, status: "pending" },
      { status: "superseded", updated_at: input.occurredAt }
    );
    await this.createDylluMcpAuditEvents(
      pending.map((proposal) => ({
        id: generateEntityId(undefined, "mcpevt"),
        name: "proposal.superseded" as const,
        actor_id: input.actorId,
        target_id: input.productId,
        proposal_id: proposal.id,
        revision_id: null,
        request_id: input.requestId,
        details: {
          replacement_pending: true,
        },
        occurred_at: input.occurredAt,
      })),
      sharedContext
    );
    return proposalIds;
  }

  @InjectTransactionManager()
  protected async createCatalogProposal_(
    input: CreateCatalogProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const proposal = input.proposal;
    await this.supersedeCatalogProposals_(
      {
        actorId: proposal.actorId,
        productId: proposal.productId,
        requestId: input.requestId,
        occurredAt: proposal.createdAt,
      },
      sharedContext
    );
    await this.createDylluMcpChangeProposals(
      {
        id: proposal.id,
        kind: proposal.kind,
        status: proposal.status,
        actor_id: proposal.actorId,
        product_id: proposal.productId,
        product_title: proposal.productTitle,
        variant_id: proposal.variantId,
        price_id: proposal.priceId,
        currency_code: proposal.currencyCode,
        before_value: proposal.beforeValue,
        proposed_value: proposal.proposedValue,
        target_updated_at: proposal.targetUpdatedAt,
        content_hash: proposal.contentHash,
        reason: proposal.reason,
        source_revision_id: proposal.sourceRevisionId,
        expires_at: proposal.expiresAt,
      },
      sharedContext
    );
    await this.createDylluMcpAuditEvents(
      {
        id: generateEntityId(undefined, "mcpevt"),
        name: "proposal.created",
        actor_id: proposal.actorId,
        target_id: proposal.productId,
        proposal_id: proposal.id,
        revision_id: null,
        request_id: input.requestId,
        details: {
          kind: proposal.kind,
          content_hash: proposal.contentHash,
          source_revision_id: proposal.sourceRevisionId,
        },
        occurred_at: proposal.createdAt,
      },
      sharedContext
    );
  }

  @InjectManager()
  async createCatalogProposal(
    input: CreateCatalogProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.createCatalogProposal_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async closeCatalogProposal_(
    input: CloseCatalogProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to close an MCP proposal"
      );
    }
    const affected = await transactionManager.nativeUpdate(
      "dyllu_mcp_change_proposal",
      {
        id: input.proposalId,
        actor_id: input.actorId,
        product_id: input.productId,
        status: "pending",
      },
      {
        status: input.status,
        updated_at: input.occurredAt,
      }
    );
    if (affected !== 1) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP proposal is no longer pending"
      );
    }
    await this.createDylluMcpAuditEvents(
      {
        id: generateEntityId(undefined, "mcpevt"),
        name: `proposal.${input.status}`,
        actor_id: input.actorId,
        target_id: input.productId,
        proposal_id: input.proposalId,
        revision_id: null,
        request_id: input.requestId,
        details: { reason: input.reason },
        occurred_at: input.occurredAt,
      },
      sharedContext
    );
  }

  @InjectManager()
  async closeCatalogProposal(
    input: CloseCatalogProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.closeCatalogProposal_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async createOperationProposal_(
    input: CreateOperationProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const proposal = input.proposal;
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to create an MCP operation proposal"
      );
    }
    const pending = await this.listDylluMcpOperationProposals(
      {
        actor_id: proposal.actorId,
        target_key: proposal.targetKey,
        status: "pending",
      },
      {},
      sharedContext
    );
    if (pending.length > 0) {
      await transactionManager.nativeUpdate(
        "dyllu_mcp_operation_proposal",
        { id: { $in: pending.map((item) => item.id) }, status: "pending" },
        { status: "superseded", updated_at: proposal.createdAt }
      );
      await this.createDylluMcpAuditEvents(
        pending.map((item) => ({
          id: generateEntityId(undefined, "mcpevt"),
          name: "proposal.superseded" as const,
          actor_id: proposal.actorId,
          target_id: proposal.targetKey,
          proposal_id: item.id,
          revision_id: null,
          request_id: input.requestId,
          details: { replacement_pending: true },
          occurred_at: proposal.createdAt,
        })),
        sharedContext
      );
    }
    await this.createDylluMcpOperationProposals(
      {
        id: proposal.id,
        kind: proposal.kind,
        status: proposal.status,
        actor_id: proposal.actorId,
        target_type: proposal.targetType,
        target_id: proposal.targetId,
        target_key: proposal.targetKey,
        before_value: proposal.beforeValue,
        proposed_value: proposal.proposedValue,
        target_version: proposal.targetVersion,
        content_hash: proposal.contentHash,
        reason: proposal.reason,
        source_revision_id: proposal.sourceRevisionId,
        expires_at: proposal.expiresAt,
      },
      sharedContext
    );
    await this.createDylluMcpAuditEvents(
      {
        id: generateEntityId(undefined, "mcpevt"),
        name: "proposal.created",
        actor_id: proposal.actorId,
        target_id: proposal.targetKey,
        proposal_id: proposal.id,
        revision_id: null,
        request_id: input.requestId,
        details: {
          kind: proposal.kind,
          content_hash: proposal.contentHash,
          source_revision_id: proposal.sourceRevisionId,
        },
        occurred_at: proposal.createdAt,
      },
      sharedContext
    );
  }

  @InjectManager()
  async createOperationProposal(
    input: CreateOperationProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.createOperationProposal_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async closeOperationProposal_(
    input: CloseOperationProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to close an MCP operation proposal"
      );
    }
    const affected = await transactionManager.nativeUpdate(
      "dyllu_mcp_operation_proposal",
      {
        id: input.proposalId,
        actor_id: input.actorId,
        target_key: input.targetKey,
        status: "pending",
      },
      { status: input.status, updated_at: input.occurredAt }
    );
    if (affected !== 1) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP operation proposal is no longer pending"
      );
    }
    await this.createDylluMcpAuditEvents(
      {
        id: generateEntityId(undefined, "mcpevt"),
        name: `proposal.${input.status}`,
        actor_id: input.actorId,
        target_id: input.targetKey,
        proposal_id: input.proposalId,
        revision_id: null,
        request_id: input.requestId,
        details: { reason: input.reason },
        occurred_at: input.occurredAt,
      },
      sharedContext
    );
  }

  @InjectManager()
  async closeOperationProposal(
    input: CloseOperationProposalInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.closeOperationProposal_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async completeOperationChange_(
    input: CompleteOperationChangeInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A transaction manager is required to complete an MCP operation"
      );
    }
    const affected = await transactionManager.nativeUpdate(
      "dyllu_mcp_operation_proposal",
      {
        id: input.proposal.id,
        actor_id: input.actor.id,
        status: "pending",
        content_hash: input.proposal.contentHash,
      },
      { status: "applied", updated_at: input.confirmedAt }
    );
    if (affected !== 1) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The MCP operation proposal is no longer publishable"
      );
    }
    await this.createDylluMcpOperationRevisions(
      {
        id: input.revision.id,
        proposal_id: input.revision.proposalId,
        kind: input.revision.kind,
        action: input.revision.action,
        actor_id: input.revision.actor.id,
        actor_email: input.revision.actor.email,
        actor_name: input.revision.actor.name,
        target_type: input.revision.targetType,
        target_id: input.revision.targetId,
        target_key: input.revision.targetKey,
        before_value: input.revision.beforeValue,
        after_value: input.revision.afterValue,
        source_revision_id: input.revision.sourceRevisionId,
        reason: input.revision.reason,
        request_id: input.revision.requestId,
      },
      sharedContext
    );
    await this.createDylluMcpAuditEvents(
      [
        {
          id: input.confirmedEventId,
          name: "proposal.confirmed",
          actor_id: input.actor.id,
          target_id: input.proposal.targetKey,
          proposal_id: input.proposal.id,
          revision_id: null,
          request_id: input.revision.requestId,
          details: { content_hash: input.proposal.contentHash },
          occurred_at: input.confirmedAt,
        },
        {
          id: input.appliedEventId,
          name: "proposal.applied",
          actor_id: input.actor.id,
          target_id: input.revision.targetKey,
          proposal_id: input.proposal.id,
          revision_id: input.revision.id,
          request_id: input.revision.requestId,
          details: {
            action: input.revision.action,
            source_revision_id: input.revision.sourceRevisionId,
          },
          occurred_at: input.revision.createdAt,
        },
      ],
      sharedContext
    );
    return input.revision;
  }

  @InjectManager()
  async completeOperationChange(
    input: CompleteOperationChangeInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.completeOperationChange_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async replaceCapabilityGrants_(
    input: {
      actorId: string;
      userId: string;
      capabilities: Capability[];
      requestId: string;
      occurredAt: Date;
    },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const current = await this.listDylluMcpCapabilityGrants(
      { user_id: input.userId },
      {},
      sharedContext
    );
    const requested = new Set(input.capabilities);
    const currentCapabilities = new Set(
      current.map((grant) => grant.capability)
    );
    const removedIds = current
      .filter((grant) => !requested.has(grant.capability))
      .map((grant) => grant.id);
    const added = input.capabilities.filter(
      (capability) => !currentCapabilities.has(capability)
    );

    if (removedIds.length > 0) {
      await this.deleteDylluMcpCapabilityGrants(removedIds, sharedContext);
    }
    if (added.length > 0) {
      await this.createDylluMcpCapabilityGrants(
        added.map((capability) => ({
          id: generateEntityId(undefined, "mcpgrant"),
          user_id: input.userId,
          capability,
          granted_by: input.actorId,
        })),
        sharedContext
      );
    }
    await this.createDylluMcpAuditEvents(
      {
        id: generateEntityId(undefined, "mcpevt"),
        name: "capabilities.updated",
        actor_id: input.actorId,
        target_id: input.userId,
        proposal_id: null,
        revision_id: null,
        request_id: input.requestId,
        details: {
          before: [...currentCapabilities].sort().join(","),
          after: [...requested].sort().join(","),
        },
        occurred_at: input.occurredAt,
      },
      sharedContext
    );
  }

  @InjectManager()
  async replaceCapabilityGrants(
    input: {
      actorId: string;
      userId: string;
      capabilities: Capability[];
      requestId: string;
      occurredAt: Date;
    },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return this.replaceCapabilityGrants_(input, sharedContext);
  }
}

export default DylluMcpGovernanceModuleService;
