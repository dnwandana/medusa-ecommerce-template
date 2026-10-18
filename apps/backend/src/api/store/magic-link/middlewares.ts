import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { PostStoreMagicLinkSchema } from "./route"
import { PostStoreMagicLinkSessionSchema } from "./session/route"
import { PostStoreMagicLinkStatusSchema } from "./status/route"
import { PostStoreMagicLinkTokenSchema } from "./verify/route"

// The middlewares of the routes below /store/magic-link. The routes need only the publishable API
// key, because the customer is not signed in yet.
export const storeMagicLinkRoutes: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/magic-link",
    middlewares: [validateAndTransformBody(PostStoreMagicLinkSchema)],
  },
  {
    method: ["POST"],
    matcher: "/store/magic-link/verify",
    middlewares: [validateAndTransformBody(PostStoreMagicLinkTokenSchema)],
  },
  {
    method: ["POST"],
    matcher: "/store/magic-link/confirm",
    middlewares: [validateAndTransformBody(PostStoreMagicLinkTokenSchema)],
  },
  {
    method: ["POST"],
    matcher: "/store/magic-link/status",
    middlewares: [validateAndTransformBody(PostStoreMagicLinkStatusSchema)],
  },
  {
    method: ["POST"],
    matcher: "/store/magic-link/session",
    middlewares: [validateAndTransformBody(PostStoreMagicLinkSessionSchema)],
  },
]
