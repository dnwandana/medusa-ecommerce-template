import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { ProductCard } from "#components"

const product = (amounts: Array<number | null>) =>
  ({
    id: "prod_1",
    title: "Plain T-Shirt",
    handle: "plain-t-shirt",
    thumbnail: "https://images.example/shirt.png",
    variants: amounts.map((amount, index) => ({
      id: `variant_${index}`,
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

  it("has no button", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: product([150000]) } })

    expect(wrapper.find("button").exists()).toBe(false)
  })
})
