import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import { computed, ref } from "vue"
import { ProductCard } from "#components"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => ({
    ...STOREFRONT_DEFAULTS,
    colours: [{ name: "Sage", hex: "#9aa68c" }],
  })),
}))
// The heart loads the customer and the wishlist. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => ({
  customer: ref(null),
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
}))
mockNuxtImport("useWishlist", () => () => ({
  wishlist: ref(null),
  load: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  itemFor: vi.fn(),
}))

const product = (amounts: Array<number | null>) =>
  ({
    id: "prod_1",
    title: "Plain T-Shirt",
    handle: "plain-t-shirt",
    thumbnail: "https://images.example/shirt.png",
    variants: amounts.map((amount, index) => ({
      id: `variant_${index}`,
      manage_inventory: false,
      calculated_price: amount === null ? null : { calculated_amount: amount },
    })),
  }) as never

describe("ProductCard", () => {
  it("shows the title, the image, and a link to the product page", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([150000]) } })

    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.find("a").attributes("href")).toBe("/products/plain-t-shirt")
    expect(wrapper.find("img").attributes("src")).toBe("https://images.example/shirt.png")
    expect(wrapper.find("img").attributes("alt")).toBe("Plain T-Shirt")
    expect(wrapper.find("img").attributes("loading")).toBe("lazy")
  })

  it("shows the lowest variant price in Rupiah", async () => {
    const wrapper = await mountSuspended(ProductCard, {
      props: { product: product([150000, 120000, null]) },
    })

    expect(wrapper.text()).toContain("Rp 120.000")
  })

  it("shows a dash when no variant has a price", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([null]) } })

    expect(wrapper.text()).toContain("-")
    expect(wrapper.text()).not.toContain("NaN")
  })

  it("has no frame and a 4:5 photo", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([150000]) } })

    expect(wrapper.find("[data-slot='card']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='card-photo']").attributes("style")).toContain("4 / 5")
  })

  it("shows the ImageOff icon when the product has no image", async () => {
    const noImage = { ...(product([150000]) as object), thumbnail: null } as never
    const wrapper = await mountSuspended(ProductCard, { props: { product: noImage } })

    expect(wrapper.find("img").exists()).toBe(false)
    expect(wrapper.find("[data-testid='card-photo'] svg").exists()).toBe(true)
  })

  it("shows the sale price and the old price", async () => {
    const sale = {
      ...product([311200]),
      variants: [
        {
          id: "v_1",
          manage_inventory: false,
          calculated_price: { calculated_amount: 311200, original_amount: 389000 },
        },
      ],
    } as never
    const wrapper = await mountSuspended(ProductCard, { props: { product: sale } })

    expect(wrapper.text()).toContain("Rp 311.200")
    expect(wrapper.find("s").text()).toContain("Rp 389.000")
    expect(wrapper.text()).toContain("Sale")
  })

  it("shows one badge, Sold out first", async () => {
    const soldOut = {
      ...product([150000]),
      variants: [
        {
          id: "v_1",
          manage_inventory: true,
          inventory_quantity: 0,
          calculated_price: { calculated_amount: 1, original_amount: 2 },
        },
      ],
    } as never
    const wrapper = await mountSuspended(ProductCard, { props: { product: soldOut } })

    expect(wrapper.findAll("[data-slot='badge']")).toHaveLength(1)
    expect(wrapper.find("[data-slot='badge']").text()).toBe("Sold out")
  })

  it("shows the colour dots on wide screens only", async () => {
    const withColour = {
      ...product([150000]),
      options: [{ id: "o_1", title: "Colour", values: [{ value: "Sage" }, { value: "Ink" }] }],
    } as never
    const wrapper = await mountSuspended(ProductCard, { props: { product: withColour } })
    const dots = wrapper.find("[data-testid='colour-dots']")

    expect(dots.classes()).toContain("hidden")
    expect(dots.classes()).toContain("md:flex")
    expect(dots.findAll("span[style]")).toHaveLength(1)
    expect(dots.attributes("aria-label")).toBe("Colours: Sage")
  })

  it("puts the heart outside the product link", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([150000]) } })

    expect(wrapper.find("a button").exists()).toBe(false)
    expect(wrapper.find("button[aria-label='Save to wishlist']").exists()).toBe(true)
  })

  it("shows the price in the price style", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([150000]) } })

    expect(wrapper.find(".text-price").text()).toBe("Rp 150.000")
  })
})
