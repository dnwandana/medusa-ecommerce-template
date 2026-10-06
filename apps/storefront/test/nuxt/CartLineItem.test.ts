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
  it("uses icon buttons for the quantity", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })

    expect(buttonWithLabel(wrapper, "Decrease the quantity").find("svg").exists()).toBe(true)
    expect(buttonWithLabel(wrapper, "Increase the quantity").find("svg").exists()).toBe(true)
    expect(buttonWithLabel(wrapper, "Increase the quantity").text()).toBe("")
  })

  it("puts the remove text in an sr-only span of an icon button", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })
    const remove = wrapper.findAll("button").find((button) => button.text() === "Remove")!

    expect(remove.find(".sr-only").text()).toBe("Remove")
    expect(remove.find("svg").exists()).toBe(true)
  })

  it("disables the three buttons while the cart is busy", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item, disabled: true } })

    expect(wrapper.findAll("button").every((button) => button.attributes("disabled") !== undefined)).toBe(true)
  })

  it("shows a placeholder when the line has no thumbnail", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })

    expect(wrapper.find("img").exists()).toBe(false)
    expect(wrapper.find(".bg-backdrop-sand svg").exists()).toBe(true)
  })
})
