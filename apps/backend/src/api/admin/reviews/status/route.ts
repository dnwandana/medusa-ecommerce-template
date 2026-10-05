import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { updateReviewStatusWorkflow } from "../../../../workflows/update-review-status"

// The schema does not accept the status "pending". A review cannot go back to pending.
export const PostAdminReviewStatusSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1),
    status: z.enum(["approved", "rejected"]),
  })
  .strict()

export type PostAdminReviewStatusBody = z.infer<typeof PostAdminReviewStatusSchema>

// Approves or rejects the reviews. The error handler of Medusa changes the errors of the workflow
// into the error responses.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminReviewStatusBody>,
  res: MedusaResponse
): Promise<void> => {
  const { result } = await updateReviewStatusWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ reviews: result.reviews })
}
