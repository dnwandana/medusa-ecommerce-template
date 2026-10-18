import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, h } from "vue"
import { ProductPurchase } from "#components"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

const { cart } = vi.hoisted(() => ({ cart: { add: vi.fn() } }))

const { toast, navigateToMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  navigateToMock: vi.fn(),
}))

vi.mock("vue-sonner", () => ({ toast }))
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => ({
    ...STOREFRONT_DEFAULTS,
    colours: [{ name: "Sage", hex: "#9aa68c" }],
  })),
}))

const variant = (id: string, colour: string, size: string, amount: number, stock: number) => ({
  id,
  title: `${colour} / ${size}`,
  options: [
    { option_id: "opt_colour", value: colour },
    { option_id: "opt_size", value: size },
  ],
  calculated_price: { calculated_amount: amount },
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: stock,
})

const product = {
  id: "prod_1",
  title: "Plain T-Shirt",
  metadata: { colour_hex: { Sand: "#d8c9ae" } },
  options: [
    { id: "opt_colour", title: "Colour", values: [{ value: "Sand" }, { value: "Sage" }] },
    { id: "opt_size", title: "Size", values: [{ value: "S" }, { value: "M" }, { value: "L" }] },
  ],
  variants: [
    variant("variant_s", "Sand", "S", 150000, 5),
    variant("variant_m", "Sand", "M", 160000, 3),
    variant("variant_l", "Sand", "L", 170000, 0),
    variant("variant_sage_l", "Sage", "L", 170000, 9),
  ],
} as never

const mountPurchase = () =>
  mountSuspended(ProductPurchase, {
    props: { product },
    global: { stubs: { WishlistButton: true, QuantityStepper: true } },
  })

// A swatch has its name in aria-label. A size cell has its value as text.
const optionButton = (wrapper: Awaited<ReturnType<typeof mountPurchase>>, value: string) =>
  wrapper
    .findAll("[role='radio']")
    .find((radio) => radio.text() === value || radio.attributes("aria-label") === value)!

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

  // A sold-out size cannot be selected. A colour change can make the held size sold out.
  it("does not sell a variant that is out of stock", async () => {
    const wrapper = await mountPurchase()

    await optionButton(wrapper, "Sage").trigger("click")
    await optionButton(wrapper, "L").trigger("click")
    await optionButton(wrapper, "Sand").trigger("click")

    expect(optionButton(wrapper, "L").attributes("aria-checked")).toBe("true")

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

    expect(optionButton(wrapper, "S").attributes("aria-checked")).toBe("true")
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

  it("shows the colour as swatches and the size as cells", async () => {
    const wrapper = await mountPurchase()
    const groups = wrapper.findAll("[role='radiogroup']")

    expect(groups.map((group) => group.attributes("aria-label"))).toEqual(["Colour", "Size"])
    expect(optionButton(wrapper, "M").classes()).toContain("h-12")
    expect(wrapper.find('[data-testid="add-to-cart"]').classes()).toContain("h-14")
  })

  it("strikes a size with no stock in the selected colour", async () => {
    const wrapper = await mountPurchase()
    expect(
      wrapper.get("[role='radio'][aria-label='L, Sold out']").attributes("aria-disabled")
    ).toBe("true")

    await optionButton(wrapper, "Sage").trigger("click")
    expect(wrapper.find("[role='radio'][aria-label='L, Sold out']").exists()).toBe(false)
    expect(wrapper.emitted("colour-change")).toEqual([["Sage"]])
  })

  it("shows Limited stock for the selected variant", async () => {
    const wrapper = await mountPurchase()
    expect(wrapper.text()).toContain("Limited stock")

    await optionButton(wrapper, "Sage").trigger("click")
    await optionButton(wrapper, "L").trigger("click")
    expect(wrapper.text()).not.toContain("Limited stock")
  })

  it("adds the quantity of the stepper", async () => {
    const wrapper = await mountPurchase()
    wrapper.findComponent({ name: "QuantityStepper" }).vm.$emit("update:modelValue", 2)
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")
    await flushPromises()

    expect(cart.add).toHaveBeenCalledWith("variant_s", 2)
  })

  it("says Only 3 left when the quantity is more than the stock", async () => {
    const wrapper = await mountPurchase()
    await optionButton(wrapper, "M").trigger("click")
    wrapper.findComponent({ name: "QuantityStepper" }).vm.$emit("update:modelValue", 4)
    await wrapper.find('[data-testid="add-to-cart"]').trigger("click")

    expect(wrapper.get("[role='alert']").text()).toBe("Only 3 left.")
    expect(cart.add).not.toHaveBeenCalled()

    wrapper.findComponent({ name: "QuantityStepper" }).vm.$emit("update:modelValue", 3)
    await flushPromises()
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("shows the sale price and the old price", async () => {
    const sale = { ...(product as object) } as { variants: { calculated_price: object }[] }
    sale.variants = sale.variants.map((item) => ({
      ...item,
      calculated_price: { calculated_amount: 120000, original_amount: 150000 },
    }))
    const wrapper = await mountSuspended(ProductPurchase, {
      props: { product: sale as never },
      global: { stubs: { WishlistButton: true, QuantityStepper: true } },
    })

    expect(wrapper.text()).toContain("Rp 120.000")
    expect(wrapper.find("s").text()).toContain("Rp 150.000")
    expect(wrapper.text()).toContain("20%")
  })

  it("puts a square heart next to Add to cart and nothing under the row", async () => {
    const wrapper = await mountPurchase()
    expect(wrapper.findComponent({ name: "WishlistButton" }).props("look")).toBe("square")
    expect(wrapper.find("[data-testid='buy-row']").element.nextElementSibling).toBeNull()
  })

  it("shows the default slot after the price and before the options", async () => {
    const wrapper = await mountSuspended(ProductPurchase, {
      props: { product },
      global: { stubs: { WishlistButton: true, QuantityStepper: true } },
      slots: { default: () => h("p", { "data-testid": "description" }, "Soft cotton.") },
    })
    const html = wrapper.html()

    expect(html.indexOf("Rp 150.000")).toBeLessThan(html.indexOf('data-testid="description"'))
    expect(html.indexOf('data-testid="description"')).toBeLessThan(
      html.indexOf('role="radiogroup"')
    )
  })
})
