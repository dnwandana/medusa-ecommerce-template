import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import type ProductReviewModuleService from "../../modules/product-review/service"
import {
  findOrderItem,
  OrderForReview,
  REVIEW_ORDER_FIELDS,
  shippedQuantity,
} from "../../modules/product-review/reviewable"

export type ValidateReviewItemInput = { customer_id: string; order_line_item_id: string }
export type ValidatedReviewItem = { product_id: string; first_name: string; last_name: string }

// Makes sure that the customer bought the item, that the store shipped it, and that it has no review.
export const validateReviewItemStep = createStep(
  "validate-review-item",
  async (
    input: ValidateReviewItemInput,
    { container }
  ): Promise<StepResponse<ValidatedReviewItem>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: REVIEW_ORDER_FIELDS,
      filters: { customer_id: input.customer_id },
    })

    const item = findOrderItem(orders as unknown as OrderForReview[], input.order_line_item_id)
    if (!item || !item.product_id) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "The order item was not found.")
    }

    if (shippedQuantity(item) <= 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You can review this item after the store ships it."
      )
    }

    const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)
    const existing = await reviewService.listReviews({
      order_line_item_id: input.order_line_item_id,
    })
    if (existing.length > 0) {
      throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "You already reviewed this item.")
    }

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["first_name", "last_name"],
      filters: { id: input.customer_id },
    })
    const customer = customers[0]

    // The step writes nothing, so it has no compensation function.
    return new StepResponse({
      product_id: item.product_id,
      first_name: customer?.first_name ?? "",
      last_name: customer?.last_name ?? "",
    })
  }
)
