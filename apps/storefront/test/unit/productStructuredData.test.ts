import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { productJsonLd } from "~/utils/productStructuredData"

type Product = HttpTypes.StoreProduct & { variants: HttpTypes.StoreProductVariant[] }

const variant = (id: string, options: Record<string, string>, amount: number, extra: object) =>
  ({
    id,
    options: Object.entries(options).map(([option_id, value]) => ({ option_id, value })),
    calculated_price: { calculated_amount: amount },
    manage_inventory: true,
    allow_backorder: false,
    ...extra,
  }) as unknown as HttpTypes.StoreProductVariant

const tee = {
  id: "prod_tee",
  title: "Plain T-Shirt",
  description: "A cotton T-shirt in one color.",
  thumbnail: null,
  options: [
    { id: "o_size", title: "Size" },
    { id: "o_col", title: "Colour" },
  ],
  variants: [
    variant("v_wl", { o_size: "L", o_col: "White" }, 150000, {
      sku: "TSHIRT-L-WHITE",
      inventory_quantity: 5,
      images: [{ id: "img_w" }],
    }),
    variant("v_bs", { o_size: "S", o_col: "Black" }, 150000, {
      sku: "TSHIRT-S-BLACK",
      inventory_quantity: 0,
      images: [{ id: "img_b" }],
    }),
  ],
  images: [
    { id: "img_w", url: "https://cdn.example/white.png", rank: 0 },
    { id: "img_b", url: "/black.png", rank: 1 },
  ],
} as unknown as Product

const tote = {
  id: "prod_tote",
  title: "Canvas Tote",
  description: "A canvas tote bag.",
  thumbnail: "https://cdn.example/tote.png",
  options: [{ id: "o_type", title: "Type" }],
  variants: [variant("v_tote", { o_type: "Default" }, 85000, { inventory_quantity: 3 })],
} as unknown as Product

const base = {
  canonicalUrl: "https://shop.example/products/plain-t-shirt",
  siteUrl: "https://shop.example",
  brand: "Everyday",
  rating: null,
}

describe("productJsonLd", () => {
  it("builds a ProductGroup with one Product for each variant", () => {
    const data = productJsonLd({ ...base, product: tee })!
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: "Plain T-Shirt",
      description: "A cotton T-shirt in one color.",
      url: base.canonicalUrl,
      productGroupID: "prod_tee",
      brand: { "@type": "Brand", name: "Everyday" },
      variesBy: ["https://schema.org/color", "https://schema.org/size"],
    })
    expect(data.hasVariant).toEqual([
      expect.objectContaining({
        "@type": "Product",
        sku: "TSHIRT-L-WHITE",
        name: "Plain T-Shirt – White, L",
        color: "White",
        size: "L",
        image: ["https://cdn.example/white.png"],
        offers: {
          "@type": "Offer",
          url: `${base.canonicalUrl}?variant=v_wl`,
          price: 150000,
          priceCurrency: "IDR",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      }),
      expect.objectContaining({
        image: ["https://shop.example/black.png"],
        offers: expect.objectContaining({ availability: "https://schema.org/OutOfStock" }),
      }),
    ])
  })

  it("gives all product images in rank order to a variant with no linked image", () => {
    const unlinked = {
      ...tee,
      variants: tee.variants.map((item) => ({ ...item, images: [] })),
      images: [...(tee.images ?? [])].reverse(),
    } as Product
    const data = productJsonLd({ ...base, product: unlinked })!
    expect((data.hasVariant as { image: string[] }[])[0]!.image).toEqual([
      "https://cdn.example/white.png",
      "https://shop.example/black.png",
    ])
  })

  it("builds one Product with one Offer for a product with one variant", () => {
    const data = productJsonLd({
      ...base,
      product: tote,
      canonicalUrl: "https://shop.example/products/tote",
    })!
    expect(data["@type"]).toBe("Product")
    expect(data.name).toBe("Canvas Tote")
    expect(data.offers).toMatchObject({ url: "https://shop.example/products/tote", price: 85000 })
    expect(data.image).toEqual(["https://cdn.example/tote.png"])
    expect(data).not.toHaveProperty("sku")
  })

  it("adds aggregateRating only when the product has reviews", () => {
    expect(
      productJsonLd({ ...base, product: tee, rating: { average: 4.5, count: 12 } })
    ).toMatchObject({
      aggregateRating: { "@type": "AggregateRating", ratingValue: 4.5, reviewCount: 12 },
    })
    expect(
      productJsonLd({ ...base, product: tee, rating: { average: 0, count: 0 } })
    ).not.toHaveProperty("aggregateRating")
  })

  it("leaves out a variant with no price, and returns null when no variant has a price", () => {
    const noPrice = { ...tee.variants[1]!, calculated_price: null } as HttpTypes.StoreProductVariant
    expect(
      productJsonLd({ ...base, product: { ...tee, variants: [tee.variants[0]!, noPrice] } })!
        .hasVariant
    ).toHaveLength(1)
    expect(
      productJsonLd({
        ...base,
        product: { ...tote, variants: [{ ...tote.variants[0]!, calculated_price: null }] },
      })
    ).toBeNull()
  })

  // Review Focus: a product with no image.
  it("has no image key when the product has no images and no thumbnail", () => {
    const data = productJsonLd({ ...base, product: { ...tote, thumbnail: null, images: [] } })!
    expect(data).not.toHaveProperty("image")
  })

  it("never gives an AggregateOffer or review entries", () => {
    const text = JSON.stringify(
      productJsonLd({ ...base, product: tee, rating: { average: 4, count: 2 } })
    )
    expect(text).not.toContain("AggregateOffer")
    expect(text).not.toContain('"review"')
  })
})
