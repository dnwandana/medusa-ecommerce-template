import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { bankTransferDeadlineMs } from "../../../config/payment"
import { idList } from "../../../lib/catalog-filters"
import { BANK_TRANSFER_PROVIDER_ID } from "../../../modules/bank-transfer/constants"
import { PAYMENT_RECEIPT_MODULE } from "../../../modules/payment-receipt"
import type PaymentReceiptModuleService from "../../../modules/payment-receipt/service"
import { ORDER_PAYMENT_FIELDS } from "../orders/[id]/receipts/route"

export const GetStorePaymentStatesSchema = z
  .object({ order_id: idList.pipe(z.array(z.string()).min(1).max(50)) })
  .strict()

export type GetStorePaymentStatesQuery = z.infer<typeof GetStorePaymentStatesSchema>

export type OrderPaymentState = {
  order_id: string
  provider_id: string | null
  captured_at: string | null
  deadline_at: string | null
  receipts: Array<{ id: string; file_name: string; created_at: string }>
  note: { note: string; created_at: string } | null
}

type PaymentRow = { provider_id?: string | null; captured_at?: Date | string | null } | null
type CollectionRow = {
  payment_sessions?: Array<{ provider_id?: string | null } | null> | null
  payments?: PaymentRow[] | null
} | null
type OrderRow = {
  id: string
  created_at: Date | string
  payment_collections?: CollectionRow[] | null
}

const iso = (value: Date | string): string => new Date(value).toISOString()

// Returns the bank transfer provider when a session has it, else the first session provider.
function providerId(order: OrderRow): string | null {
  const providers = (order.payment_collections ?? [])
    .flatMap((collection) => collection?.payment_sessions ?? [])
    .map((session) => session?.provider_id)
    .filter((id): id is string => !!id)
  return providers.includes(BANK_TRANSFER_PROVIDER_ID)
    ? BANK_TRANSFER_PROVIDER_ID
    : (providers[0] ?? null)
}

// Returns the earliest capture time of the payments of the order.
function capturedAt(order: OrderRow): string | null {
  const times = (order.payment_collections ?? [])
    .flatMap((collection) => collection?.payments ?? [])
    .map((payment) => payment?.captured_at)
    .filter((time): time is Date | string => !!time)
    .map((time) => new Date(time).getTime())
  return times.length ? new Date(Math.min(...times)).toISOString() : null
}

// Returns the time to pay a bank transfer order. Other providers have their own payment time, so
// they get no deadline.
function deadlineAt(order: OrderRow, provider: string | null, deadlineMs: number): string | null {
  if (provider !== BANK_TRANSFER_PROVIDER_ID) {
    return null
  }
  return new Date(new Date(order.created_at).getTime() + deadlineMs).toISOString()
}

// Returns the payment state of each known order, in the query order. A guest reads it with the
// order id, so the answer has no file key, no URL, no payment data and no customer data. The
// deadline is a time only.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const { order_id: ids } = req.validatedQuery as GetStorePaymentStatesQuery
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const service: PaymentReceiptModuleService = req.scope.resolve(PAYMENT_RECEIPT_MODULE)

  const [{ data: orders }, receiptStates] = await Promise.all([
    query.graph({ entity: "order", filters: { id: ids }, fields: ORDER_PAYMENT_FIELDS }),
    service.receiptStates(ids),
  ])
  const orderById = new Map((orders as unknown as OrderRow[]).map((order) => [order.id, order]))
  const deadlineMs = bankTransferDeadlineMs(process.env)

  const payment_states: OrderPaymentState[] = receiptStates.flatMap((state) => {
    const order = orderById.get(state.order_id)
    if (!order) {
      return []
    }
    const provider = providerId(order)
    return [
      {
        order_id: order.id,
        provider_id: provider,
        captured_at: capturedAt(order),
        deadline_at: deadlineAt(order, provider, deadlineMs),
        receipts: state.receipts.map((receipt) => ({
          id: receipt.id,
          file_name: receipt.file_name,
          created_at: iso(receipt.created_at),
        })),
        note: state.note ? { note: state.note.note, created_at: iso(state.note.created_at) } : null,
      },
    ]
  })

  res.json({ payment_states })
}
