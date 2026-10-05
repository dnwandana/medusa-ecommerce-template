import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { createReviewWorkflow } from "../../../workflows/create-review"

// The schema is strict and does not change a rating from text to a number.
export const PostStoreReviewSchema = z
  .object({
    order_line_item_id: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(200).optional(),
    content: z.string().trim().min(1).max(5000),
  })
  .strict()

export type PostStoreReviewBody = z.infer<typeof PostStoreReviewSchema>

// Creates a pending review for an item of the logged-in customer. The error handler of Medusa
// changes the errors of the workflow into the error responses.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreReviewBody>,
  res: MedusaResponse
): Promise<void> => {
  const { result } = await createReviewWorkflow(req.scope).run({
    input: { ...req.validatedBody, customer_id: req.auth_context.actor_id },
  })

  res.json({ review: result.review })
}
