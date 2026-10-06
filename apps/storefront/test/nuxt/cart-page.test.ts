import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CartPage from "~/pages/cart.vue"
import { TrustLines } from "#components"

const { cart } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    cart: {
      cart: ref<unknown>(null),
      load: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
    },
  }
})

mockNuxtImport("useCart", () => () => cart)

const filledCart = {
  id: "cart_1",
  item_subtotal: 300000,
  items: [
    {
      id: "item_1",
      product_title: "Plain T-Shirt",
      variant_title: "M",
      thumbnail: null,
      quantity: 2,
      unit_price: 150000,
    },
  ],
}

const mountPage = async () => {
  const wrapper = await mountSuspended(CartPage)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  cart.cart.value = null
  cart.load.mockReset().mockResolvedValue(undefined)
  cart.updateItem.mockReset().mockResolvedValue(undefined)
  cart.removeItem.mockReset().mockResolvedValue(undefined)
})

describe("cart page", () => {
  it("shows the empty text and no checkout link for an empty cart", async () => {
    const wrapper = await mountPage()

    expect(cart.load).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain("Your cart is empty.")
    expect(wrapper.find('a[href="/checkout"]').exists()).toBe(false)
  })

  it("shows the items, the subtotal, and the checkout link", async () => {
    cart.cart.value = filledCart
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.find('[data-testid="subtotal"]').text()).toBe("Rp 300.000")
    expect(wrapper.text()).toContain("Calculated at checkout")
    expect(wrapper.find('a[href="/checkout"]').exists()).toBe(true)
  })

  it("changes and removes an item through the cart composable", async () => {
    cart.cart.value = filledCart
    const wrapper = await mountPage()

    await wrapper.find('button[aria-label="Increase the quantity"]').trigger("click")
    // The buttons are disabled until the first change is complete.
    await flushPromises()
    await wrapper.findAll("button").find((button) => button.text() === "Remove")!.trigger("click")
    await flushPromises()

    expect(cart.updateItem).toHaveBeenCalledWith("item_1", 3)
    expect(cart.removeItem).toHaveBeenCalledWith("item_1")
  })

  it("shows an error when a change fails", async () => {
    cart.cart.value = filledCart
    cart.updateItem.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    await wrapper.find('button[aria-label="Increase the quantity"]').trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("An error occurred. Try again.")
  })
  it("shows an empty state with a link to the products", async () => {
    const wrapper = await mountPage()
    const empty = wrapper.find('[data-slot="empty"]')

    expect(empty.text()).toContain("Your cart is empty.")
    expect(empty.text()).toContain("Find a piece for your everyday.")
    expect(empty.find('a[href="/products"]').text()).toBe("Continue shopping")
  })

  it("shows the summary card with the trust lines", async () => {
    cart.cart.value = filledCart
    const wrapper = await mountPage()
    const summary = wrapper.find('[data-slot="card"]')

    expect(summary.text()).toContain("Summary")
    expect(summary.find('[data-testid="subtotal"]').exists()).toBe(true)
    expect(summary.find('a[href="/products"]').text()).toBe("Continue shopping")
    expect(wrapper.findComponent(TrustLines).exists()).toBe(true)
  })

  it("uses a column of 380px for the summary from md", async () => {
    cart.cart.value = filledCart
    const wrapper = await mountPage()

    expect(wrapper.find(".grid").classes()).toContain("md:grid-cols-[minmax(0,1fr)_380px]")
  })

  it("shows the change error in a destructive alert", async () => {
    cart.cart.value = filledCart
    cart.removeItem.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    await wrapper.findAll("button").find((button) => button.text() === "Remove")!.trigger("click")
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
