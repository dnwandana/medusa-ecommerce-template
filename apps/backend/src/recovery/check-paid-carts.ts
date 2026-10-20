import type { PaidCartAlertData } from "../modules/brevo/templates/paid-cart-alert"
import type { RecoveryAdapter } from "./adapters"

export const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000

export type PendingSession = {
  sessionId: string
  data: Record<string, unknown>
  amount: number
  createdAt: Date
  cartId?: string
  cartCompleted: boolean
  customerEmail?: string
  alertSentAt?: string
}

export type RecoveryDeps = {
  now: () => Date
  readOwnerEmail(): Promise<string>
  adapters: RecoveryAdapter[]
  listPendingSessions(providerId: string): Promise<PendingSession[]>
  completeCart(cartId: string): Promise<void>
  // The wiring adds the store details to the data.
  sendAlert(to: string, data: Omit<PaidCartAlertData, "store">): Promise<void>
  markAlertSent(cartId: string, sentAt: string): Promise<void>
  logger: {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
  }
}

export type RecoveryResult = { checked: number; completed: number; alerted: number }

type CheckableSession = PendingSession & { cartId: string }

function causeOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isCheckable(session: PendingSession, now: Date): session is CheckableSession {
  return (
    !!session.cartId &&
    !session.cartCompleted &&
    !session.alertSentAt &&
    now.getTime() - session.createdAt.getTime() <= MAX_SESSION_AGE_MS
  )
}

// Returns the payment id of the gateway, or the session id when the adapter gives no value.
function paymentReferenceOf(adapter: RecoveryAdapter, session: PendingSession): string {
  return adapter.paymentReference?.(session.data) || session.sessionId
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
async function alertOwner(
  deps: RecoveryDeps,
  adapter: RecoveryAdapter,
  session: CheckableSession
): Promise<boolean> {
  const { cartId } = session
  const paymentReference = paymentReferenceOf(adapter, session)

  let to: string
  try {
    to = await deps.readOwnerEmail()
  } catch (error) {
    // The cart keeps no mark, so the next run reads the address again.
    deps.logger.error(
      `The check-paid-carts job did not read the owner email for the cart ${cartId}. Cause: ${causeOf(error)}`
    )
    return false
  }

  if (!to) {
    deps.logger.error(
      `The cart ${cartId} is paid, but it has no order. Payment provider: ${adapter.providerId}. Payment reference: ${paymentReference}. Amount: ${session.amount}. Customer: ${session.customerEmail || "no email address"}. The owner email is empty, so the job sent no email.`
    )
    await markAlert(deps, cartId)
    return false
  }

  try {
    await deps.sendAlert(to, {
      cart_id: cartId,
      provider_id: adapter.providerId,
      payment_reference: paymentReference,
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

// Returns the sessions of one adapter that the job must check, the oldest first.
async function sessionsToCheck(
  deps: RecoveryDeps,
  adapter: RecoveryAdapter,
  now: Date
): Promise<CheckableSession[]> {
  try {
    return (await deps.listPendingSessions(adapter.providerId))
      .filter((session): session is CheckableSession => isCheckable(session, now))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, adapter.maxSessionsPerRun)
  } catch (error) {
    // A failure for one provider must not stop the sessions of the next provider.
    deps.logger.error(
      `The check-paid-carts job did not list the payment sessions of the provider ${adapter.providerId}. Cause: ${causeOf(error)}`
    )
    return []
  }
}

// Completes each cart that has a paid payment session and no order. Each adapter in
// deps.adapters gives the paid check for one gateway provider.
export async function checkPaidCarts(deps: RecoveryDeps): Promise<RecoveryResult> {
  const result: RecoveryResult = { checked: 0, completed: 0, alerted: 0 }
  if (deps.adapters.length === 0) {
    return result
  }

  const now = deps.now()
  for (const adapter of deps.adapters) {
    const sessions = await sessionsToCheck(deps, adapter, now)

    // The loop runs in sequence, so that the job stays below the rate limit of the gateway.
    for (const session of sessions) {
      const { cartId, sessionId } = session

      let paid: boolean
      try {
        paid = await adapter.isSessionPaid(session.data)
      } catch (error) {
        deps.logger.warn(
          `The check-paid-carts job did not check the payment session ${sessionId} of the provider ${adapter.providerId}. Cause: ${causeOf(error)}`
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
          `The check-paid-carts job completed the cart ${cartId} for the paid payment session ${sessionId} of the provider ${adapter.providerId}.`
        )
        continue
      } catch (error) {
        deps.logger.warn(
          `The check-paid-carts job did not complete the paid cart ${cartId}. Cause: ${causeOf(error)}`
        )
      }

      if (await alertOwner(deps, adapter, session)) {
        result.alerted += 1
      }
    }
  }

  return result
}
