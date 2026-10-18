import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { MAGIC_LINK_MODULE } from "../../../../modules/magic-link"
import type MagicLinkModuleService from "../../../../modules/magic-link/service"
import {
  INVALID_LINK_MESSAGE,
  requestLockKey,
  type PostStoreMagicLinkTokenBody,
} from "../verify/route"

// Marks the link as confirmed ("Yes, sign me in" on the other device). The original tab then
// takes the session with its secret.
export const POST = async (
  req: MedusaRequest<PostStoreMagicLinkTokenBody>,
  res: MedusaResponse
): Promise<void> => {
  const magicLink: MagicLinkModuleService = req.scope.resolve(MAGIC_LINK_MODULE)
  const { id, token } = req.validatedBody
  const confirmed = await req.scope
    .resolve(Modules.LOCKING)
    .execute(requestLockKey(id), () => magicLink.confirmLink(id, token))
  if (!confirmed) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_LINK_MESSAGE)
  }
  res.json({ confirmed: true })
}
