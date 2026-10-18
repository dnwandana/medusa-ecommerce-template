import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { PostStoreReceiptSchema } from "./route"

// The upload needs only the publishable API key, because a guest uploads with the order id. The
// body has the file as base64. A file of 5 MB is about 6.7 MB of base64, so the limit is 7 MB.
export const storeReceiptRoutes: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/orders/:id/receipts",
    bodyParser: { sizeLimit: "7mb" },
    middlewares: [validateAndTransformBody(PostStoreReceiptSchema)],
  },
]
