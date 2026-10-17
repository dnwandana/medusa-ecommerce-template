import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { RECOVERY_ADAPTERS, type RecoveryAdapter } from "./adapters"
import type { PendingSession, RecoveryDeps } from "./check-paid-carts"

// Connects the recovery logic to Medusa. Each adapter gives the paid check for one gateway.
export function buildRecoveryDeps(
  container: MedusaContainer,
  env: Record<string, string | undefined>,
  adapters: RecoveryAdapter[] = RECOVERY_ADAPTERS
): RecoveryDeps {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const cartMetadata = async (cartId: string): Promise<Record<string, unknown>> => {
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "metadata"],
      filters: { id: cartId },
    })
    return (data[0]?.metadata as Record<string, unknown> | null) ?? {}
  }

  return {
    now: () => new Date(),
    ownerEmail: env.STORE_OWNER_EMAIL ?? "",
    adapters,
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),

    async listPendingSessions(providerId: string): Promise<PendingSession[]> {
      const { data: sessions } = await query.graph({
        entity: "payment_session",
        fields: ["id", "data", "amount", "created_at", "payment_collection_id"],
        filters: { provider_id: providerId, status: ["pending"] },
      })
      if (!sessions.length) {
        return []
      }

      const { data: links } = await query.graph({
        entity: "cart_payment_collection",
        fields: ["cart_id", "payment_collection_id"],
        filters: {
          payment_collection_id: sessions.map((s: any) => s.payment_collection_id),
        },
      })
      const cartIdByCollection = new Map<string, string>(
        links.map((l: any) => [l.payment_collection_id, l.cart_id])
      )

      const cartIds = [...new Set(cartIdByCollection.values())]
      const carts = cartIds.length
        ? (
            await query.graph({
              entity: "cart",
              fields: ["id", "email", "completed_at", "metadata"],
              filters: { id: cartIds },
            })
          ).data
        : []
      const cartById = new Map<string, any>(carts.map((c: any) => [c.id, c]))

      return sessions.map((session: any): PendingSession => {
        const cartId = cartIdByCollection.get(session.payment_collection_id)
        const cart = cartId ? cartById.get(cartId) : undefined
        const alertSentAt = cart?.metadata?.paid_cart_alert_sent_at
        return {
          sessionId: session.id,
          // The adapter reads the session data, so the data is a plain object.
          data: { ...(session.data ?? {}) },
          amount: Number(session.amount),
          createdAt: new Date(session.created_at),
          cartId: cart ? cart.id : undefined,
          cartCompleted: !!cart?.completed_at,
          customerEmail: cart?.email ?? undefined,
          alertSentAt: typeof alertSentAt === "string" ? alertSentAt : undefined,
        }
      })
    },

    async completeCart(cartId: string): Promise<void> {
      await completeCartWorkflow(container).run({ input: { id: cartId } })
    },

    async sendAlert(to, data): Promise<void> {
      await container.resolve(Modules.NOTIFICATION).createNotifications({
        to,
        channel: "email",
        template: "paid-cart-alert",
        data,
      })
    },

    async markAlertSent(cartId: string, sentAt: string): Promise<void> {
      const metadata = await cartMetadata(cartId)
      await container.resolve(Modules.CART).updateCarts(cartId, {
        metadata: { ...metadata, paid_cart_alert_sent_at: sentAt },
      })
    },
  }
}
