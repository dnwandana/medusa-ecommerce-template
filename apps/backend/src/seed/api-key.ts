import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateApiKeysWorkflow,
} from "@medusajs/medusa/core-flows"

const KEY_TITLE = "Storefront"
// Medusa creates this key at the first start when no publishable key exists.
const MEDUSA_DEFAULT_KEY_TITLE = "Default Publishable API Key"

type PublishableKey = {
  id: string
  title: string
  token: string
  revoked_at: Date | string | null
  sales_channels?: { id: string }[] | null
}

// Returns the token of the storefront key. It creates the key on the first run. If Medusa
// created its default key, the seed renames that key, so the store has one publishable key.
// The key needs a link to the sales channel, because without the link the Store API returns
// no products.
export async function seedPublishableKey(
  container: MedusaContainer,
  input: { salesChannelId: string }
): Promise<{ token: string }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "revoked_at", "sales_channels.id"],
    filters: { type: "publishable" },
  })
  const keys = (data as PublishableKey[]).filter((key) => !key.revoked_at)

  let apiKey =
    keys.find((key) => key.title === KEY_TITLE) ??
    keys.find((key) => key.title === MEDUSA_DEFAULT_KEY_TITLE)

  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: KEY_TITLE, type: "publishable", created_by: "" }] },
    })
    apiKey = { ...result[0], sales_channels: [] }
  } else if (apiKey.title !== KEY_TITLE) {
    await updateApiKeysWorkflow(container).run({
      input: { selector: { id: apiKey.id }, update: { title: KEY_TITLE } },
    })
  }

  const linked = (apiKey.sales_channels ?? []).some((channel) => channel.id === input.salesChannelId)
  if (!linked) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey.id, add: [input.salesChannelId] },
    })
  }

  return { token: apiKey.token }
}
