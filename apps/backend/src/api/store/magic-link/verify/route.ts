import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { MAGIC_LINK_MODULE } from "../../../../modules/magic-link"
import type MagicLinkModuleService from "../../../../modules/magic-link/service"

// The verify and confirm routes use POST, so the token does not go into a URL that a log keeps.
export const PostStoreMagicLinkTokenSchema = z
  .object({ id: z.string().min(1).max(64), token: z.string().min(1).max(128) })
  .strict()

export type PostStoreMagicLinkTokenBody = z.infer<typeof PostStoreMagicLinkTokenSchema>

export const INVALID_LINK_MESSAGE = "The link is not valid. Ask for a new link."

// The confirm route and the session route read the request and then write it. A lock for each
// request makes the read and the write one step, so a link is used one time also when two calls
// come at the same time.
export function requestLockKey(id: string): string {
  return `magic-link-request:${id}`
}

// Returns the browser and the time of the request for the confirm screen. The route changes
// nothing, so a mail scanner that opens the link uses up nothing. The answer has no email.
export const POST = async (
  req: MedusaRequest<PostStoreMagicLinkTokenBody>,
  res: MedusaResponse
): Promise<void> => {
  const magicLink: MagicLinkModuleService = req.scope.resolve(MAGIC_LINK_MODULE)
  const details = await magicLink.verifyLink(req.validatedBody.id, req.validatedBody.token)
  if (!details) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_LINK_MESSAGE)
  }
  res.json({ browser: details.browser, requested_at: details.requested_at.toISOString() })
}
