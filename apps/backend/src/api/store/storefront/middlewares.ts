import { validateAndTransformQuery, type MiddlewareRoute } from "@medusajs/framework/http"
import { GetStoreCatalogFiltersSchema } from "./catalog/filters/route"
import { GetStoreCatalogProductsSchema } from "./catalog/products/route"

// The middlewares of the routes below /store/storefront. The routes are public and need only the
// publishable API key.
export const storeStorefrontRoutes: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/storefront/catalog/filters",
    middlewares: [validateAndTransformQuery(GetStoreCatalogFiltersSchema, {})],
  },
  {
    method: ["GET"],
    matcher: "/store/storefront/catalog/products",
    middlewares: [validateAndTransformQuery(GetStoreCatalogProductsSchema, {})],
  },
]
