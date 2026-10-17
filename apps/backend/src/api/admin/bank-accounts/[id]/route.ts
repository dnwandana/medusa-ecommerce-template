import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { BANK_ACCOUNT_MODULE } from "../../../../modules/bank-account"
import type BankAccountModuleService from "../../../../modules/bank-account/service"
import { PostAdminBankAccountSchema } from "../route"

// The Admin page sends only the changed fields, for example only is_active or only rank.
export const PostAdminBankAccountUpdateSchema = PostAdminBankAccountSchema.partial()

export type PostAdminBankAccountUpdateBody = z.infer<typeof PostAdminBankAccountUpdateSchema>

// Throws NOT_FOUND when no bank account has the id. The generated delete method does not throw
// for an unknown id, so the routes check the id first.
async function assertBankAccountExists(service: BankAccountModuleService, id: string) {
  const [account] = await service.listBankAccounts({ id }, { select: ["id"], take: 1 })
  if (!account) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `The bank account ${id} was not found.`)
  }
}

// Changes the fields of one bank account.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminBankAccountUpdateBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)
  const id = req.params.id

  await assertBankAccountExists(service, id)
  const bank_account = await service.updateBankAccounts({ id, ...req.validatedBody })

  res.json({ bank_account })
}

// Deletes one bank account.
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)
  const id = req.params.id

  await assertBankAccountExists(service, id)
  await service.deleteBankAccounts(id)

  res.json({ id, object: "bank_account", deleted: true })
}
