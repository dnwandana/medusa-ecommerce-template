import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { STOREFRONT_MODULE } from "../../../../../modules/storefront"
import type StorefrontModuleService from "../../../../../modules/storefront/service"
import { PostAdminColourSchema } from "../route"

// The Admin page can send only the changed field.
export const PostAdminColourUpdateSchema = PostAdminColourSchema.partial()

export type PostAdminColourUpdateBody = z.infer<typeof PostAdminColourUpdateSchema>

// Changes the name or the hex of one store colour. The service throws NOT_FOUND for an unknown
// id.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminColourUpdateBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ colour: await service.updateColour(req.params.id, req.validatedBody) })
}

// Deletes one store colour. A product keeps its own hex in its metadata, so the delete only
// removes the fallback dot.
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const id = req.params.id

  // The generated delete method does not throw for an unknown id, so the route checks the id
  // first.
  const [colour] = await service.listStoreColours({ id }, { select: ["id"], take: 1 })
  if (!colour) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `The colour ${id} was not found.`)
  }
  await service.deleteStoreColours(id)

  res.json({ id, object: "store_colour", deleted: true })
}
