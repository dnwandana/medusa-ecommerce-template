import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { removeWishlistItemWorkflow } from "../../../../../../../workflows/remove-wishlist-item"

// Removes an item from the wishlist of the logged-in customer. Medusa requires a customer token
// for each route below /store/customers/me, so this route needs no entry in middlewares.ts.
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  await removeWishlistItemWorkflow(req.scope).run({
    input: { customer_id: req.auth_context.actor_id, item_id: req.params.id },
  })

  res.json({ id: req.params.id, object: "wishlist_item", deleted: true })
}
