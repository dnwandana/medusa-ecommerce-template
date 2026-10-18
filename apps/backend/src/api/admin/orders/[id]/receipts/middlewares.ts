import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { PostAdminAskForMoreSchema } from "./ask-for-more/route"

// The middlewares of the routes below /admin/orders/:id/receipts. Medusa lets only a logged-in
// admin user use a route below /admin.
export const adminReceiptRoutes: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/orders/:id/receipts/ask-for-more",
    middlewares: [validateAndTransformBody(PostAdminAskForMoreSchema)],
  },
]
