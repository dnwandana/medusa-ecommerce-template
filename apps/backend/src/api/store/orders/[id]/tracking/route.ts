import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

type Label = { tracking_number?: string | null; tracking_url?: string | null } | null
type Item = { line_item_id?: string | null; title?: string | null; quantity?: unknown } | null
type Fulfillment = {
  id: string
  shipped_at?: Date | string | null
  delivered_at?: Date | string | null
  canceled_at?: Date | string | null
  labels?: Label[] | null
  items?: Item[] | null
} | null

// The cancel reasons that the order page knows. The metadata can hold free text from the admin,
// and this route needs only the publishable API key, so each other value becomes null.
const KNOWN_CANCEL_REASONS = new Set(["payment_timeout"])

const iso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null

// Returns the cancel reason and the shipments of an order for the order page. The Store order
// route of Medusa drops the order metadata, fulfillments.labels and fulfillments.items with no
// error, so this route reads them. It needs only the publishable API key, the same trust level as
// the order page. The answer has no address, email, price or customer field.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    filters: { id: req.params.id },
    fields: [
      "id",
      "metadata",
      "fulfillments.id",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "fulfillments.labels.tracking_number",
      "fulfillments.labels.tracking_url",
      "fulfillments.items.line_item_id",
      "fulfillments.items.title",
      "fulfillments.items.quantity",
    ],
  })
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id: ${req.params.id} was not found`
    )
  }

  const reason = order.metadata?.cancel_reason
  const fulfillments = ((order.fulfillments ?? []) as Fulfillment[]).flatMap((f) =>
    f && f.shipped_at && !f.canceled_at ? [f] : []
  )

  // Copy only the fields of the answer. The storefront and the email check the URL scheme.
  const shipments = fulfillments
    .sort((a, b) => new Date(a.shipped_at!).getTime() - new Date(b.shipped_at!).getTime())
    .map((fulfillment) => ({
      id: fulfillment.id,
      shipped_at: iso(fulfillment.shipped_at)!,
      delivered_at: iso(fulfillment.delivered_at),
      items: (fulfillment.items ?? []).flatMap((item) =>
        item
          ? [
              {
                line_item_id: item.line_item_id ?? "",
                title: item.title ?? "",
                quantity: Number(item.quantity),
              },
            ]
          : []
      ),
      labels: (fulfillment.labels ?? []).flatMap((label) =>
        label?.tracking_number
          ? [{ tracking_number: label.tracking_number, tracking_url: label.tracking_url || null }]
          : []
      ),
    }))

  const cancel_reason =
    typeof reason === "string" && KNOWN_CANCEL_REASONS.has(reason) ? reason : null
  res.json({ cancel_reason, shipments })
}
