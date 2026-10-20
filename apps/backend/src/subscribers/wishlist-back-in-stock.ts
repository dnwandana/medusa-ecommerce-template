import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { CUSTOMER_LOCALE } from "../lib/storefront-metadata"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { readVariantPrices } from "../lib/variant-prices"
import {
  inventoryItemIdsOfEvent,
  isInStock,
  readVariantStock,
  STOCK_EVENTS,
} from "../lib/variant-stock"
import { toEmailLocale } from "../email/templates/i18n"
import type { WishlistAlertData, WishlistAlertItem } from "../email/templates/wishlist-alert"
import { WISHLIST_MODULE } from "../modules/wishlist"
import type WishlistModuleService from "../modules/wishlist/service"
import { type StockItem, transitionStockItems } from "../wishlist-alerts/back-in-stock"

const TEMPLATE = "wishlist-alert"

type AlertedItem = StockItem & { wishlist?: { customer_id?: string | null } | null }

type Alert = { item_id: string; customer_id: string; email_item: WishlistAlertItem }

type Logger = { warn: (message: string) => void; error: (message: string) => void }

function causeOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Checks the wishlist items of the variant of one inventory item. Writes the availability updates
 * and returns the alerts that can go out.
 */
async function checkInventoryItem(
  container: MedusaContainer,
  inventoryItemId: string,
  storefrontUrl: string | null,
  now: Date,
  logger: Logger
): Promise<Alert[]> {
  // A deleted variant gives no stock. Its wishlist items have nothing to show.
  const stock = await readVariantStock(container, inventoryItemId)
  if (!stock) {
    return []
  }

  const wishlist: WishlistModuleService = container.resolve(WISHLIST_MODULE)
  const items = (await wishlist.listWishlistItems(
    { product_variant_id: stock.variant_id },
    { relations: ["wishlist"] }
  )) as unknown as AlertedItem[]
  if (!items.length) {
    return []
  }

  const { alerts, updates } = transitionStockItems(items, isInStock(stock), now)
  let emailItem: WishlistAlertItem | null = null
  if (alerts.length) {
    emailItem = await readEmailItem(container, stock, storefrontUrl, logger)
  }

  // An alert that cannot go out keeps `available: false`, so a later event can send it.
  const alertIds = new Set(alerts.map((alert) => alert.id))
  const writes = emailItem ? updates : updates.filter((update) => !alertIds.has(update.id))
  // The availability goes in before the send, so a failed send does not repeat the alert.
  if (writes.length) {
    await wishlist.updateWishlistItems(writes)
  }
  if (!emailItem) {
    return []
  }

  return alerts.flatMap((alert) => {
    const customerId = alert.wishlist?.customer_id
    return customerId ? [{ item_id: alert.id, customer_id: customerId, email_item: emailItem }] : []
  })
}

async function readEmailItem(
  container: MedusaContainer,
  stock: NonNullable<Awaited<ReturnType<typeof readVariantStock>>>,
  storefrontUrl: string | null,
  logger: Logger
): Promise<WishlistAlertItem | null> {
  const failed = `The back in stock alerts for variant ${stock.variant_id} were not sent.`
  if (!storefrontUrl) {
    logger.warn(`${failed} STOREFRONT_URL has no value.`)
    return null
  }
  // The template shows a price for each item. A variant with no price cannot be bought.
  const price = (await readVariantPrices(container, [stock.variant_id])).get(stock.variant_id)
  if (price === null || price === undefined) {
    logger.warn(`${failed} The variant has no price.`)
    return null
  }
  return {
    title: stock.product_title,
    variant_title: stock.variant_title,
    thumbnail: stock.thumbnail,
    price,
  }
}

/** Sends one wishlist-alert email to each customer, with all the variants of the event. */
async function sendAlerts(
  container: MedusaContainer,
  alerts: Alert[],
  storefrontUrl: string,
  now: Date,
  logger: Logger
): Promise<void> {
  const byCustomer = new Map<string, Alert[]>()
  for (const alert of alerts) {
    byCustomer.set(alert.customer_id, [...(byCustomer.get(alert.customer_id) ?? []), alert])
  }

  const customers = await container
    .resolve(Modules.CUSTOMER)
    .listCustomers({ id: [...byCustomer.keys()] })
  const customerById = new Map(customers.map((customer) => [customer.id, customer]))
  const store = await readStoreForEmail(container)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const wishlist: WishlistModuleService = container.resolve(WISHLIST_MODULE)

  for (const [customerId, customerAlerts] of byCustomer) {
    try {
      const customer = customerById.get(customerId)
      if (!customer?.email) {
        logger.warn(
          `The ${TEMPLATE} email for customer ${customerId} was not sent. The customer has no email address.`
        )
        continue
      }

      const locale = toEmailLocale(customer.metadata?.[CUSTOMER_LOCALE])
      const emailData: WishlistAlertData = {
        locale,
        store,
        wishlist_url: storefrontLink(storefrontUrl, locale, "/account/wishlist"),
        first_name: customer.first_name ?? null,
        back_in_stock: customerAlerts.map((alert) => alert.email_item),
        price_drops: [],
      }
      await notificationService.createNotifications({
        to: customer.email,
        channel: "email",
        template: TEMPLATE,
        data: emailData,
      })
    } catch (error) {
      logger.error(
        `The ${TEMPLATE} email for customer ${customerId} failed. Cause: ${causeOf(error)}`
      )
      continue
    }

    try {
      // alerted_at goes in only after a send, so the cooldown starts only when an email went out.
      await wishlist.updateWishlistItems(
        customerAlerts.map((alert) => ({ id: alert.item_id, alerted_at: now }))
      )
    } catch (error) {
      logger.error(
        `The ${TEMPLATE} email for customer ${customerId} was sent, but alerted_at was not saved. Cause: ${causeOf(error)}`
      )
    }
  }
}

// Tells the customers that a wishlisted variant is back in stock. A stock change must not fail
// because of an email, so this handler catches each error and writes it to the log.
export default async function wishlistBackInStockHandler({
  event: { name, data },
  container,
}: SubscriberArgs<unknown>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const now = new Date()
  // With no storefront URL the email has no link, so no alert goes out.
  const storefrontUrl = readStorefrontUrl(container)

  let inventoryItemIds: string[]
  try {
    inventoryItemIds = await inventoryItemIdsOfEvent(container, name, data)
  } catch (error) {
    logger.error(`The back in stock check for event ${name} failed. Cause: ${causeOf(error)}`)
    return
  }

  const locking = container.resolve(Modules.LOCKING)
  // A variant with two inventory items can give one wishlist item two times.
  const alerts = new Map<string, Alert>()
  for (const inventoryItemId of inventoryItemIds) {
    try {
      // One order gives several stock events at the same time. The lock makes the second handler
      // read `available: true`, so it does not alert the same item again.
      const itemAlerts = await locking.execute(`wishlist-back-in-stock:${inventoryItemId}`, () =>
        checkInventoryItem(container, inventoryItemId, storefrontUrl, now, logger)
      )
      for (const alert of itemAlerts) {
        alerts.set(alert.item_id, alert)
      }
    } catch (error) {
      logger.error(
        `The back in stock check for inventory item ${inventoryItemId} failed. Cause: ${causeOf(error)}`
      )
    }
  }
  if (!alerts.size || !storefrontUrl) {
    return
  }

  try {
    await sendAlerts(container, [...alerts.values()], storefrontUrl, now, logger)
  } catch (error) {
    logger.error(`The back in stock alerts of event ${name} failed. Cause: ${causeOf(error)}`)
  }
}

export const config: SubscriberConfig = {
  event: STOCK_EVENTS,
}
