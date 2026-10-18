import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { AuthIdentityDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { generateJwtTokenForAuthIdentity } from "@medusajs/medusa/api/auth/utils/generate-jwt-token"
import { MAGIC_LINK_MODULE } from "../../../../modules/magic-link"
import type MagicLinkModuleService from "../../../../modules/magic-link/service"
import { resolveCustomerAccountWorkflow } from "../../../../workflows/resolve-customer-account"
import { MAGIC_LINK_PROVIDER } from "../../../../workflows/steps/resolve-customer-account"
import { PostStoreMagicLinkStatusSchema } from "../status/route"
import { INVALID_LINK_MESSAGE, requestLockKey } from "../verify/route"

// .extend keeps the strict mode of the status schema.
export const PostStoreMagicLinkSessionSchema = PostStoreMagicLinkStatusSchema.extend({
  token: z.string().min(1).max(128).optional(),
})

export type PostStoreMagicLinkSessionBody = z.infer<typeof PostStoreMagicLinkSessionSchema>

// Uses up the link and returns a customer token. The storefront sends the token one time to
// POST /auth/session, and the session cookie then replaces it. No path gives a token without the
// secret of the request.
export const POST = async (
  req: MedusaRequest<PostStoreMagicLinkSessionBody>,
  res: MedusaResponse
): Promise<void> => {
  const magicLink: MagicLinkModuleService = req.scope.resolve(MAGIC_LINK_MODULE)
  const link = await req.scope
    .resolve(Modules.LOCKING)
    .execute(requestLockKey(req.validatedBody.id), () => magicLink.consumeLink(req.validatedBody))
  if (!link) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, INVALID_LINK_MESSAGE)
  }

  const { result: account } = await resolveCustomerAccountWorkflow(req.scope).run({
    input: { email: link.email },
  })

  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const token = await generateJwtTokenForAuthIdentity(
    {
      authIdentity: account.auth_identity as AuthIdentityDTO,
      actorType: "customer",
      authProvider: MAGIC_LINK_PROVIDER,
      container: req.scope,
    },
    {
      secret: http.jwtSecret!,
      expiresIn: http.jwtExpiresIn ?? "1d",
      options: http.jwtOptions,
    }
  )

  res.json({ token })
}
