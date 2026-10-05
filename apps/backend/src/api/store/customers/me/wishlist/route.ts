import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import type WishlistModuleService from "../../../../../modules/wishlist/service"

// The store has one region with the currency idr.
const CURRENCY_CODE = "idr"

const VARIANT_FIELDS = [
  "id",
  "title",
  "sku",
  "calculated_price.*",
  "product.id",
  "product.title",
  "product.handle",
  "product.thumbnail",
]

type WishlistVariant = {
  id: string
  title: string | null
  sku: string | null
  calculated_price?: unknown
  product?: { id: string; title: string; handle: string; thumbnail: string | null } | null
}

// Returns the wishlist of the logged-in customer with the variant, the product, and the price of
// each item. Medusa requires a customer token for each route below /store/customers/me.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)
  const [wishlist] = await wishlistService.listWishlists(
    { customer_id: req.auth_context.actor_id },
    { relations: ["items"] }
  )

  // A read creates no wishlist. The first add creates it.
  if (!wishlist) {
    res.json({ wishlist: { id: null, items: [] } })
    return
  }

  const items = [...(wishlist.items ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  if (!items.length) {
    res.json({ wishlist: { id: wishlist.id, items: [] } })
    return
  }

  // The price of a variant needs a pricing context, so the route reads the variants in a second
  // query on the entity variant.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: VARIANT_FIELDS,
    filters: { id: items.map((item) => item.product_variant_id) },
    context: { calculated_price: QueryContext({ currency_code: CURRENCY_CODE }) },
  })

  const variantsById = new Map(
    (variants as unknown as WishlistVariant[]).map((variant) => [variant.id, variant])
  )

  // The Query returns no deleted variant. An item without its variant or product is not shown.
  const result = items.flatMap((item) => {
    const variant = variantsById.get(item.product_variant_id)
    if (!variant?.product) {
      return []
    }
    return [
      {
        id: item.id,
        product_variant_id: item.product_variant_id,
        product_variant: {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          calculated_price: variant.calculated_price ?? null,
          product: {
            id: variant.product.id,
            title: variant.product.title,
            handle: variant.product.handle,
            thumbnail: variant.product.thumbnail,
          },
        },
      },
    ]
  })

  res.json({ wishlist: { id: wishlist.id, items: result } })
}
