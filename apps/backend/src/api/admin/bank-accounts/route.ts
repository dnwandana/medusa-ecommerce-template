import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { BANK_ACCOUNT_MODULE } from "../../../modules/bank-account"
import type BankAccountModuleService from "../../../modules/bank-account/service"

// The account number is text, not a number, because a number loses the leading zeros.
export const PostAdminBankAccountSchema = z
  .object({
    bank_name: z.string().trim().min(1),
    account_number: z
      .string()
      .trim()
      .regex(/^\d{5,20}$/),
    account_holder: z.string().trim().min(1),
    is_active: z.boolean().optional(),
    rank: z.number().int().min(0).optional(),
  })
  .strict()

export type PostAdminBankAccountBody = z.infer<typeof PostAdminBankAccountSchema>

// Returns all bank accounts, also the inactive accounts, in the order that the customer sees.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)

  const bank_accounts = await service.listBankAccounts(
    {},
    { order: { rank: "ASC", created_at: "ASC" } }
  )

  res.json({ bank_accounts })
}

// Creates a bank account. An account with no rank goes after the other accounts. The default
// rank 0 puts it next to the first account.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminBankAccountBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)

  let rank = req.validatedBody.rank
  if (rank === undefined) {
    const [last] = await service.listBankAccounts({}, { take: 1, order: { rank: "DESC" } })
    rank = last ? last.rank + 1 : 0
  }

  const bank_account = await service.createBankAccounts({ ...req.validatedBody, rank })

  res.json({ bank_account })
}
