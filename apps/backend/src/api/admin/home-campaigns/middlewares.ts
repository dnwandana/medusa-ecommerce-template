import {
  validateAndTransformBody,
  validateAndTransformQuery,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { GetAdminHomeCampaignsSchema, PostAdminHomeCampaignSchema } from "./route"

// Medusa lets only a logged-in admin user use a route below /admin.
export const adminHomeCampaignRoutes: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/home-campaigns",
    middlewares: [validateAndTransformQuery(GetAdminHomeCampaignsSchema, { isList: true })],
  },
  {
    method: ["POST"],
    matcher: "/admin/home-campaigns",
    middlewares: [validateAndTransformBody(PostAdminHomeCampaignSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/home-campaigns/:id",
    middlewares: [validateAndTransformBody(PostAdminHomeCampaignSchema)],
  },
]
