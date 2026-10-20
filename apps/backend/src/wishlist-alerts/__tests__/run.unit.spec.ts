import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import { batchOffset, PRICE_DROP_BATCH } from "../price-drop"
import { runPriceDrops } from "../run"

const NOW = new Date("2026-10-20T21:00:00Z")

type TestItem = {
  id: string
  wishlist_id: string
  product_variant_id: string
  saved_unit_price: number | null
  wishlist: { id: string; customer_id: string }
}

const item = (id: string, customerId: string, variantId: string, saved: number | null) => ({
  id,
  wishlist_id: `wl_${customerId}`,
  product_variant_id: variantId,
  saved_unit_price: saved,
  wishlist: { id: `wl_${customerId}`, customer_id: customerId },
})

const CUSTOMERS = [
  { id: "cus_1", email: "sari@example.com", first_name: "Sari", metadata: { locale: "en-US" } },
  { id: "cus_2", email: "budi@example.com", first_name: null, metadata: { locale: "id-ID" } },
]

const VARIANTS = [
  {
    id: "var_a",
    title: "M / Black",
    thumbnail: null,
    product: { title: "Medusa T-Shirt", thumbnail: "https://cdn/x.jpg" },
  },
  {
    id: "var_b",
    title: "One size",
    thumbnail: "https://cdn/b.jpg",
    product: { title: "Canvas Tote", thumbnail: "https://cdn/tote.jpg" },
  },
]

const makeContainer = (
  items: TestItem[],
  {
    prices = new Map<string, number | null>(),
    customers = CUSTOMERS as Record<string, unknown>[],
    storefrontUrl = "https://shop.example.com",
    count = items.length,
  } = {}
) => {
  const listWishlistItems = jest.fn().mockResolvedValue(items)
  const listAndCountWishlistItems = jest.fn().mockResolvedValue([[], count])
  const updateWishlistItems = jest.fn().mockResolvedValue([])
  const createNotifications = jest.fn().mockResolvedValue({})
  const listCustomers = jest.fn(async ({ id }: { id: string[] }) =>
    customers.filter((c) => id.includes(c.id as string))
  )
  const listProductVariants = jest.fn(async ({ id }: { id: string[] }) =>
    VARIANTS.filter((v) => id.includes(v.id))
  )
  // readVariantPrices reads the region and then the calculated prices with Query.
  const graph = jest.fn(async ({ filters }: { filters: { id: string[] } }) => ({
    data: filters.id.map((id) => ({
      id,
      calculated_price: { calculated_amount: prices.get(id) ?? null },
    })),
  }))
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [WISHLIST_MODULE]: { listWishlistItems, listAndCountWishlistItems, updateWishlistItems },
    [Modules.CUSTOMER]: { listCustomers },
    [Modules.PRODUCT]: { listProductVariants },
    [Modules.REGION]: { listRegions: jest.fn().mockResolvedValue([{ id: "reg_id" }]) },
    [Modules.NOTIFICATION]: { createNotifications },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
    },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return {
    container,
    listWishlistItems,
    updateWishlistItems,
    createNotifications,
    listProductVariants,
    logger,
  }
}

const PRICES = new Map<string, number | null>([
  ["var_a", 256000],
  ["var_b", 100],
])

describe("runPriceDrops", () => {
  it("reads one batch of the items in id order", async () => {
    const { container, listWishlistItems, createNotifications } = makeContainer([])

    await expect(runPriceDrops(container, NOW)).resolves.toEqual({ sent: [], failed: [] })

    expect(listWishlistItems).toHaveBeenCalledWith(
      {},
      {
        take: PRICE_DROP_BATCH,
        skip: 0,
        relations: ["wishlist"],
        order: { id: "ASC" },
      }
    )
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("moves the batch with the day when there are more items than one batch", async () => {
    const { container, listWishlistItems } = makeContainer([], { count: 1200 })

    await runPriceDrops(container, NOW)

    expect(listWishlistItems).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ skip: batchOffset(1200, NOW) })
    )
  })

  it("sends one email per customer and saves the new prices", async () => {
    const { container, createNotifications, updateWishlistItems, listProductVariants } =
      makeContainer(
        [
          item("wi_1", "cus_1", "var_a", 320000),
          item("wi_2", "cus_1", "var_b", 100),
          item("wi_3", "cus_2", "var_a", 320000),
        ],
        { prices: PRICES }
      )

    const result = await runPriceDrops(container, NOW)

    expect(result).toEqual({ sent: ["cus_1", "cus_2"], failed: [] })
    expect(listProductVariants).toHaveBeenCalledWith({ id: ["var_a"] }, { relations: ["product"] })
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
        back_in_stock: [],
        price_drops: [
          {
            title: "Medusa T-Shirt",
            variant_title: "M / Black",
            thumbnail: "https://cdn/x.jpg",
            price: 256000,
            old_price: 320000,
          },
        ],
      },
    })
    const second = createNotifications.mock.calls[1][0]
    expect(second.to).toBe("budi@example.com")
    expect(second.data.locale).toBe("id-ID")
    expect(second.data.wishlist_url).toBe("https://shop.example.com/id/account/wishlist")
    expect(second.data.first_name).toBeNull()
    expect(updateWishlistItems.mock.calls).toEqual([
      [[{ id: "wi_1", saved_unit_price: 256000 }]],
      [[{ id: "wi_3", saved_unit_price: 256000 }]],
    ])
    // The saved price goes in after the send, so a failed send keeps the drop for the next run.
    expect(createNotifications.mock.invocationCallOrder[0]).toBeLessThan(
      updateWishlistItems.mock.invocationCallOrder[0]
    )
  })

  it("uses the variant thumbnail before the product thumbnail", async () => {
    const { container, createNotifications } = makeContainer(
      [item("wi_2", "cus_1", "var_b", 200)],
      { prices: PRICES }
    )

    await runPriceDrops(container, NOW)

    expect(createNotifications.mock.calls[0][0].data.price_drops).toEqual([
      {
        title: "Canvas Tote",
        variant_title: "One size",
        thumbnail: "https://cdn/b.jpg",
        price: 100,
        old_price: 200,
      },
    ])
  })

  it("fills null saved prices without a send", async () => {
    const { container, createNotifications, updateWishlistItems } = makeContainer(
      [item("wi_1", "cus_1", "var_a", null)],
      { prices: PRICES }
    )

    const result = await runPriceDrops(container, NOW)

    expect(result).toEqual({ sent: [], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateWishlistItems).toHaveBeenCalledWith([{ id: "wi_1", saved_unit_price: 256000 }])
  })

  it("continues after a failed send and keeps that customer's saved price", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer(
      [
        item("wi_1", "cus_1", "var_a", 320000),
        item("wi_4", "cus_1", "var_b", null),
        item("wi_3", "cus_2", "var_a", 320000),
      ],
      { prices: PRICES }
    )
    createNotifications.mockRejectedValueOnce(new Error("Brevo is down"))

    const result = await runPriceDrops(container, NOW)

    expect(result).toEqual({ sent: ["cus_2"], failed: ["cus_1"] })
    // The fill of a null saved price goes in at the end, also for a customer with a failed send.
    expect(updateWishlistItems.mock.calls).toEqual([
      [[{ id: "wi_3", saved_unit_price: 256000 }]],
      [[{ id: "wi_4", saved_unit_price: 100 }]],
    ])
    expect(logger.error).toHaveBeenCalledWith(
      "The price drop email for customer cus_1 failed. Cause: Brevo is down"
    )
  })

  it("skips a customer with no email and keeps the saved prices of that customer", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer(
      [item("wi_1", "cus_1", "var_a", 320000), item("wi_3", "cus_2", "var_a", 320000)],
      { prices: PRICES, customers: [{ ...CUSTOMERS[0], email: "" }, CUSTOMERS[1]] }
    )

    const result = await runPriceDrops(container, NOW)

    expect(result).toEqual({ sent: ["cus_2"], failed: [] })
    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(updateWishlistItems.mock.calls).toEqual([[[{ id: "wi_3", saved_unit_price: 256000 }]]])
    expect(logger.warn).toHaveBeenCalledWith(
      "The price drop email for customer cus_1 was not sent. The customer has no email address."
    )
  })

  it("sends nothing but fills the null saved prices when the storefront URL has no value", async () => {
    const { container, createNotifications, updateWishlistItems, logger } = makeContainer(
      [item("wi_1", "cus_1", "var_a", 320000), item("wi_4", "cus_1", "var_b", null)],
      { prices: PRICES, storefrontUrl: "" }
    )

    const result = await runPriceDrops(container, NOW)

    expect(result).toEqual({ sent: [], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateWishlistItems.mock.calls).toEqual([[[{ id: "wi_4", saved_unit_price: 100 }]]])
    expect(logger.warn).toHaveBeenCalledWith(
      "The price drop emails were not sent. STOREFRONT_URL has no value."
    )
  })
})
