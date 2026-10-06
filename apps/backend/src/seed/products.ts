import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

export type SeedProductsInput = {
  salesChannelId: string
  shippingProfileId: string
  stockLocationId: string
}

type SampleVariant = { title: string; sku: string; weight: number; price: number }

type SampleProduct = {
  handle: string
  title: string
  description: string
  category: string
  option: { title: string; values: string[] }
  variants: SampleVariant[]
}

const STOCK_QUANTITY = 100
const CURRENCY = "idr"

// Weights are in grams. Prices are in whole rupiah.
const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    handle: "plain-t-shirt",
    title: "Plain T-Shirt",
    description: "A cotton T-shirt in one color.",
    category: "Apparel",
    option: { title: "Size", values: ["S", "M", "L"] },
    variants: [
      { title: "S", sku: "TSHIRT-S", weight: 200, price: 150000 },
      { title: "M", sku: "TSHIRT-M", weight: 200, price: 150000 },
      { title: "L", sku: "TSHIRT-L", weight: 200, price: 150000 },
    ],
  },
  {
    handle: "canvas-tote-bag",
    title: "Canvas Tote Bag",
    description: "A strong canvas bag for daily use.",
    category: "Apparel",
    option: { title: "Type", values: ["Default"] },
    variants: [{ title: "Default", sku: "TOTE-DEFAULT", weight: 300, price: 85000 }],
  },
  {
    handle: "cast-iron-pan",
    title: "Cast Iron Pan",
    description: "A heavy pan that keeps the heat.",
    category: "Kitchen",
    option: { title: "Type", values: ["Default"] },
    variants: [{ title: "Default", sku: "PAN-DEFAULT", weight: 1200, price: 350000 }],
  },
]

const HANDLES = SAMPLE_PRODUCTS.map((product) => product.handle)
const SKUS = SAMPLE_PRODUCTS.flatMap((product) => product.variants.map((variant) => variant.sku))

// Creates the sample categories and products. It skips each record that exists already.
export async function seedProducts(
  container: MedusaContainer,
  input: SeedProductsInput
): Promise<{ productIds: string[] }> {
  const categoryIds = await findOrCreateCategories(container)
  await createAbsentProducts(container, input, categoryIds)
  await createAbsentInventoryLevels(container, input.stockLocationId)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { handle: HANDLES },
  })
  return { productIds: products.map((product) => product.id) }
}

// Returns the category id for each category name.
async function findOrCreateCategories(container: MedusaContainer): Promise<Record<string, string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const names = [...new Set(SAMPLE_PRODUCTS.map((product) => product.category))]

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: { name: names },
  })
  const ids: Record<string, string> = Object.fromEntries(
    existing.map((category) => [category.name, category.id])
  )

  const absent = names.filter((name) => !ids[name])
  if (absent.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: absent.map((name) => ({ name, is_active: true })) },
    })
    for (const category of result) {
      ids[category.name] = category.id
    }
  }

  return ids
}

async function createAbsentProducts(
  container: MedusaContainer,
  input: SeedProductsInput,
  categoryIds: Record<string, string>
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: HANDLES },
  })
  const existingHandles = new Set(existing.map((product) => product.handle))
  const absent = SAMPLE_PRODUCTS.filter((product) => !existingHandles.has(product.handle))
  if (absent.length === 0) {
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: absent.map((product) => ({
        title: product.title,
        handle: product.handle,
        description: product.description,
        status: ProductStatus.PUBLISHED,
        category_ids: [categoryIds[product.category]],
        // The shipping price uses only the items whose product has this profile.
        shipping_profile_id: input.shippingProfileId,
        sales_channels: [{ id: input.salesChannelId }],
        options: [product.option],
        variants: product.variants.map((variant) => ({
          title: variant.title,
          sku: variant.sku,
          weight: variant.weight,
          options: { [product.option.title]: variant.title },
          prices: [{ amount: variant.price, currency_code: CURRENCY }],
        })),
      })),
    },
  })
}

// Gives stock to each sample inventory item that has no level at the warehouse.
// The SKU filter keeps the seed away from the items that a developer creates.
async function createAbsentInventoryLevels(
  container: MedusaContainer,
  stockLocationId: string
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.location_id"],
    filters: { sku: SKUS },
  })
  const itemsWithoutLevel = inventoryItems.filter(
    (item) => !(item.location_levels ?? []).some((level) => level?.location_id === stockLocationId)
  )
  if (itemsWithoutLevel.length === 0) {
    return
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: itemsWithoutLevel.map((item) => ({
        location_id: stockLocationId,
        stocked_quantity: STOCK_QUANTITY,
        inventory_item_id: item.id,
      })),
    },
  })
}
