import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { CUSTOMER_LOCALE } from "../lib/storefront-metadata"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { readVariantPrices } from "../lib/variant-prices"
import { toEmailLocale } from "../modules/brevo/templates/i18n"
import type { EmailStore } from "../modules/brevo/templates/shell"
import type {
  WishlistAlertData,
  WishlistAlertItem,
} from "../modules/brevo/templates/wishlist-alert"
import { WISHLIST_MODULE } from "../modules/wishlist"
import type WishlistModuleService from "../modules/wishlist/service"
import { batchOffset, PRICE_DROP_BATCH, type PriceItem, selectPriceDrops } from "./price-drop"

const TEMPLATE = "wishlist-alert"

type BatchItem = PriceItem & { wishlist?: { customer_id?: string | null } | null }

type Drop = { item: BatchItem; old_price: number; new_price: number }

type PriceUpdate = { id: string; saved_unit_price: number }

// A failed step can throw a plain object with a message, not an Error.
function causeOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
}

/**
 * Sends one price drop email to each customer with a lower price on a wishlist item. Returns the
 * ids of the customers that got the email and of the failed customers. A failed customer keeps
 * the old saved prices, so the next run sends the drop again.
 */
export async function runPriceDrops(
  container: MedusaContainer,
  now: Date = new Date()
): Promise<{ sent: string[]; failed: string[] }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const wishlistService: WishlistModuleService = container.resolve(WISHLIST_MODULE)
  const sent: string[] = []
  const failed: string[] = []

  // Most items keep their saved price, so an order by update time gives the same batch each day.
  // The id order with a daily offset reaches every item.
  const [, count] = await wishlistService.listAndCountWishlistItems({}, { take: 1, select: ["id"] })
  const items = (await wishlistService.listWishlistItems(
    {},
    {
      take: PRICE_DROP_BATCH,
      skip: batchOffset(count, now),
      relations: ["wishlist"],
      order: { id: "ASC" },
    }
  )) as unknown as BatchItem[]
  if (!items.length) {
    return { sent, failed }
  }

  const prices = await readVariantPrices(container, [
    ...new Set(items.map((item) => item.product_variant_id)),
  ])
  const { drops, updates } = selectPriceDrops(items, prices)

  // A null saved price gets the current price with no alert. These updates go in at the end.
  const dropIds = new Set(drops.map((drop) => drop.item.id))
  const fills = updates.filter((update) => !dropIds.has(update.id))
  const updateById = new Map(updates.map((update) => [update.id, update]))

  const dropsByCustomer = new Map<string, Drop[]>()
  for (const drop of drops) {
    const customerId = drop.item.wishlist?.customer_id
    if (!customerId) {
      continue
    }
    const list = dropsByCustomer.get(customerId) ?? []
    list.push(drop)
    dropsByCustomer.set(customerId, list)
  }

  if (dropsByCustomer.size) {
    // With no storefront URL the email has no link. The saved prices stay, so a later run sends
    // the drops when the URL has a value.
    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The price drop emails were not sent. STOREFRONT_URL has no value.")
    } else {
      await sendDrops(container, storefrontUrl, dropsByCustomer, updateById, sent, failed)
    }
  }

  if (fills.length) {
    try {
      await wishlistService.updateWishlistItems(fills)
    } catch (error) {
      // The saved prices stay null, so the next run fills them.
      logger.error(`The price drop job did not save the first prices. Cause: ${causeOf(error)}`)
    }
  }

  if (sent.length > 0) {
    logger.info(`The price drop job sent ${sent.length} emails.`)
  }
  return { sent, failed }
}

async function sendDrops(
  container: MedusaContainer,
  storefrontUrl: string,
  dropsByCustomer: Map<string, Drop[]>,
  updateById: Map<string, PriceUpdate>,
  sent: string[],
  failed: string[]
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const wishlistService: WishlistModuleService = container.resolve(WISHLIST_MODULE)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const customerIds = [...dropsByCustomer.keys()]
  const customers = await container
    .resolve(Modules.CUSTOMER)
    .listCustomers({ id: customerIds }, { select: ["id", "email", "first_name", "metadata"] })
  const customerById = new Map(customers.map((customer) => [customer.id, customer]))

  const variantIds = [
    ...new Set([...dropsByCustomer.values()].flat().map((drop) => drop.item.product_variant_id)),
  ]
  const variants = await container
    .resolve(Modules.PRODUCT)
    .listProductVariants({ id: variantIds }, { relations: ["product"] })
  const variantById = new Map(variants.map((variant) => [variant.id, variant]))

  let store: EmailStore | undefined

  for (const [customerId, customerDrops] of dropsByCustomer) {
    const customer = customerById.get(customerId)
    // The saved prices stay, so the customer gets the drop when the account has an email.
    if (!customer?.email) {
      logger.warn(
        `The price drop email for customer ${customerId} was not sent. The customer has no email address.`
      )
      continue
    }

    try {
      const locale = toEmailLocale(customer.metadata?.[CUSTOMER_LOCALE])
      store ??= await readStoreForEmail(container)
      const priceDrops: WishlistAlertItem[] = customerDrops.map((drop) => {
        const variant = variantById.get(drop.item.product_variant_id)
        return {
          title: variant?.product?.title ?? "",
          variant_title: variant?.title ?? null,
          thumbnail: variant?.thumbnail ?? variant?.product?.thumbnail ?? null,
          price: drop.new_price,
          old_price: drop.old_price,
        }
      })
      const data: WishlistAlertData = {
        locale,
        store,
        wishlist_url: storefrontLink(storefrontUrl, locale, "/account/wishlist"),
        first_name: customer.first_name ?? null,
        back_in_stock: [],
        price_drops: priceDrops,
      }

      await notificationService.createNotifications({
        to: customer.email,
        channel: "email",
        template: TEMPLATE,
        data,
      })
    } catch (error) {
      // One failed customer must not stop the run. The saved prices stay, so the next run tries
      // again.
      logger.error(
        `The price drop email for customer ${customerId} failed. Cause: ${causeOf(error)}`
      )
      failed.push(customerId)
      continue
    }

    try {
      await wishlistService.updateWishlistItems(
        customerDrops.flatMap((drop) => {
          const update = updateById.get(drop.item.id)
          return update ? [update] : []
        })
      )
      sent.push(customerId)
    } catch (error) {
      logger.error(
        `The price drop email for customer ${customerId} was sent, but the saved prices were not updated. The next run sends the email again. Cause: ${causeOf(error)}`
      )
      failed.push(customerId)
    }
  }
}
