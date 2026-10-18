import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { MAGIC_LINK_MODULE } from "../../../../modules/magic-link"
import type MagicLinkModuleService from "../../../../modules/magic-link/service"

export const PostStoreMagicLinkStatusSchema = z
  .object({ id: z.string().min(1).max(64), secret: z.string().min(1).max(128) })
  .strict()

export type PostStoreMagicLinkStatusBody = z.infer<typeof PostStoreMagicLinkStatusSchema>

// Returns the status of the link for the original tab, which asks every 3 seconds. A wrong
// secret gives "invalid".
export const POST = async (
  req: MedusaRequest<PostStoreMagicLinkStatusBody>,
  res: MedusaResponse
): Promise<void> => {
  const magicLink: MagicLinkModuleService = req.scope.resolve(MAGIC_LINK_MODULE)
  const status = await magicLink.linkStatus(req.validatedBody.id, req.validatedBody.secret)
  res.json({ status })
}
