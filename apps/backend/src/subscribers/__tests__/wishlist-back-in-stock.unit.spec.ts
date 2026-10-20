import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { inventoryItemIdsOfEvent, readVariantStock } from "../../lib/variant-stock"
import { readVariantPrices } from "../../lib/variant-prices"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import wishlistBackInStockHandler, { config } from "../wishlist-back-in-stock"

jest.mock("../../lib/variant-stock", () => ({
  ...jest.requireActual("../../lib/variant-stock"),
  inventoryItemIdsOfEvent: jest.fn(),
  readVariantStock: jest.fn(),
}))
jest.mock("../../lib/variant-prices", () => ({ readVariantPrices: jest.fn() }))

const idsOfEvent = inventoryItemIdsOfEvent as jest.Mock
const readStock = readVariantStock as jest.Mock
const readPrices = readVariantPrices as jest.Mock

const stock = (available: number, overrides: Record<string, unknown> = {}) => ({
  variant_id: "variant_1",
  product_id: "prod_1",
  product_title: "Medusa T-Shirt",
  variant_title: "M / Black",
  sku: "TS-M-BLK",
  thumbnail: "https://cdn/x.jpg",
  manage_inventory: true,
  allow_backorder: false,
  available,
  inventory_item_id: "iitem_1",
  ...overrides,
})

const item = (
  id: string,
  customerId: string,
  available: boolean,
  alertedAt: Date | null = null
) => ({
  id,
  wishlist_id: `wl_${customerId}`,
  product_variant_id: "variant_1",
  available,
  alerted_at: alertedAt,
  wishlist: { id: `wl_${customerId}`, customer_id: customerId },
})

const customer = (id: string, email: string | null, locale?: string) => ({
  id,
  email,
  first_name: id === "cust_1" ? "Sari" : null,
  metadata: locale ? { locale } : null,
})

const makeContainer = ({
  items = [
    item("wi_1", "cust_1", false),
    item("wi_2", "cust_2", false),
    item("wi_3", "cust_3", true),
  ],
  customers = [customer("cust_1", "sari@example.com"), customer("cust_2", "budi@example.com")],
  storefrontUrl = "https://shop.example.com",
}: {
  items?: unknown[]
  customers?: unknown[]
  storefrontUrl?: string
} = {}) => {
  const listWishlistItems = jest.fn().mockResolvedValue(items)
  const updateWishlistItems = jest.fn().mockResolvedValue([])
  const listCustomers = jest.fn().mockResolvedValue(customers)
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const execute = jest.fn((_key: string, fn: () => Promise<unknown>) => fn())
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.LOCKING]: { execute },
    [WISHLIST_MODULE]: { listWishlistItems, updateWishlistItems },
    [Modules.CUSTOMER]: { listCustomers },
    [Modules.NOTIFICATION]: { createNotifications },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return {
    container,
    listWishlistItems,
    updateWishlistItems,
    listCustomers,
    createNotifications,
    logger,
    execute,
  }
}

const run = (container: any, data: unknown = { id: "ilev_1" }) =>
  wishlistBackInStockHandler({
    event: { name: "inventory-level.updated", data },
    container,
    pluginOptions: {},
  } as any)

const alertedCalls = (updateWishlistItems: jest.Mock) =>
  updateWishlistItems.mock.calls.filter(([updates]) =>
    updates.every((update: Record<string, unknown>) => "alerted_at" in update)
  )

beforeEach(() => {
  jest.clearAllMocks()
  idsOfEvent.mockResolvedValue(["iitem_1"])
  readStock.mockResolvedValue(stock(3))
  readPrices.mockResolvedValue(new Map([["variant_1", 150000]]))
})

describe("wishlist-back-in-stock subscriber", () => {
  it("listens to the four stock events", () => {
    expect(config.event).toEqual([
      "inventory-level.updated",
      "reservation-item.created",
      "reservation-item.updated",
      "reservation-item.deleted",
    ])
  })

  it("alerts the customers whose item was out of stock, one email each", async () => {
    const {
      container,
      createNotifications,
      updateWishlistItems,
      listWishlistItems,
      listCustomers,
    } = makeContainer()
    await run(container)

    expect(idsOfEvent).toHaveBeenCalledWith(container, "inventory-level.updated", { id: "ilev_1" })
    expect(readStock).toHaveBeenCalledWith(container, "iitem_1")
    expect(listWishlistItems).toHaveBeenCalledWith(
      { product_variant_id: "variant_1" },
      { relations: ["wishlist"] }
    )
    expect(listCustomers).toHaveBeenCalledWith({ id: ["cust_1", "cust_2"] })
    expect(createNotifications).toHaveBeenCalledTimes(2)
    expect(createNotifications.mock.calls[0][0]).toEqual({
      to: "sari@example.com",
      channel: "email",
      template: "wishlist-alert",
      data: {
        locale: "en-US",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        wishlist_url: "https://shop.example.com/account/wishlist",
        first_name: "Sari",
        back_in_stock: [
          {
            title: "Medusa T-Shirt",
            variant_title: "M / Black",
            thumbnail: "https://cdn/x.jpg",
            price: 150000,
          },
        ],
        price_drops: [],
      },
    })
    expect(createNotifications.mock.calls[1][0].to).toBe("budi@example.com")
    expect(updateWishlistItems).toHaveBeenCalledWith([
      { id: "wi_1", available: true },
      { id: "wi_2", available: true },
    ])
    expect(updateWishlistItems).toHaveBeenCalledWith([{ id: "wi_1", alerted_at: expect.any(Date) }])
    expect(updateWishlistItems).toHaveBeenCalledWith([{ id: "wi_2", alerted_at: expect.any(Date) }])
  })

  it("writes the availability before the first send and alerted_at after it", async () => {
    const { container, createNotifications, updateWishlistItems } = makeContainer()
    await run(container)

    const [availabilityOrder, firstAlertedOrder] = updateWishlistItems.mock.invocationCallOrder
    const [firstSendOrder] = createNotifications.mock.invocationCallOrder
    expect(availabilityOrder).toBeLessThan(firstSendOrder)
    expect(firstAlertedOrder).toBeGreaterThan(firstSendOrder)
  })

  it("passes the Indonesian locale and link of the customer", async () => {
    const { container, createNotifications } = makeContainer({
      items: [item("wi_1", "cust_1", false)],
      customers: [customer("cust_1", "sari@example.com", "id-ID")],
    })
    await run(container)

    const { data } = createNotifications.mock.calls[0][0]
    expect([data.locale, data.wishlist_url]).toEqual([
      "id-ID",
      "https://shop.example.com/id/account/wishlist",
    ])
  })

  it("marks the items as out of stock and sends nothing when the stock is 0", async () => {
    readStock.mockResolvedValue(stock(0))
    const { container, createNotifications, updateWishlistItems, listCustomers } = makeContainer({
      items: [item("wi_1", "cust_1", true), item("wi_2", "cust_2", false)],
    })
    await run(container)

    expect(updateWishlistItems).toHaveBeenCalledTimes(1)
    expect(updateWishlistItems).toHaveBeenCalledWith([{ id: "wi_1", available: false }])
    expect(readPrices).not.toHaveBeenCalled()
    expect(listCustomers).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("alerts for a variant with no inventory management at 0 stock", async () => {
    readStock.mockResolvedValue(stock(0, { manage_inventory: false }))
    const { container, createNotifications } = makeContainer()
    await run(container)

    expect(createNotifications).toHaveBeenCalledTimes(2)
  })

  it("skips an item with an alert in the last 24 hours", async () => {
    const { container, createNotifications, updateWishlistItems } = makeContainer({
      items: [item("wi_1", "cust_1", false, new Date(Date.now() - 60 * 60 * 1000))],
    })
    await run(container)

    expect(updateWishlistItems).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("skips a customer with no email and still writes the updates", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer({
      customers: [customer("cust_1", "sari@example.com"), customer("cust_2", null)],
    })
    await run(container)

    expect(updateWishlistItems).toHaveBeenCalledWith([
      { id: "wi_1", available: true },
      { id: "wi_2", available: true },
    ])
    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(createNotifications.mock.calls[0][0].to).toBe("sari@example.com")
    expect(alertedCalls(updateWishlistItems)).toEqual([
      [[{ id: "wi_1", alerted_at: expect.any(Date) }]],
    ])
    expect(logger.warn).toHaveBeenCalledWith(
      "The wishlist-alert email for customer cust_2 was not sent. The customer has no email address."
    )
  })

  it("skips a customer that does not exist", async () => {
    const { container, createNotifications, logger } = makeContainer({
      customers: [customer("cust_1", "sari@example.com")],
    })
    await run(container)

    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      "The wishlist-alert email for customer cust_2 was not sent. The customer has no email address."
    )
  })

  it("skips an inventory item with no variant", async () => {
    readStock.mockResolvedValue(null)
    const { container, createNotifications, listWishlistItems, updateWishlistItems, logger } =
      makeContainer()
    await expect(run(container)).resolves.toBeUndefined()

    expect(listWishlistItems).not.toHaveBeenCalled()
    expect(updateWishlistItems).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("handles each inventory item of an array payload once", async () => {
    idsOfEvent.mockResolvedValue(["iitem_1", "iitem_2"])
    readStock.mockImplementation(async (_scope, id: string) =>
      id === "iitem_1" ? stock(3) : stock(0, { variant_id: "variant_2", inventory_item_id: id })
    )
    const { container, listWishlistItems } = makeContainer()
    await run(container, [{ id: "ilev_1" }, { id: "ilev_2" }])

    expect(readStock.mock.calls.map(([, id]) => id)).toEqual(["iitem_1", "iitem_2"])
    expect(listWishlistItems.mock.calls.map(([filters]) => filters)).toEqual([
      { product_variant_id: "variant_1" },
      { product_variant_id: "variant_2" },
    ])
  })

  it("sends one email per customer with all the variants of the event", async () => {
    idsOfEvent.mockResolvedValue(["iitem_1", "iitem_2"])
    readStock.mockImplementation(async (_scope, id: string) =>
      id === "iitem_1"
        ? stock(3)
        : stock(2, {
            variant_id: "variant_2",
            variant_title: "L / Black",
            inventory_item_id: id,
          })
    )
    readPrices.mockImplementation(
      async (_scope, [variantId]: string[]) =>
        new Map([[variantId, variantId === "variant_1" ? 150000 : 160000]])
    )
    const { container, listWishlistItems, createNotifications, updateWishlistItems } =
      makeContainer({ customers: [customer("cust_1", "sari@example.com")] })
    listWishlistItems.mockImplementation(async ({ product_variant_id }) =>
      product_variant_id === "variant_1"
        ? [item("wi_1", "cust_1", false)]
        : [{ ...item("wi_4", "cust_1", false), product_variant_id: "variant_2" }]
    )
    await run(container)

    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(
      createNotifications.mock.calls[0][0].data.back_in_stock.map(
        (entry: { variant_title: string }) => entry.variant_title
      )
    ).toEqual(["M / Black", "L / Black"])
    expect(updateWishlistItems).toHaveBeenCalledWith([
      { id: "wi_1", alerted_at: expect.any(Date) },
      { id: "wi_4", alerted_at: expect.any(Date) },
    ])
  })

  it("keeps the items out of stock and sends nothing when the variant has no price", async () => {
    readPrices.mockResolvedValue(new Map([["variant_1", null]]))
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer()
    await run(container)

    expect(updateWishlistItems).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The back in stock alerts for variant variant_1 were not sent. The variant has no price."
    )
  })

  it("keeps the items out of stock and sends nothing without STOREFRONT_URL", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer({
      storefrontUrl: "",
    })
    await run(container)

    expect(updateWishlistItems).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The back in stock alerts for variant variant_1 were not sent. STOREFRONT_URL has no value."
    )
  })

  it("writes an error for a failed send, does not write alerted_at, and sends the others", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer()
    createNotifications.mockRejectedValueOnce(new Error("Brevo is down"))
    await expect(run(container)).resolves.toBeUndefined()

    expect(createNotifications).toHaveBeenCalledTimes(2)
    expect(alertedCalls(updateWishlistItems)).toEqual([
      [[{ id: "wi_2", alerted_at: expect.any(Date) }]],
    ])
    expect(logger.error).toHaveBeenCalledWith(
      "The wishlist-alert email for customer cust_1 failed. Cause: Brevo is down"
    )
  })

  it("checks each inventory item inside a lock, so two events cannot alert one item twice", async () => {
    const { container, execute, listWishlistItems } = makeContainer()
    execute.mockImplementation(async (key: string, fn: () => Promise<unknown>) => {
      expect(listWishlistItems).not.toHaveBeenCalled()
      const result = await fn()
      expect(listWishlistItems).toHaveBeenCalled()
      return result
    })
    await run(container)

    expect(execute).toHaveBeenCalledWith("wishlist-back-in-stock:iitem_1", expect.any(Function))
  })

  it("logs a missing alerted_at apart from a failed send", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer()
    updateWishlistItems.mockImplementation(async (updates: Record<string, unknown>[]) => {
      if (updates.some((update) => "alerted_at" in update)) {
        throw new Error("DB is down")
      }
      return []
    })
    await expect(run(container)).resolves.toBeUndefined()

    expect(createNotifications).toHaveBeenCalledTimes(2)
    expect(logger.error).toHaveBeenCalledWith(
      "The wishlist-alert email for customer cust_1 was sent, but alerted_at was not saved. Cause: DB is down"
    )
  })

  it("writes an error for a failed inventory item and handles the next one", async () => {
    idsOfEvent.mockResolvedValue(["iitem_1", "iitem_2"])
    readStock.mockRejectedValueOnce(new Error("Query is down")).mockResolvedValueOnce(stock(3))
    const { container, createNotifications, logger } = makeContainer()
    await expect(run(container)).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(
      "The back in stock check for inventory item iitem_1 failed. Cause: Query is down"
    )
    expect(createNotifications).toHaveBeenCalledTimes(2)
  })

  it("writes an error and does not throw when the event cannot be read", async () => {
    idsOfEvent.mockRejectedValue(new Error("Inventory is down"))
    const { container, createNotifications, logger } = makeContainer()
    await expect(run(container)).resolves.toBeUndefined()

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      "The back in stock check for event inventory-level.updated failed. Cause: Inventory is down"
    )
  })

  it("writes an error and does not throw when the customers cannot be read", async () => {
    const { container, createNotifications, listCustomers, logger } = makeContainer()
    listCustomers.mockRejectedValue(new Error("Customer is down"))
    await expect(run(container)).resolves.toBeUndefined()

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      "The back in stock alerts of event inventory-level.updated failed. Cause: Customer is down"
    )
  })
})
