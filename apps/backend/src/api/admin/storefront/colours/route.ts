import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import type StorefrontModuleService from "../../../../modules/storefront/service"
import { isHexColour } from "../../../../modules/storefront/settings-rules"

// The service saves the hex in lower case and rejects a duplicate name.
export const PostAdminColourSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    hex: z.string().refine(isHexColour, { message: "Use a hex colour, for example #9aa68c." }),
  })
  .strict()

export type PostAdminColourBody = z.infer<typeof PostAdminColourSchema>

// Returns all store colours in the order of the name.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ colours: await service.listColours() })
}

// Creates a store colour.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminColourBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ colour: await service.createColour(req.validatedBody) })
}
