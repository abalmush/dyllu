import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  createPriceListPricesWorkflow,
  updatePriceListPricesWorkflow,
  removePriceListPricesWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { SalePricePlan } from "../domain/plan-sale-price-change";

/**
 * upsertVariantPricesWorkflow's internal step chain (remote-query step ->
 * transform -> updatePriceSetsStep) does not reliably execute in full when
 * nested via .run() inside another step — confirmed by live testing against
 * a real Medusa instance: the call reports zero errors but the price is left
 * unchanged. Resolving the price set and calling the Pricing module directly
 * avoids nesting a multi-step workflow inside this step.
 */
async function upsertRegularPrice(
  container: MedusaContainer,
  variantId: string,
  priceId: string,
  amount: number
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pricing = container.resolve(Modules.PRICING);
  const { data: links } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set_id"],
    filters: { variant_id: [variantId] },
  });
  const priceSetId = links[0]?.price_set_id;
  if (!priceSetId) {
    throw new Error(`No price set found for variant ${variantId}`);
  }
  await pricing.upsertPriceSets([
    {
      id: priceSetId,
      prices: [{ id: priceId, amount, currency_code: "mdl" }],
    },
  ]);
}

export type ApplyOneCUpdatesInput = {
  variantId: string;
  productId: string;
  price: { priceId: string; previousAmount: number; newAmount: number } | null;
  salePlan: SalePricePlan;
  salePreviousAmount: number | null;
  salePriceListId: string;
  stock:
    | {
        inventoryItemId: string;
        locationId: string;
        previousQuantity: number;
        newQuantity: number;
      }
    | null;
};

const updateRegularPriceStep = createStep(
  "update-one-c-regular-price",
  async (
    input: NonNullable<ApplyOneCUpdatesInput["price"]> & {
      variantId: string;
      productId: string;
    },
    { container }
  ) => {
    await upsertRegularPrice(container, input.variantId, input.priceId, input.newAmount);
    return new StepResponse(null, input);
  },
  async (input, { container }) => {
    if (!input) return;
    await upsertRegularPrice(
      container,
      input.variantId,
      input.priceId,
      input.previousAmount
    );
  }
);

type SalePriceStepInput = {
  salePlan: SalePricePlan;
  salePriceListId: string;
  salePreviousAmount: number | null;
  variantId: string;
};

type SalePriceCompensationData = SalePriceStepInput & {
  createdPriceId: string | null;
};

const updateSalePriceStep = createStep(
  "update-one-c-sale-price",
  async (input: SalePriceStepInput, { container }) => {
    const { salePlan, salePriceListId, variantId } = input;
    if (salePlan.action === "none") {
      return new StepResponse(null, { ...input, createdPriceId: null });
    }
    if (salePlan.action === "create") {
      const { result } = await createPriceListPricesWorkflow(container).run({
        input: {
          data: [
            {
              id: salePriceListId,
              prices: [
                {
                  amount: salePlan.amount,
                  currency_code: "mdl",
                  variant_id: variantId,
                },
              ],
            },
          ],
        },
      });
      return new StepResponse(null, {
        ...input,
        createdPriceId: result[0]?.id ?? null,
      });
    }
    if (salePlan.action === "update") {
      await updatePriceListPricesWorkflow(container).run({
        input: {
          data: [
            {
              id: salePriceListId,
              prices: [
                {
                  id: salePlan.priceId,
                  amount: salePlan.amount,
                  currency_code: "mdl",
                  variant_id: variantId,
                },
              ],
            },
          ],
        },
      });
      return new StepResponse(null, { ...input, createdPriceId: null });
    }
    await removePriceListPricesWorkflow(container).run({
      input: { ids: [salePlan.priceId] },
    });
    return new StepResponse(null, { ...input, createdPriceId: null });
  },
  async (data: SalePriceCompensationData | undefined, { container }) => {
    if (!data || data.salePlan.action === "none") return;
    const { salePlan, salePriceListId, variantId, createdPriceId, salePreviousAmount } =
      data;
    if (salePlan.action === "create" && createdPriceId) {
      await removePriceListPricesWorkflow(container).run({
        input: { ids: [createdPriceId] },
      });
    } else if (salePlan.action === "update" && salePreviousAmount !== null) {
      await updatePriceListPricesWorkflow(container).run({
        input: {
          data: [
            {
              id: salePriceListId,
              prices: [
                {
                  id: salePlan.priceId,
                  amount: salePreviousAmount,
                  currency_code: "mdl",
                  variant_id: variantId,
                },
              ],
            },
          ],
        },
      });
    } else if (salePlan.action === "remove" && salePreviousAmount !== null) {
      await createPriceListPricesWorkflow(container).run({
        input: {
          data: [
            {
              id: salePriceListId,
              prices: [
                {
                  amount: salePreviousAmount,
                  currency_code: "mdl",
                  variant_id: variantId,
                },
              ],
            },
          ],
        },
      });
    }
  }
);

const updateStockStep = createStep(
  "update-one-c-stock",
  async (
    input: NonNullable<ApplyOneCUpdatesInput["stock"]>,
    { container }
  ) => {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: [
          {
            inventory_item_id: input.inventoryItemId,
            location_id: input.locationId,
            stocked_quantity: input.newQuantity,
          },
        ],
      },
    });
    return new StepResponse(null, input);
  },
  async (input, { container }) => {
    if (!input) return;
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: [
          {
            inventory_item_id: input.inventoryItemId,
            location_id: input.locationId,
            stocked_quantity: input.previousQuantity,
          },
        ],
      },
    });
  }
);

export const applyOneCUpdatesWorkflow = createWorkflow(
  "apply-one-c-updates",
  (input: ApplyOneCUpdatesInput) => {
    // Medusa's workflow composer evaluates `input` fields lazily; plain JS
    // `if`/spread on them does not carry through to steps as expected
    // (confirmed by live testing: merged extra keys arrived as undefined).
    // `when().then()` and `transform()` are the SDK's documented mechanism
    // for conditionals and for combining input fields into a step's input.
    when(input, (data) => Boolean(data.price)).then(() => {
      const priceInput = transform({ input }, (data) => ({
        priceId: data.input.price!.priceId,
        previousAmount: data.input.price!.previousAmount,
        newAmount: data.input.price!.newAmount,
        variantId: data.input.variantId,
        productId: data.input.productId,
      }));
      updateRegularPriceStep(priceInput);
    });

    const saleInput = transform({ input }, (data) => ({
      salePlan: data.input.salePlan,
      salePriceListId: data.input.salePriceListId,
      salePreviousAmount: data.input.salePreviousAmount,
      variantId: data.input.variantId,
    }));
    updateSalePriceStep(saleInput);

    when(input, (data) => Boolean(data.stock)).then(() => {
      const stockInput = transform({ input }, (data) => data.input.stock!);
      updateStockStep(stockInput);
    });

    return new WorkflowResponse(null);
  }
);
