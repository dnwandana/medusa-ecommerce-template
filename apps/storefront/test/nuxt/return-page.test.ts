import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ReturnPage from "~/pages/checkout/return.vue"

const { cartId, cart, checkout, completeMock, navigateToMock } = vi.hoisted(() => ({
  cartId: { value: "cart_1" as string | null },
  cart: { clear: vi.fn() },
  checkout: { complete: vi.fn() },
  completeMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCartId", () => () => cartId)
mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useCheckout", () => () => checkout)
mockNuxtImport("completeCartWithRetry", () => completeMock)
mockNuxtImport("navigateTo", () => navigateToMock)
// The order page does not exist before task 23, so the test does not use the real router here.
mockNuxtImport(
  "useLocalePath",
  () => () => (path: string, locale?: string) =>
    locale && locale !== "en" ? `/${locale}${path}` : path
)

const mountPage = async () => {
  const wrapper = await mountSuspended(ReturnPage)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  cartId.value = "cart_1"
  cart.clear.mockReset()
  checkout.complete.mockReset()
  completeMock.mockReset()
  navigateToMock.mockReset()
})

afterEach(() => {
  document.cookie = "i18n_redirected=; path=/; max-age=0"
})

describe("payment return page", () => {
  it("shows a text and completes nothing when there is no cart", async () => {
    cartId.value = null
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("There is no payment to confirm.")
    expect(completeMock).not.toHaveBeenCalled()
  })

  it("clears the cart and opens the order page after the completion", async () => {
    completeMock.mockResolvedValue({ status: "order", order: { id: "order_1" } })
    await mountPage()

    expect(cart.clear).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/orders/order_1", { replace: true })
  })

  it("completes the cart through the checkout composable", async () => {
    completeMock.mockImplementation(async ({ complete }) => {
      await complete()
      return { status: "pending" }
    })
    checkout.complete.mockResolvedValue({ type: "cart", cart: { id: "cart_1" } })
    await mountPage()

    expect(checkout.complete).toHaveBeenCalledTimes(1)
  })

  // Review Focus: a late webhook does not lose the cart. The customer can try again.
  it("keeps the cart and shows the pending text when the payment is not confirmed", async () => {
    completeMock.mockResolvedValue({ status: "pending" })
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Payment is being confirmed")
    expect(wrapper.find('a[href="/cart"]').exists()).toBe(true)
    expect(cart.clear).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("shows the failure text and keeps the cart when the completion fails", async () => {
    completeMock.mockResolvedValue({ status: "failed" })
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("We could not create your order")
    expect(wrapper.text()).toContain("If you paid, we received your payment")
    expect(cart.clear).not.toHaveBeenCalled()
  })

  // Review Focus: the return URL has no locale prefix. The cookie gives the locale.
  it("goes to the return page of the cookie locale before the completion", async () => {
    document.cookie = "i18n_redirected=id; path=/"
    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith("/id/checkout/return", { replace: true })
    expect(completeMock).not.toHaveBeenCalled()
  })
})
