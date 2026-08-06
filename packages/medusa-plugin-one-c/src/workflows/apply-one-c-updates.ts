import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  upsertVariantPricesWorkflow,
  createPriceListPricesWorkflow,
  updatePriceListPricesWorkflow,
  removePriceListPricesWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/core-flows";

import { SalePricePlan } from "../domain/plan-sale-price-change";

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
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices: [
          {
            variant_id: input.variantId,
            product_id: input.productId,
            prices: [{ id: input.priceId, amount: input.newAmount }],
          },
        ],
        previousVariantIds: [],
      },
    });
    return new StepResponse(null, input);
  },
  async (input, { container }) => {
    if (!input) return;
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices: [
          {
            variant_id: input.variantId,
            product_id: input.productId,
            prices: [{ id: input.priceId, amount: input.previousAmount }],
          },
        ],
        previousVariantIds: [],
      },
    });
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
    if (input.price) {
      updateRegularPriceStep({
        ...input.price,
        variantId: input.variantId,
        productId: input.productId,
      });
    }
    updateSalePriceStep({
      salePlan: input.salePlan,
      salePriceListId: input.salePriceListId,
      salePreviousAmount: input.salePreviousAmount,
      variantId: input.variantId,
    });
    if (input.stock) {
      updateStockStep(input.stock);
    }
    return new WorkflowResponse(null);
  }
);
