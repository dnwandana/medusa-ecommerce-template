import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import {
  listReviewableItems,
  OrderForReview,
  REVIEW_ORDER_FIELDS,
} from "../../../../../modules/product-review/reviewable"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"

// Lists the shipped items of the logged-in customer that have no review. The rules are in
// reviewable.ts. Medusa requires a customer token for each route below /store/customers/me.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const customerId = req.auth_context.actor_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: REVIEW_ORDER_FIELDS,
    filters: { customer_id: customerId },
    pagination: { order: { created_at: "DESC" } },
  })

  const reviewService: ProductReviewModuleService = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const reviews = await reviewService.listReviews({ customer_id: customerId })
  const reviewedItemIds = reviews.map((review) => review.order_line_item_id)

  // The Query types do not match the types of reviewable.ts, so cast the result.
  res.json({ items: listReviewableItems(orders as unknown as OrderForReview[], reviewedItemIds) })
}
