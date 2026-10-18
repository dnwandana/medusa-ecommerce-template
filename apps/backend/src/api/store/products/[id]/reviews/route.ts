import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IOrderModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { isSizeOption } from "../../../../../lib/option-names"
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

type VariantOption = { value: string; option?: { title: string } | null }

// Returns the value of the size option, or null when the variant has no size option.
export function reviewSize(options: VariantOption[] | null | undefined): string | null {
  const size = (options ?? []).find((option) => option.option && isSizeOption(option.option.title))
  return size ? size.value : null
}

// Returns the size of the purchased variant for each line item id. The route makes two calls for
// one page of reviews, not one call for each review. A deleted variant gives no entry.
async function sizesByLineItem(
  req: MedusaRequest,
  lineItemIds: string[]
): Promise<Map<string, string | null>> {
  const sizes = new Map<string, string | null>()
  if (lineItemIds.length === 0) {
    return sizes
  }

  const orderModule: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const lineItems = await orderModule.listOrderLineItems(
    { id: lineItemIds },
    { select: ["id", "variant_id"] }
  )
  const variantIds = [
    ...new Set(lineItems.map((item) => item.variant_id).filter((id): id is string => !!id)),
  ]
  if (variantIds.length === 0) {
    return sizes
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "options.value", "options.option.title"],
    filters: { id: variantIds },
  })
  const sizeByVariant = new Map(
    variants.map((variant: any) => [variant.id as string, reviewSize(variant.options)])
  )
  for (const item of lineItems) {
    if (item.variant_id && sizeByVariant.has(item.variant_id)) {
      sizes.set(item.id, sizeByVariant.get(item.variant_id) ?? null)
    }
  }
  return sizes
}

// Returns a page of the approved reviews of a product, newest first, and the average rating of
// all approved reviews of the product.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const reviewService: ProductReviewModuleService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  // The route ignores req.queryConfig.fields, so a request cannot select a private field.
  const { data, metadata } = await query.graph({
    entity: "review",
    // The route reads the line item id for the size, but does not send it.
    fields: [...PUBLIC_REVIEW_FIELDS, "order_line_item_id"],
    filters: { product_id: req.params.id, status: "approved" },
    pagination: {
      skip: req.queryConfig.pagination.skip,
      take: req.queryConfig.pagination.take,
      order: { created_at: "DESC" },
    },
  })

  // The Query can add keys that the request did not ask for. Copy only the public fields.
  const sizes = await sizesByLineItem(
    req,
    data.map((review: Record<string, unknown>) => review.order_line_item_id as string)
  )
  const reviews = data.map((review: Record<string, unknown>) => ({
    ...Object.fromEntries(PUBLIC_REVIEW_FIELDS.map((field) => [field, review[field]])),
    size: sizes.get(review.order_line_item_id as string) ?? null,
  }))

  const average_rating = await reviewService.getAverageRating(req.params.id)

  res.json({
    reviews,
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? req.queryConfig.pagination.take,
    offset: metadata?.skip ?? req.queryConfig.pagination.skip,
    average_rating,
  })
}
