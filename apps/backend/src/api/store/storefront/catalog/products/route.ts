import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { containsPattern, idList } from "../../../../../lib/catalog-filters"
import {
  CATALOG_SORTS,
  matchesFilters,
  orderProductIds,
  type ListedProduct,
} from "../../../../../lib/catalog-price"

export const GetStoreCatalogProductsSchema = z
  .object({
    region_id: z.string().min(1),
    category_id: idList,
    q: z.string().trim().min(1).optional(),
    size: idList,
    colour: idList,
    fabric: idList,
    price_from: z.coerce.number().int().min(0).optional(),
    price_to: z.coerce.number().int().min(0).optional(),
    sort: z.enum(CATALOG_SORTS).default("newest"),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()

export type GetStoreCatalogProductsQuery = z.infer<typeof GetStoreCatalogProductsSchema>

// The fields that the filters and the sort need.
const LIST_FIELDS = [
  "id",
  "created_at",
  "options.values.id",
  "tags.id",
  "variants.calculated_price.calculated_amount",
]

// The fields of a product card, as the Store API gives them.
const CARD_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "created_at",
  "metadata",
  "tags.id",
  "tags.value",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
  "images.id",
  "images.url",
  "images.rank",
  "variants.id",
  "variants.title",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.id",
  "variants.options.value",
  "variants.options.option_id",
  "variants.calculated_price.*",
]

type CardVariant = { id: string; manage_inventory?: boolean | null; [key: string]: unknown }
type CardProduct = { id: string; variants?: CardVariant[] | null; [key: string]: unknown }

// Returns one page of the published products of a list of categories, or of all products, with
// the filters and the sort applied. A product in one of the categories matches. The Store API
// cannot filter or sort by the calculated price, so the route reads the price of each product in
// the list and sorts the list in memory.
// Known limit: the route gets slow above about 1,000 products in one list.
// The template has one sales channel, so the route does not filter by sales channel. The route
// needs only the publishable API key.
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const params = req.validatedQuery as GetStoreCatalogProductsQuery

  const {
    data: [region],
  } = await query.graph({
    entity: "region",
    fields: ["currency_code"],
    filters: { id: params.region_id },
  })
  if (!region) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `The region ${params.region_id} was not found.`
    )
  }
  const context = {
    variants: {
      calculated_price: QueryContext({
        region_id: params.region_id,
        currency_code: region.currency_code,
      }),
    },
  }

  const filters: Record<string, unknown> = { status: "published" }
  if (params.category_id.length > 0) {
    filters.categories = { id: params.category_id }
  }
  if (params.q) {
    filters.title = { $ilike: containsPattern(params.q) }
  }
  const { data: listed } = await query.graph({
    entity: "product",
    fields: LIST_FIELDS,
    filters,
    context,
  })

  const ids = orderProductIds(
    (listed as ListedProduct[]).filter((product) =>
      matchesFilters(product, { size: params.size, colour: params.colour, fabric: params.fabric })
    ),
    { from: params.price_from, to: params.price_to, sort: params.sort }
  )
  const pageIds = ids.slice(params.offset, params.offset + params.limit)

  const products = pageIds.length > 0 ? await readCards(req, pageIds, context) : []

  res.json({ products, count: ids.length, limit: params.limit, offset: params.offset })
}

// Reads the card fields of the page and adds the stock of each variant. The result keeps the
// order of the ids.
async function readCards(
  req: MedusaStoreRequest,
  ids: string[],
  context: Record<string, unknown>
): Promise<CardProduct[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: CARD_FIELDS,
    filters: { id: ids },
    context,
  })
  const byId = new Map((data as CardProduct[]).map((product) => [product.id, product]))
  const products = ids.flatMap((id) => byId.get(id) ?? [])

  // The stock comes from the first sales channel of the publishable API key, as in the Store API.
  const variants = products.flatMap((product) => product.variants ?? [])
  const salesChannelId = req.publishable_key_context?.sales_channel_ids?.[0]
  let availability: Awaited<ReturnType<typeof getVariantAvailability>> = {}
  if (salesChannelId && variants.length > 0) {
    // The workspace has two copies of @medusajs/types, so the Query type needs a cast.
    availability = await getVariantAvailability(
      query as Parameters<typeof getVariantAvailability>[0],
      { variant_ids: variants.map(({ id }) => id), sales_channel_id: salesChannelId }
    )
  }
  for (const variant of variants) {
    // A variant that does not track stock has no stock quantity.
    variant.inventory_quantity = variant.manage_inventory
      ? (availability[variant.id]?.availability ?? null)
      : null
  }

  return products
}
