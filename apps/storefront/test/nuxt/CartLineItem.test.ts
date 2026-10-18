import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { computed } from "vue"
import { CartLineItem } from "#components"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => STOREFRONT_DEFAULTS),
}))

const item = {
  id: "item_1",
  variant_id: "v_m",
  product_title: "Plain T-Shirt",
  variant_title: "M",
  thumbnail: null,
  quantity: 2,
  unit_price: 150000,
} as never

const stock = (inventory_quantity: number) =>
  ({ id: "v_m", inventory_quantity, manage_inventory: true, allow_backorder: false }) as never

describe("CartLineItem", () => {
  it("shows the unit price, the old price and the line total", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: { item: { ...item, compare_at_unit_price: 200000 } as never },
    })
    expect(wrapper.text()).toContain("Rp 150.000")
    expect(wrapper.get("s").text()).toBe("Rp 200.000")
    expect(wrapper.get("[data-testid='line-total']").text()).toBe("Rp 300.000")
  })

  it("names the stepper and the text buttons with the product", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })
    expect(wrapper.get("[role='group']").attributes("aria-label")).toBe("Quantity of Plain T-Shirt")
    expect(wrapper.get("button[aria-label='Remove Plain T-Shirt']").text()).toBe("Remove")
    expect(wrapper.get("button[aria-label='Move Plain T-Shirt to the wishlist']").text()).toBe(
      "Move to wishlist"
    )
  })

  it("emits update for a new quantity and remove for 0", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: { item: { ...item, quantity: 1 } as never },
    })
    await wrapper.get("button[aria-label='Increase the quantity']").trigger("click")
    await wrapper.get("button[aria-label='Decrease the quantity']").trigger("click")
    expect(wrapper.emitted("update")).toEqual([[2]])
    expect(wrapper.emitted("remove")).toHaveLength(1)
  })

  it("stops the plus button at the stock and says how many are left", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: { item: { ...item, quantity: 3 } as never, stock: stock(3) },
    })
    expect(
      wrapper.get("button[aria-label='Increase the quantity']").attributes("disabled")
    ).toBeDefined()
    expect(wrapper.text()).toContain("Only 3 left.")
    expect(wrapper.text()).not.toContain("Limited stock")
  })

  it("shows Limited stock with no number below the stock limit", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item, stock: stock(4) } })
    expect(wrapper.text()).toContain("Limited stock")
    expect(wrapper.text()).not.toContain("left.")
  })

  it("shows no stock text and no limit for a variant with no managed stock", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: {
        item,
        stock: { id: "v_m", inventory_quantity: 2, manage_inventory: false } as never,
      },
    })
    expect(
      wrapper.get("button[aria-label='Increase the quantity']").attributes("disabled")
    ).toBeUndefined()
    expect(wrapper.text()).not.toContain("Limited stock")
    expect(wrapper.text()).not.toContain("left.")
  })

  it("emits move for Move to wishlist", async () => {
    const wrapper = await mountSuspended(CartLineItem, { props: { item } })
    await wrapper.get("button[aria-label='Move Plain T-Shirt to the wishlist']").trigger("click")
    expect(wrapper.emitted("move")).toHaveLength(1)
  })

  it("shows the remove state on the line that it removes", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: { item, busy: "remove", disabled: true },
    })
    const remove = wrapper.get("button[aria-label='Removing Plain T-Shirt']")
    expect(remove.text()).toContain("Removing…")
    expect(remove.attributes("disabled")).toBeDefined()
    expect(wrapper.get("[aria-busy='true']").classes()).toContain("opacity-50")
  })

  it("shows the update spinner and disables the text buttons during an update", async () => {
    const wrapper = await mountSuspended(CartLineItem, {
      props: { item, busy: "update", disabled: true },
    })
    expect(wrapper.text()).toContain("Updating the quantity")
    expect(
      wrapper.get("button[aria-label='Remove Plain T-Shirt']").attributes("disabled")
    ).toBeDefined()
    expect(
      wrapper.get("button[aria-label='Move Plain T-Shirt to the wishlist']").attributes("disabled")
    ).toBeDefined()
  })
})
