import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"

export const GetStoreReviewsSchema = createFindParams({ limit: 10, offset: 0 })

// The storefront gets only these fields. The customer id and the order line item id stay private.
const PUBLIC_REVIEW_FIELDS = [
  "id",
  "product_id",
  "rating",
  "title",
  "content",
  "first_name",
  "last_name",
  "created_at",
]

// Returns a page of the approved reviews of a product, newest first, and the average rating of
// all approved reviews of the product.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const reviewService: ProductReviewModuleService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  // The route ignores req.queryConfig.fields, so a request cannot select a private field.
  const { data, metadata } = await query.graph({
    entity: "review",
    fields: PUBLIC_REVIEW_FIELDS,
    filters: { product_id: req.params.id, status: "approved" },
    pagination: {
      skip: req.queryConfig.pagination.skip,
      take: req.queryConfig.pagination.take,
      order: { created_at: "DESC" },
    },
  })

  // The Query can add keys that the request did not ask for. Copy only the public fields.
  const reviews = data.map((review: Record<string, unknown>) =>
    Object.fromEntries(PUBLIC_REVIEW_FIELDS.map((field) => [field, review[field]]))
  )

  const average_rating = await reviewService.getAverageRating(req.params.id)

  res.json({
    reviews,
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? req.queryConfig.pagination.take,
    offset: metadata?.skip ?? req.queryConfig.pagination.skip,
    average_rating,
  })
}
