import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { formatPrice } from "~/utils/formatPrice"
import {
  absoluteUrl,
  cutDescription,
  fullTitle,
  homeTitle,
  productSeoDescription,
  variantLabel,
} from "~/utils/seoText"

const variant = (id: string, options: Record<string, string>, amount: number) =>
  ({
    id,
    options: Object.entries(options).map(([option_id, value]) => ({ option_id, value })),
    calculated_price: { calculated_amount: amount },
  }) as unknown as HttpTypes.StoreProductVariant

const tee = {
  options: [
    { id: "o_size", title: "Size" },
    { id: "o_col", title: "Colour" },
  ],
  variants: [
    variant("v_wl", { o_size: "L", o_col: "White" }, 150000),
    variant("v_bs", { o_size: "S", o_col: "Black" }, 150000),
  ],
  description: "A cotton T-shirt in one color.",
} as unknown as HttpTypes.StoreProduct & { variants: HttpTypes.StoreProductVariant[] }

const tote = {
  options: [{ id: "o_type", title: "Type" }],
  variants: [variant("v_tote", { o_type: "Default" }, 85000)],
  description: "A canvas tote bag.",
} as unknown as HttpTypes.StoreProduct & { variants: HttpTypes.StoreProductVariant[] }

describe("fullTitle", () => {
  it("adds the store name", () =>
    expect(fullTitle("Returns", "Everyday")).toBe("Returns | Everyday"))
  it("gives the store name for an empty title", () =>
    expect(fullTitle("", "Everyday")).toBe("Everyday"))
})

describe("homeTitle", () => {
  it("puts the store name first", () =>
    expect(homeTitle("Everyday", "Clothes for the days you actually have.")).toBe(
      "Everyday – Clothes for the days you actually have."
    ))
})

describe("cutDescription", () => {
  it("keeps a short text and joins the lines", () =>
    expect(cutDescription("Line one.\n\nLine  two.")).toBe("Line one. Line two."))
  it("cuts a long text at a word and adds an ellipsis", () => {
    const text = cutDescription("word ".repeat(60))
    expect(text.length).toBeLessThanOrEqual(160)
    expect(text.endsWith("word…")).toBe(true)
  })
  it("keeps a text of exactly the maximum length", () => {
    const text = "a".repeat(160)
    expect(cutDescription(text)).toBe(text)
  })
})

describe("absoluteUrl", () => {
  it("adds the site URL to a path", () =>
    expect(absoluteUrl("/og-default.jpg", "https://shop.example/")).toBe(
      "https://shop.example/og-default.jpg"
    ))
  it("keeps an absolute URL", () =>
    expect(absoluteUrl("https://cdn.example/a.png", "https://shop.example")).toBe(
      "https://cdn.example/a.png"
    ))
})

describe("variantLabel", () => {
  it("puts the colour first", () => expect(variantLabel(tee, tee.variants[0]!)).toBe("White, L"))
  it("is empty for a product with one variant", () =>
    expect(variantLabel(tote, tote.variants[0]!)).toBe(""))
})

describe("productSeoDescription", () => {
  it("names the variant and its price", () =>
    expect(productSeoDescription({ product: tee, variant: tee.variants[0]! })).toBe(
      `White, L · ${formatPrice(150000)} · A cotton T-shirt in one color.`
    ))
  it("gives the lowest price and no variant without a selection", () =>
    expect(productSeoDescription({ product: tee, variant: null })).toBe(
      `${formatPrice(150000)} · A cotton T-shirt in one color.`
    ))
  it("skips an empty description", () =>
    expect(productSeoDescription({ product: { ...tote, description: null }, variant: null })).toBe(
      formatPrice(85000)
    ))
})
