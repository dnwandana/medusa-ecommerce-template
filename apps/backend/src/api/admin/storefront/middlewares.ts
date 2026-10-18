import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { PostAdminColourUpdateSchema } from "./colours/[id]/route"
import { PostAdminColourSchema } from "./colours/route"
import { PostAdminStorefrontSettingsSchema } from "./settings/route"

// Medusa lets only a logged-in admin user use a route below /admin.
export const adminStorefrontRoutes: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/storefront/settings",
    middlewares: [validateAndTransformBody(PostAdminStorefrontSettingsSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/storefront/colours",
    middlewares: [validateAndTransformBody(PostAdminColourSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/storefront/colours/:id",
    middlewares: [validateAndTransformBody(PostAdminColourUpdateSchema)],
  },
]
