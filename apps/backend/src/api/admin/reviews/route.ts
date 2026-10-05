import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const GetAdminReviewsSchema = createFindParams({ limit: 20, offset: 0 }).merge(
  z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() })
)

export const ADMIN_REVIEW_FIELDS = [
  "id",
  "product_id",
  "customer_id",
  "order_line_item_id",
  "rating",
  "title",
  "content",
  "first_name",
  "last_name",
  "status",
  "created_at",
  "updated_at",
  "product.id",
  "product.title",
]

// Returns a page of the reviews of each status, or of one status, with the product of each review.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const status = req.filterableFields.status
  const filters = status ? { status } : {}

  const { data, metadata } = await query.graph({
    entity: "review",
    ...req.queryConfig,
    filters,
    pagination: {
      ...req.queryConfig.pagination,
      order: req.queryConfig.pagination.order ?? { created_at: "DESC" },
    },
  })

  res.json({
    reviews: data,
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? req.queryConfig.pagination.take,
    offset: metadata?.skip ?? req.queryConfig.pagination.skip,
  })
}
