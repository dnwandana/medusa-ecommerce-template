import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { ADMIN_REVIEW_FIELDS, GetAdminReviewsSchema } from "./admin/reviews/route"
import { PostAdminReviewStatusSchema } from "./admin/reviews/status/route"
import { PostWishlistItemSchema } from "./store/customers/me/wishlist/items/route"
import { GetStoreReviewsSchema } from "./store/products/[id]/reviews/route"
import { PostStoreReviewSchema } from "./store/reviews/route"

export default defineMiddlewares({
  routes: [
    // Only a logged-in customer can submit a review.
    {
      method: ["POST"],
      matcher: "/store/reviews",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostStoreReviewSchema),
      ],
    },
    // A public route. It needs only the publishable API key.
    {
      method: ["GET"],
      matcher: "/store/products/:id/reviews",
      middlewares: [
        validateAndTransformQuery(GetStoreReviewsSchema, {
          isList: true,
          defaults: ["id"],
        }),
      ],
    },
    // Medusa lets only a logged-in admin user use a route below /admin.
    {
      method: ["GET"],
      matcher: "/admin/reviews",
      middlewares: [
        validateAndTransformQuery(GetAdminReviewsSchema, {
          isList: true,
          defaults: ADMIN_REVIEW_FIELDS,
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/reviews/status",
      middlewares: [validateAndTransformBody(PostAdminReviewStatusSchema)],
    },
    // Medusa lets only a logged-in customer use a route below /store/customers/me.
    {
      method: ["POST"],
      matcher: "/store/customers/me/wishlist/items",
      middlewares: [validateAndTransformBody(PostWishlistItemSchema)],
    },
  ],
})
