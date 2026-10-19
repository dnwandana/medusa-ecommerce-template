import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  buildHomeCategories,
  isHomeCategory,
  type TileCategory,
  type TileProduct,
} from "../../../../lib/home-categories"

// Returns the categories that staff show on the home page, in rank order, with a tile image.
// The route makes two database calls at most, not one call for each category. The route needs
// only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // An inactive or internal category never shows, even with show_on_home. The locale gives the
  // translated category name.
  const { data: categories } = await query.graph(
    {
      entity: "product_category",
      fields: ["id", "name", "handle", "rank", "metadata"],
      filters: { is_active: true, is_internal: false },
    },
    { locale: req.locale }
  )
  const homeCategories = (categories as TileCategory[]).filter(isHomeCategory)
  if (homeCategories.length === 0) {
    res.json({ categories: [] })
    return
  }

  // The generated filter type of a product has no categories key, but Query accepts it. The
  // product fields are not translatable, so this call has no locale.
  const filters: Record<string, unknown> = {
    categories: { id: homeCategories.map(({ id }) => id) },
    status: "published",
  }
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["thumbnail", "created_at", "categories.id"],
    filters,
  })

  res.json({ categories: buildHomeCategories(homeCategories, products as TileProduct[]) })
}
