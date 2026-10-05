import type { PaidCartAlertData } from "../modules/brevo/templates/paid-cart-alert"

export const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000
// Mayar permits 50 requests for each minute.
export const MAX_SESSIONS_PER_RUN = 40

export type PendingSession = {
  sessionId: string
  invoiceId?: string
  amount: number
  createdAt: Date
  cartId?: string
  cartCompleted: boolean
  customerEmail?: string
  alertSentAt?: string
}

export type RecoveryDeps = {
  now: () => Date
  ownerEmail: string
  listPendingSessions(): Promise<PendingSession[]>
  isInvoicePaid(invoiceId: string): Promise<boolean>
  completeCart(cartId: string): Promise<void>
  sendAlert(to: string, data: PaidCartAlertData): Promise<void>
  markAlertSent(cartId: string, sentAt: string): Promise<void>
  logger: {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
  }
}

export type RecoveryResult = { checked: number; completed: number; alerted: number }

type CheckableSession = PendingSession & { cartId: string; invoiceId: string }

function causeOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isCheckable(session: PendingSession, now: Date): session is CheckableSession {
  return (
    !!session.cartId &&
    !!session.invoiceId &&
    !session.cartCompleted &&
    !session.alertSentAt &&
    now.getTime() - session.createdAt.getTime() <= MAX_SESSION_AGE_MS
  )
}

// Records the alert in the cart. A failure here must not stop the job for the other sessions.
async function markAlert(deps: RecoveryDeps, cartId: string): Promise<void> {
  try {
    await deps.markAlertSent(cartId, deps.now().toISOString())
  } catch (error) {
    deps.logger.error(
      `The check-paid-carts job did not record the alert for the cart ${cartId}. Cause: ${causeOf(error)}`
    )
  }
}

// Sends one alert for a paid cart that the job did not complete. Returns true if the email was sent.
async function alertOwner(deps: RecoveryDeps, session: CheckableSession): Promise<boolean> {
  const { cartId, invoiceId } = session

  if (!deps.ownerEmail) {
    deps.logger.error(
      `The cart ${cartId} is paid, but it has no order. Mayar invoice: ${invoiceId}. Amount: ${session.amount}. Customer: ${session.customerEmail || "no email address"}. STORE_OWNER_EMAIL is empty, so the job sent no email.`
    )
    await markAlert(deps, cartId)
    return false
  }

  try {
    await deps.sendAlert(deps.ownerEmail, {
      cart_id: cartId,
      invoice_id: invoiceId,
      customer_email: session.customerEmail,
      amount: session.amount,
    })
  } catch (error) {
    // The cart keeps no mark, so the next run sends the alert again.
    deps.logger.error(
      `The check-paid-carts job did not send the alert for the cart ${cartId}. Cause: ${causeOf(error)}`
    )
    return false
  }

  await markAlert(deps, cartId)
  return true
}

// Completes each cart that has a paid Mayar invoice and no order.
export async function checkPaidCarts(deps: RecoveryDeps): Promise<RecoveryResult> {
  const now = deps.now()
  const sessions = (await deps.listPendingSessions())
    .filter((session): session is CheckableSession => isCheckable(session, now))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, MAX_SESSIONS_PER_RUN)

  const result: RecoveryResult = { checked: 0, completed: 0, alerted: 0 }

  // The loop runs in sequence, so that the job stays below the Mayar rate limit.
  for (const session of sessions) {
    const { cartId, invoiceId } = session

    let paid: boolean
    try {
      paid = await deps.isInvoicePaid(invoiceId)
    } catch (error) {
      deps.logger.error(
        `The check-paid-carts job did not check the Mayar invoice ${invoiceId}. Cause: ${causeOf(error)}`
      )
      continue
    }

    result.checked += 1
    if (!paid) {
      continue
    }

    try {
      await deps.completeCart(cartId)
      result.completed += 1
      deps.logger.info(
        `The check-paid-carts job completed the cart ${cartId} for the paid Mayar invoice ${invoiceId}.`
      )
      continue
    } catch (error) {
      deps.logger.warn(
        `The check-paid-carts job did not complete the paid cart ${cartId}. Cause: ${causeOf(error)}`
      )
    }

    if (await alertOwner(deps, session)) {
      result.alerted += 1
    }
  }

  return result
}
