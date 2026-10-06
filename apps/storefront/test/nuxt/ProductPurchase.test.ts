import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { h } from "vue"
import { ProductPurchase } from "#components"

const { cart } = vi.hoisted(() => ({ cart: { add: vi.fn() } }))

const { toast, navigateToMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  navigateToMock: vi.fn(),
}))

vi.mock("vue-sonner", () => ({ toast }))
mockNuxtImport("navigateTo", () => navigateToMock)
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
  toast.success.mockReset()
  toast.error.mockReset()
  navigateToMock.mockReset()
})

describe("ProductPurchase", () => {
  it("selects the first variant and adds it to the cart", async () => {
    const wrapper = await mountPurchase()

    expect(wrapper.text()).toContain("Rp 150.000")
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    expect(cart.add).toHaveBeenCalledWith("variant_s", 1)
    expect(toast.success).toHaveBeenCalledWith("The product is in your cart.", {
      action: { label: "View cart", onClick: expect.any(Function) },
    })
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

    expect(toast.error).toHaveBeenCalledWith("The product was not added. Try again.")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("gives the selected variant to the wishlist button", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "M").trigger("click")

    expect(wrapper.findComponent({ name: "WishlistButton" }).props("variantId")).toBe("variant_m")
  })

  it("opens the cart from the toast action", async () => {
    const wrapper = await mountPurchase()
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    toast.success.mock.calls[0]![1].action.onClick()

    expect(navigateToMock).toHaveBeenCalledWith("/cart")
  })

  // Review Focus: a click on the selected option must not clear the selection.
  it("keeps the selection when the user clicks the selected option again", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "S").trigger("click")

    expect(optionButton(wrapper, "S").attributes("data-state")).toBe("on")
    expect(wrapper.text()).toContain("Rp 150.000")
    expect(wrapper.find('[data-testid="add-to-cart"]').text()).toBe("Add to cart")
  })

  it("shows a spinner and disables the button while the cart request runs", async () => {
    cart.add.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPurchase()

    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")

    const button = wrapper.find('[data-testid="add-to-cart"]')
    expect(button.attributes("disabled")).toBeDefined()
    expect(button.find("svg.animate-spin").exists()).toBe(true)
  })

  it("shows the option values in a toggle group", async () => {
    const wrapper = await mountPurchase()
    const group = wrapper.find('[role="group"]')

    expect(wrapper.find(`#${group.attributes("aria-labelledby")}`).text()).toBe("Size")

    expect(optionButton(wrapper, "M").classes()).toContain("h-11")
    expect(wrapper.find('[data-testid="add-to-cart"]').classes()).toContain("w-full")
  })

  it("shows the default slot after the price and before the options", async () => {
    const wrapper = await mountSuspended(ProductPurchase, {
      props: { product },
      slots: { default: () => h("p", { "data-testid": "description" }, "Soft cotton.") },
    })
    const html = wrapper.html()

    expect(html.indexOf("Rp 150.000")).toBeLessThan(html.indexOf('data-testid="description"'))
    expect(html.indexOf('data-testid="description"')).toBeLessThan(html.indexOf('role="group"'))
  })
})
