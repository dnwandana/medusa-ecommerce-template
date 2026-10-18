import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  batchImageVariantsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductTagsWorkflow,
} from "@medusajs/medusa/core-flows"
import { FABRIC_TAG_PREFIX } from "../lib/option-names"

export type SeedProductsInput = {
  salesChannelId: string
  shippingProfileId: string
  stockLocationId: string
}

type SampleVariant = { options: Record<string, string>; sku: string; weight: number; price: number }

type SampleProduct = {
  handle: string
  title: string
  description: string
  category: string
  options: { title: string; values: string[] }[]
  // Each image shows one colour. The seed links the image to the variants of that colour.
  images?: { url: string; colour: string }[]
  tags?: string[]
  variants: SampleVariant[]
}

// The seed creates a parent category before its child.
const SAMPLE_CATEGORIES: { name: string; parent?: string }[] = [
  { name: "Clothing" },
  { name: "Apparel", parent: "Clothing" },
  { name: "Kitchen" },
]

const STOCK_QUANTITY = 100
const CURRENCY = "idr"
const COLOUR_OPTION = "Colour"
const IMAGE_BASE_URL = "https://medusa-public-images.s3.eu-west-1.amazonaws.com"

const SHIRT_SIZES = ["S", "M", "L"]
const SHIRT_COLOURS = ["Black", "White"]

// Weights are in grams. Prices are in whole rupiah.
const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    handle: "plain-t-shirt",
    title: "Plain T-Shirt",
    description: "A cotton T-shirt in one color.",
    category: "Apparel",
    options: [
      { title: "Size", values: SHIRT_SIZES },
      { title: COLOUR_OPTION, values: SHIRT_COLOURS },
    ],
    images: [
      { url: `${IMAGE_BASE_URL}/tee-black-front.png`, colour: "Black" },
      { url: `${IMAGE_BASE_URL}/tee-white-front.png`, colour: "White" },
    ],
    tags: [`${FABRIC_TAG_PREFIX} Cotton`],
    variants: SHIRT_SIZES.flatMap((size) =>
      SHIRT_COLOURS.map((colour) => ({
        options: { Size: size, [COLOUR_OPTION]: colour },
        sku: `TSHIRT-${size}-${colour.toUpperCase()}`,
        weight: 200,
        price: 150000,
      }))
    ),
  },
  {
    handle: "canvas-tote-bag",
    title: "Canvas Tote Bag",
    description: "A strong canvas bag for daily use.",
    category: "Apparel",
    options: [{ title: "Type", values: ["Default"] }],
    variants: [{ options: { Type: "Default" }, sku: "TOTE-DEFAULT", weight: 300, price: 85000 }],
  },
  {
    handle: "cast-iron-pan",
    title: "Cast Iron Pan",
    description: "A heavy pan that keeps the heat.",
    category: "Kitchen",
    options: [{ title: "Type", values: ["Default"] }],
    variants: [{ options: { Type: "Default" }, sku: "PAN-DEFAULT", weight: 1200, price: 350000 }],
  },
]

const HANDLES = SAMPLE_PRODUCTS.map((product) => product.handle)
const SKUS = SAMPLE_PRODUCTS.flatMap((product) => product.variants.map((variant) => variant.sku))

// Returns the variant title, for example "M / Black".
const variantTitle = (variant: SampleVariant) => Object.values(variant.options).join(" / ")

// Creates the sample categories, tags and products. It skips each record that exists already.
export async function seedProducts(
  container: MedusaContainer,
  input: SeedProductsInput
): Promise<{ productIds: string[] }> {
  const categoryIds = await findOrCreateCategories(container)
  const tagIds = await findOrCreateTags(container)
  await createAbsentProducts(container, input, categoryIds, tagIds)
  await createAbsentInventoryLevels(container, input.stockLocationId)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { handle: HANDLES },
  })
  return { productIds: products.map((product) => product.id) }
}

// Returns the category id for each category name. The first call creates the top-level
// categories, so that the second call can give their ids to the child categories.
async function findOrCreateCategories(container: MedusaContainer): Promise<Record<string, string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const names = SAMPLE_CATEGORIES.map((category) => category.name)

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: { name: names },
  })
  const ids: Record<string, string> = Object.fromEntries(
    existing.map((category) => [category.name, category.id])
  )

  const absent = SAMPLE_CATEGORIES.filter((category) => !ids[category.name])
  for (const level of [absent.filter((c) => !c.parent), absent.filter((c) => c.parent)]) {
    if (level.length === 0) {
      continue
    }
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: level.map((category) => ({
          name: category.name,
          is_active: true,
          ...(category.parent ? { parent_category_id: ids[category.parent] } : {}),
        })),
      },
    })
    for (const category of result) {
      ids[category.name] = category.id
    }
  }

  return ids
}

// Returns the tag id for each tag value.
async function findOrCreateTags(container: MedusaContainer): Promise<Record<string, string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const values = [...new Set(SAMPLE_PRODUCTS.flatMap((product) => product.tags ?? []))]
  if (values.length === 0) {
    return {}
  }

  const { data: existing } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
    filters: { value: values },
  })
  const ids: Record<string, string> = Object.fromEntries(existing.map((tag) => [tag.value, tag.id]))

  const absent = values.filter((value) => !ids[value])
  if (absent.length > 0) {
    const { result } = await createProductTagsWorkflow(container).run({
      input: { product_tags: absent.map((value) => ({ value })) },
    })
    for (const tag of result) {
      ids[tag.value] = tag.id
    }
  }

  return ids
}

async function createAbsentProducts(
  container: MedusaContainer,
  input: SeedProductsInput,
  categoryIds: Record<string, string>,
  tagIds: Record<string, string>
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
        tag_ids: (product.tags ?? []).map((value) => tagIds[value]),
        images: (product.images ?? []).map((image) => ({ url: image.url })),
        thumbnail: product.images?.[0]?.url,
        // The shipping price uses only the items whose product has this profile.
        shipping_profile_id: input.shippingProfileId,
        sales_channels: [{ id: input.salesChannelId }],
        options: product.options,
        variants: product.variants.map((variant) => ({
          title: variantTitle(variant),
          sku: variant.sku,
          weight: variant.weight,
          options: variant.options,
          prices: [{ amount: variant.price, currency_code: CURRENCY }],
        })),
      })),
    },
  })

  await linkImagesToVariants(container, absent)
}

// Links each image to the variants of its colour. It reads only the products that this run
// created, so a second run adds no link.
async function linkImagesToVariants(
  container: MedusaContainer,
  created: SampleProduct[]
): Promise<void> {
  const withImages = created.filter((product) => (product.images ?? []).length > 0)
  if (withImages.length === 0) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "handle",
      "images.id",
      "images.url",
      "variants.id",
      "variants.options.value",
      "variants.options.option.title",
    ],
    filters: { handle: withImages.map((product) => product.handle) },
  })

  for (const product of products) {
    const sample = withImages.find((item) => item.handle === product.handle)!
    for (const image of product.images ?? []) {
      const colour = sample.images!.find((item) => item.url === image?.url)?.colour
      if (!image || !colour) {
        continue
      }
      const variantIds = (product.variants ?? [])
        .filter((variant) =>
          (variant?.options ?? []).some(
            (option) => option?.option?.title === COLOUR_OPTION && option.value === colour
          )
        )
        .map((variant) => variant!.id)
      if (variantIds.length > 0) {
        await batchImageVariantsWorkflow(container).run({
          input: { image_id: image.id, add: variantIds },
        })
      }
    }
  }
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
