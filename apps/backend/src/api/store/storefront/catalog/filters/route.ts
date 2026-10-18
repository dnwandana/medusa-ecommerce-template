import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  buildCatalogFilters,
  containsPattern,
  idList,
  type FilterProduct,
} from "../../../../../lib/catalog-filters"

export const GetStoreCatalogFiltersSchema = z
  .object({
    category_id: idList,
    q: z.string().trim().min(1).optional(),
  })
  .strict()

export type GetStoreCatalogFiltersQuery = z.infer<typeof GetStoreCatalogFiltersSchema>

// Returns the size, colour and fabric values of the published products of a list of categories,
// or of all products when the request has no category_id. A product in one of the categories
// matches. The storefront sends a category with its descendants. q matches a part of the title
// and ignores the case. The template has one sales channel, so the route does not filter by
// sales channel. The route needs only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { category_id, q } = req.validatedQuery as GetStoreCatalogFiltersQuery

  const filters: Record<string, unknown> = { status: "published" }
  if (category_id.length > 0) {
    filters.categories = { id: category_id }
  }
  if (q) {
    filters.title = { $ilike: containsPattern(q) }
  }

  const { data } = await query.graph({
    entity: "product",
    fields: ["options.title", "options.values.id", "options.values.value", "tags.id", "tags.value"],
    filters,
  })

  res.json(buildCatalogFilters(data as FilterProduct[]))
}
