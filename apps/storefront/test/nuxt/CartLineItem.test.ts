import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CartLineItem } from "#components"

const item = {
  id: "item_1",
  product_title: "Plain T-Shirt",
  variant_title: "M",
  thumbnail: null,
  quantity: 2,
  unit_price: 150000,
} as never

const buttonWithLabel = (wrapper: Awaited<ReturnType<typeof mountSuspended>>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe("CartLineItem", () => {
  it("shows the product, the variant, the quantity, and the line total", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })

    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.text()).toContain("M")
    expect(wrapper.find('[data-testid="quantity"]').text()).toBe("2")
    expect(wrapper.text()).toContain("Rp 300.000")
  })

  it("emits the new quantity for the increase and decrease buttons", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })

    await buttonWithLabel(wrapper, "Increase the quantity").trigger("click")
    await buttonWithLabel(wrapper, "Decrease the quantity").trigger("click")

    expect(wrapper.emitted("update")).toEqual([[3], [1]])
  })

  it("emits remove for the remove button", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })

    await wrapper.findAll("button").find((button) => button.text() === "Remove")!.trigger("click")

    expect(wrapper.emitted("remove")).toHaveLength(1)
  })
})
