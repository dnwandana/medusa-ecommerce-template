import { validateAndTransformQuery, type MiddlewareRoute } from "@medusajs/framework/http"
import { GetStorePaymentStatesSchema } from "./route"

// The route needs only the publishable API key, because a guest reads the state with the order id.
export const storePaymentStateRoutes: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/payment-states",
    middlewares: [validateAndTransformQuery(GetStorePaymentStatesSchema, {})],
  },
]
