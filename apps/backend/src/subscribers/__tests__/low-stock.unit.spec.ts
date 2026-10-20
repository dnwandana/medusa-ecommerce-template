import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readVariantStock, STOCK_EVENTS, type VariantStock } from "../../lib/variant-stock"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import lowStockHandler, { config } from "../low-stock"

// Only the stock read is a mock. The event id helper is the real one, so the tests also cover the
// deduplication of the ids.
jest.mock("../../lib/variant-stock", () => ({
  ...jest.requireActual("../../lib/variant-stock"),
  readVariantStock: jest.fn(),
}))

const readVariantStockMock = readVariantStock as jest.MockedFunction<typeof readVariantStock>

const stock: VariantStock = {
  variant_id: "variant_1",
  product_id: "prod_1",
  product_title: "Medusa T-Shirt",
  variant_title: "M / Black",
  sku: "SHIRT-M-BLACK",
  thumbnail: null,
  manage_inventory: true,
  allow_backorder: false,
  available: 3,
  inventory_item_id: "iitem_1",
}

type ContainerOptions = {
  threshold?: number
  contactEmail?: string | null
  metadata?: Record<string, unknown> | null
}

const makeContainer = ({
  threshold = 5,
  contactEmail = "hello@everyday.id",
  metadata = null,
}: ContainerOptions = {}) => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const createNotifications = jest.fn().mockResolvedValue({})
  const getSettings = jest.fn().mockResolvedValue({
    new_badge_days: 30,
    low_stock_threshold: threshold,
    price_limits: [],
  })
  const inventory = {
    listInventoryLevels: jest.fn().mockResolvedValue([{ inventory_item_id: "iitem_1" }]),
    listReservationItems: jest.fn().mockResolvedValue([{ inventory_item_id: "iitem_1" }]),
    retrieveInventoryItem: jest.fn().mockResolvedValue({ id: "iitem_1", metadata }),
    updateInventoryItems: jest.fn().mockResolvedValue({}),
  }
  const execute = jest.fn((_key: string, fn: () => Promise<unknown>) => fn())
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { backendUrl: "/" } },
    [Modules.LOCKING]: { execute },
    [Modules.NOTIFICATION]: { createNotifications },
    [Modules.INVENTORY]: inventory,
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
    [STOREFRONT_MODULE]: { getSettings },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: contactEmail, whatsapp: null }),
    },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, logger, createNotifications, getSettings, inventory, execute }
}

const run = (container: any, name = "reservation-item.created", data: unknown = { id: "res_1" }) =>
  lowStockHandler({ event: { name, data }, container, pluginOptions: {} } as any)

describe("low-stock subscriber", () => {
  const ownerEmail = process.env.STORE_OWNER_EMAIL

  beforeEach(() => {
    readVariantStockMock.mockReset()
    readVariantStockMock.mockResolvedValue({ ...stock })
    process.env.STORE_OWNER_EMAIL = ""
  })

  afterAll(() => {
    if (ownerEmail === undefined) {
      delete process.env.STORE_OWNER_EMAIL
    } else {
      process.env.STORE_OWNER_EMAIL = ownerEmail
    }
  })

  it("listens to the four stock events", () => {
    expect(config.event).toEqual(STOCK_EVENTS)
  })

  it("sends the alert at the crossing and writes the mark", async () => {
    const { container, createNotifications, inventory } = makeContainer({
      metadata: { supplier: "Acme" },
    })

    await run(container)

    expect(inventory.listReservationItems).toHaveBeenCalledWith(
      { id: ["res_1"] },
      { withDeleted: true }
    )
    expect(readVariantStockMock).toHaveBeenCalledWith(container, "iitem_1")
    expect(createNotifications).toHaveBeenCalledTimes(1)
    const call = createNotifications.mock.calls[0][0]
    expect(call.template).toBe("low-stock-owner")
    expect(call.channel).toBe("email")
    expect(call.to).toBe("hello@everyday.id")
    expect(call.data).toEqual({
      store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
      threshold: 5,
      product_title: "Medusa T-Shirt",
      variant_title: "M / Black",
      sku: "SHIRT-M-BLACK",
      available: 3,
      admin_url: "http://localhost:9000/app/products/prod_1",
    })
    expect(inventory.updateInventoryItems).toHaveBeenCalledWith({
      id: "iitem_1",
      metadata: { supplier: "Acme", low_stock_alerted_at: expect.any(String) },
    })
    const written = inventory.updateInventoryItems.mock.calls[0][0].metadata.low_stock_alerted_at
    expect(new Date(written).toISOString()).toBe(written)
  })

  it("sends the alert at exactly the threshold", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 5 })
    const { container, createNotifications } = makeContainer()

    await run(container)

    expect(createNotifications).toHaveBeenCalledTimes(1)
  })

  it("sends nothing below the threshold when the mark exists", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 2 })
    const { container, createNotifications, inventory } = makeContainer({
      metadata: { low_stock_alerted_at: "2026-10-19T10:00:00.000Z" },
    })

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
  })

  it("removes the mark above the threshold and keeps the other keys", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 9 })
    const { container, createNotifications, inventory } = makeContainer({
      metadata: { supplier: "Acme", low_stock_alerted_at: "2026-10-19T10:00:00.000Z" },
    })

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    // Medusa merges the metadata of an update. Only an empty string removes a key.
    expect(inventory.updateInventoryItems).toHaveBeenCalledWith({
      id: "iitem_1",
      metadata: { supplier: "Acme", low_stock_alerted_at: "" },
    })
  })

  it("does nothing above the threshold with no mark", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 9 })
    const { container, createNotifications, inventory } = makeContainer()

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
  })

  it("never sends for a variant with manage_inventory false", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, manage_inventory: false, available: 0 })
    const { container, createNotifications, inventory } = makeContainer()

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
  })

  it("handles an array payload once per id", async () => {
    const { container, inventory, createNotifications } = makeContainer()
    // Two levels of one inventory item, for example two stock locations.
    inventory.listInventoryLevels.mockResolvedValue([
      { inventory_item_id: "iitem_1" },
      { inventory_item_id: "iitem_1" },
    ])

    await run(container, "inventory-level.updated", [
      { id: "lvl_1" },
      { id: "lvl_1" },
      { id: "lvl_2" },
    ])

    expect(inventory.listInventoryLevels).toHaveBeenCalledWith({ id: ["lvl_1", "lvl_2"] })
    expect(readVariantStockMock).toHaveBeenCalledTimes(1)
    expect(createNotifications).toHaveBeenCalledTimes(1)
  })

  it("does nothing at threshold 0, even at 0 stock", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 0 })
    const { container, createNotifications, getSettings, inventory } = makeContainer({
      threshold: 0,
    })

    await run(container)

    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(readVariantStockMock).not.toHaveBeenCalled()
    expect(inventory.listReservationItems).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
  })

  it("reads the threshold once for several inventory items", async () => {
    const { container, getSettings, inventory } = makeContainer()
    inventory.listReservationItems.mockResolvedValue([
      { inventory_item_id: "iitem_1" },
      { inventory_item_id: "iitem_2" },
    ])

    await run(container, "reservation-item.deleted", [{ id: "res_1" }, { id: "res_2" }])

    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(readVariantStockMock).toHaveBeenCalledTimes(2)
  })

  it("skips an inventory item with no variant", async () => {
    readVariantStockMock.mockResolvedValue(null)
    const { container, createNotifications, inventory, logger } = makeContainer()

    await expect(run(container)).resolves.toBeUndefined()

    expect(inventory.retrieveInventoryItem).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("warns and writes no mark when the owner email is empty", async () => {
    const { container, createNotifications, inventory, logger } = makeContainer({
      contactEmail: null,
    })

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The owner email is empty. The low stock email for inventory item iitem_1 was not sent. Set the store contact email or STORE_OWNER_EMAIL."
    )
  })

  it("writes no mark and does not throw when the send fails", async () => {
    const { container, createNotifications, inventory, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("Brevo is down"))

    await expect(run(container)).resolves.toBeUndefined()

    expect(inventory.updateInventoryItems).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      "The low stock check for inventory item iitem_1 failed. Cause: Brevo is down"
    )
  })

  it("checks each inventory item inside a lock, so two events cannot send two alerts", async () => {
    readVariantStockMock.mockResolvedValue({ ...stock, available: 3 })
    const { container, execute, inventory } = makeContainer()
    execute.mockImplementation(async (key: string, fn: () => Promise<unknown>) => {
      expect(inventory.retrieveInventoryItem).not.toHaveBeenCalled()
      const result = await fn()
      expect(inventory.updateInventoryItems).toHaveBeenCalled()
      return result
    })

    await run(container)

    expect(execute).toHaveBeenCalledWith("low-stock:iitem_1", expect.any(Function))
  })

  it("continues with the next inventory item after an error", async () => {
    const { container, createNotifications, inventory, logger } = makeContainer()
    inventory.listReservationItems.mockResolvedValue([
      { inventory_item_id: "iitem_1" },
      { inventory_item_id: "iitem_2" },
    ])
    readVariantStockMock
      .mockRejectedValueOnce(new Error("query failed"))
      .mockResolvedValueOnce({ ...stock, inventory_item_id: "iitem_2" })

    await run(container, "reservation-item.created", [{ id: "res_1" }, { id: "res_2" }])

    expect(logger.error).toHaveBeenCalledWith(
      "The low stock check for inventory item iitem_1 failed. Cause: query failed"
    )
    expect(createNotifications).toHaveBeenCalledTimes(1)
  })

  it("logs the error and does not throw when the settings read fails", async () => {
    const { container, getSettings, createNotifications, logger } = makeContainer()
    getSettings.mockRejectedValue(new Error("db down"))

    await expect(run(container)).resolves.toBeUndefined()

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      "The low stock check for event reservation-item.created failed. Cause: db down"
    )
  })
})
