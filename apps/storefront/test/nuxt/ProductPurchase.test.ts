import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProductPurchase } from "#components"

const { cart } = vi.hoisted(() => ({ cart: { add: vi.fn() } }))

mockNuxtImport("useCart", () => () => cart)

const variant = (id: string, size: string, amount: number, stock: number) => ({
  id,
  title: size,
  options: [{ option_id: "opt_size", value: size }],
  calculated_price: { calculated_amount: amount },
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: stock,
})

const product = {
  id: "prod_1",
  title: "Plain T-Shirt",
  options: [{ id: "opt_size", title: "Size", values: [{ value: "S" }, { value: "M" }, { value: "L" }] }],
  variants: [
    variant("variant_s", "S", 150000, 5),
    variant("variant_m", "M", 160000, 5),
    variant("variant_l", "L", 170000, 0),
  ],
} as never

const mountPurchase = () =>
  mountSuspended(ProductPurchase, {
    props: { product },
    global: { stubs: { WishlistButton: true } },
  })

const optionButton = (wrapper: Awaited<ReturnType<typeof mountPurchase>>, value: string) =>
  wrapper.findAll("button").find((button) => button.text() === value)!

beforeEach(() => {
  cart.add.mockReset().mockResolvedValue(undefined)
})

describe("ProductPurchase", () => {
  it("selects the first variant and adds it to the cart", async () => {
    const wrapper = await mountPurchase()

    expect(wrapper.text()).toContain("Rp 150.000")
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    expect(cart.add).toHaveBeenCalledWith("variant_s", 1)
    expect(wrapper.text()).toContain("The product is in your cart.")
  })

  it("adds the variant of the selected option", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "M").trigger("click")
    expect(wrapper.text()).toContain("Rp 160.000")
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    expect(cart.add).toHaveBeenCalledWith("variant_m", 1)
  })

  it("does not sell a variant that is out of stock", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "L").trigger("click")

    const button = wrapper.find('[data-testid="add-to-cart"]')
    expect(button.attributes("disabled")).toBeDefined()
    expect(button.text()).toBe("Out of stock")
  })

  it("shows an error when the cart request fails", async () => {
    cart.add.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPurchase()

    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("The product was not added. Try again.")
  })

  it("gives the selected variant to the wishlist button", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "M").trigger("click")

    expect(wrapper.findComponent({ name: "WishlistButton" }).props("variantId")).toBe("variant_m")
  })
})
