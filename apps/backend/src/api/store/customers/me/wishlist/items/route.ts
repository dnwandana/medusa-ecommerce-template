import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { addWishlistItemWorkflow } from "../../../../../../workflows/add-wishlist-item"

// The schema is strict, so the body cannot name a customer. The customer comes from the token.
export const PostWishlistItemSchema = z.object({ variant_id: z.string().min(1) }).strict()

export type PostWishlistItemBody = z.infer<typeof PostWishlistItemSchema>

// Adds a variant to the wishlist of the logged-in customer. Medusa requires a customer token for
// each route below /store/customers/me.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostWishlistItemBody>,
  res: MedusaResponse
): Promise<void> => {
  const { result } = await addWishlistItemWorkflow(req.scope).run({
    input: { customer_id: req.auth_context.actor_id, variant_id: req.validatedBody.variant_id },
  })

  res.json({ wishlist_item: result.wishlist_item })
}
