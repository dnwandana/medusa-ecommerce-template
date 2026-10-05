import type { MayarInvoice } from "./types"

export type InvoiceCheck = "paid" | "unpaid" | "amount_mismatch"

// Returns true only for the status "paid". Each other status counts as not paid, because the
// Mayar documentation gives no full list of the status values.
export function isPaidStatus(status: unknown): boolean {
  return typeof status === "string" && status.trim().toLowerCase() === "paid"
}

// Compares an invoice from the Mayar API with the amount of the payment session.
export function checkInvoice(
  invoice: Pick<MayarInvoice, "status" | "amount">,
  expectedAmount: number
): InvoiceCheck {
  if (!isPaidStatus(invoice.status)) {
    return "unpaid"
  }
  // Mayar can send the amount as a string, so compare numbers.
  const amount = Number(invoice.amount)
  if (!Number.isFinite(amount) || amount !== expectedAmount) {
    return "amount_mismatch"
  }
  return "paid"
}

// Returns the id of the Medusa payment session that the provider put in the extra data.
export function findSessionId(
  invoice: Pick<MayarInvoice, "extraData" | "transactions">
): string | undefined {
  const sources = [invoice.extraData, ...(invoice.transactions ?? []).map((t) => t.extraData)]
  for (const extraData of sources) {
    const sessionId = extraData?.session_id
    if (typeof sessionId === "string" && sessionId.length > 0) {
      return sessionId
    }
  }
  return undefined
}
