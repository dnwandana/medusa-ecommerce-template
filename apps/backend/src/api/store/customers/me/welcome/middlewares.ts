import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { PostStoreWelcomeSchema } from "./route"

// Medusa already authenticates each route below /store/customers/me.
export const storeWelcomeRoutes: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers/me/welcome",
    middlewares: [validateAndTransformBody(PostStoreWelcomeSchema)],
  },
]
