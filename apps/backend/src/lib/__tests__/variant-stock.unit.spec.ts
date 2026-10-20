import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  Modules,
} from "@medusajs/framework/utils"
import {
  inventoryItemIdsOfEvent,
  isInStock,
  readVariantStock,
  STOCK_EVENTS,
  VARIANT_STOCK_FIELDS,
} from "../variant-stock"

jest.mock("@medusajs/framework/utils", () => ({
  ...jest.requireActual("@medusajs/framework/utils"),
  getVariantAvailability: jest.fn(),
}))

const availability = getVariantAvailability as jest.Mock

const item = {
  id: "iitem_1",
  variants: [
    {
      id: "var_1",
      title: "M / Black",
      sku: "SHIRT-M-BLACK",
      manage_inventory: true,
      allow_backorder: false,
      product_id: "prod_1",
      product: { id: "prod_1", title: "Medusa T-Shirt", thumbnail: "https://cdn/x.jpg" },
    },
  ],
}

const levels: Record<string, { id: string; inventory_item_id: string }> = {
  lvl_1: { id: "lvl_1", inventory_item_id: "iitem_1" },
  lvl_2: { id: "lvl_2", inventory_item_id: "iitem_2" },
  lvl_3: { id: "lvl_3", inventory_item_id: "iitem_1" },
}

const reservations: Record<string, { id: string; inventory_item_id: string }> = {
  res_1: { id: "res_1", inventory_item_id: "iitem_1" },
}

const rowsOf =
  <T>(rows: Record<string, T>) =>
  async ({ id }: { id: string[] }) =>
    id.flatMap((key) => rows[key] ?? [])

const scopeWith = (items: unknown[], salesChannels: { id: string }[] = [{ id: "sc_1" }]) => {
  const graph = jest.fn().mockResolvedValue({ data: items })
  const listSalesChannels = jest.fn().mockResolvedValue(salesChannels)
  const listInventoryLevels = jest.fn(rowsOf(levels))
  const listReservationItems = jest.fn(rowsOf(reservations))
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [Modules.SALES_CHANNEL]: { listSalesChannels },
    [Modules.INVENTORY]: { listInventoryLevels, listReservationItems },
  }
  const scope = { resolve: (key: string) => registry[key] } as any
  return Object.assign(scope, { graph, listInventoryLevels, listReservationItems })
}

beforeEach(() => {
  availability.mockReset()
})

describe("readVariantStock", () => {
  it("reads the variant, the product, and the available stock", async () => {
    availability.mockResolvedValue({ var_1: { availability: 3, sales_channel_id: "sc_1" } })
    const scope = scopeWith([item])

    const stock = await readVariantStock(scope, "iitem_1")

    expect(stock).toEqual({
      variant_id: "var_1",
      product_id: "prod_1",
      product_title: "Medusa T-Shirt",
      variant_title: "M / Black",
      sku: "SHIRT-M-BLACK",
      thumbnail: "https://cdn/x.jpg",
      manage_inventory: true,
      allow_backorder: false,
      available: 3,
      inventory_item_id: "iitem_1",
    })
    expect(scope.graph).toHaveBeenCalledWith({
      entity: "inventory_item",
      fields: VARIANT_STOCK_FIELDS,
      filters: { id: "iitem_1" },
    })
    expect(availability).toHaveBeenCalledWith(expect.anything(), {
      variant_ids: ["var_1"],
      sales_channel_id: "sc_1",
    })
  })

  it("uses the variant thumbnail before the product thumbnail", async () => {
    availability.mockResolvedValue({ var_1: { availability: 3, sales_channel_id: "sc_1" } })
    const withThumbnail = {
      ...item,
      variants: [{ ...item.variants[0], thumbnail: "https://cdn/variant.jpg" }],
    }

    const stock = await readVariantStock(scopeWith([withThumbnail]), "iitem_1")

    expect(stock?.thumbnail).toBe("https://cdn/variant.jpg")
  })

  it("returns null for an item with no variant", async () => {
    await expect(
      readVariantStock(scopeWith([{ id: "iitem_1", variants: [] }]), "iitem_1")
    ).resolves.toBeNull()
    await expect(
      readVariantStock(scopeWith([{ id: "iitem_1", variants: [null] }]), "iitem_1")
    ).resolves.toBeNull()
    expect(availability).not.toHaveBeenCalled()
  })

  it("returns null for a missing item", async () => {
    await expect(readVariantStock(scopeWith([]), "iitem_x")).resolves.toBeNull()
  })

  it("gives 0 when the variant has no stock data or the store has no sales channel", async () => {
    availability.mockResolvedValue({ var_1: { availability: null, sales_channel_id: "sc_1" } })
    await expect(readVariantStock(scopeWith([item]), "iitem_1")).resolves.toMatchObject({
      available: 0,
    })

    availability.mockClear()
    await expect(readVariantStock(scopeWith([item], []), "iitem_1")).resolves.toMatchObject({
      available: 0,
    })
    expect(availability).not.toHaveBeenCalled()
  })
})

describe("isInStock", () => {
  it("decides the stock rule", () => {
    expect(isInStock({ manage_inventory: false, allow_backorder: false, available: 0 })).toBe(true)
    expect(isInStock({ manage_inventory: true, allow_backorder: true, available: 0 })).toBe(true)
    expect(isInStock({ manage_inventory: true, allow_backorder: false, available: 0 })).toBe(false)
    expect(isInStock({ manage_inventory: true, allow_backorder: false, available: 1 })).toBe(true)
  })
})

describe("inventoryItemIdsOfEvent", () => {
  it("resolves the inventory items of both event shapes", async () => {
    const scope = scopeWith([])
    await expect(
      inventoryItemIdsOfEvent(scope, "inventory-level.updated", [{ id: "lvl_1" }, { id: "lvl_2" }])
    ).resolves.toEqual(["iitem_1", "iitem_2"])
    await expect(
      inventoryItemIdsOfEvent(scope, "reservation-item.created", { id: "res_1" })
    ).resolves.toEqual(["iitem_1"])
    await expect(
      inventoryItemIdsOfEvent(scope, "reservation-item.deleted", { id: "res_gone" })
    ).resolves.toEqual([])
  })

  it("removes the duplicates", async () => {
    const scope = scopeWith([])
    await expect(
      inventoryItemIdsOfEvent(scope, "inventory-level.updated", [
        { id: "lvl_1" },
        { id: "lvl_3" },
        { id: "lvl_1" },
      ])
    ).resolves.toEqual(["iitem_1"])
    expect(scope.listInventoryLevels).toHaveBeenCalledWith({ id: ["lvl_1", "lvl_3"] })
  })

  it("reads the soft-deleted reservations too", async () => {
    const scope = scopeWith([])
    await inventoryItemIdsOfEvent(scope, "reservation-item.deleted", { id: "res_1" })
    expect(scope.listReservationItems).toHaveBeenCalledWith(
      { id: ["res_1"] },
      { withDeleted: true }
    )
  })

  it("returns an empty list for a payload with no id or another event", async () => {
    const scope = scopeWith([])
    await expect(inventoryItemIdsOfEvent(scope, "inventory-level.updated", {})).resolves.toEqual([])
    await expect(
      inventoryItemIdsOfEvent(scope, "inventory-level.updated", undefined)
    ).resolves.toEqual([])
    await expect(
      inventoryItemIdsOfEvent(scope, "product.updated", { id: "prod_1" })
    ).resolves.toEqual([])
    expect(scope.listInventoryLevels).not.toHaveBeenCalled()
    expect(scope.listReservationItems).not.toHaveBeenCalled()
  })
})

describe("STOCK_EVENTS", () => {
  it("lists the level and reservation events", () => {
    expect(STOCK_EVENTS).toEqual([
      "inventory-level.updated",
      "reservation-item.created",
      "reservation-item.updated",
      "reservation-item.deleted",
    ])
  })
})
