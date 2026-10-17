import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { BANK_ACCOUNT_MODULE } from "../../../modules/bank-account"
import type BankAccountModuleService from "../../../modules/bank-account/service"

// null clears a value. The schema does not accept an empty string, so the database has no empty
// value next to null. The WhatsApp number is an Indonesian mobile number in the E.164 format.
export const PostAdminStoreContactSchema = z
  .object({
    email: z.string().trim().email().nullable(),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\+628\d{8,11}$/)
      .nullable(),
  })
  .strict()

export type PostAdminStoreContactBody = z.infer<typeof PostAdminStoreContactSchema>

// Returns the store contact. The values are null when the owner did not save a contact.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)

  res.json({ contact: await service.getContact() })
}

// Saves the store contact.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminStoreContactBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)

  res.json({ contact: await service.setContact(req.validatedBody) })
}
