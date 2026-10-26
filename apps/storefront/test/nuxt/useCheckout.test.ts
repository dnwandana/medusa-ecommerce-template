import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckout, useNuxtApp } from "#imports"
import source from "~/composables/useCheckout.ts?raw"
import type { PaymentCustomer } from "~/utils/checkoutForm"

const { sdk, cartState, cartId } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    cartId: { value: "cart_1" as string | null },
    cartState: { cart: ref<any>(null), clear: vi.fn() },
    sdk: {
      store: {
        cart: { update: vi.fn(), addShippingMethod: vi.fn(), complete: vi.fn() },
        fulfillment: { listCartOptions: vi.fn(), calculate: vi.fn() },
        payment: { initiatePaymentSession: vi.fn(), listPaymentProviders: vi.fn() },
      },
    },
  }
})

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useCart", () => () => cartState)
mockNuxtImport("useCartId", () => () => cartId)
// No mock for the locale: the tests call useCheckout outside a component and set the locale on
// the real Nuxt i18n instance.

const address = {
  first_name: "Sari",
  last_name: "Dewi",
  address_1: "Jl. Merdeka No. 1",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40111",
  country_code: "id" as const,
  phone: "+6281234567890",
}
const customer: PaymentCustomer = {
  first_name: "Sari",
  last_name: "Dewi",
  email: "buyer@example.com",
  phone: "+6281234567890",
}
const sessionWith = (providerId: string, data: Record<string, unknown>) => ({
  payment_collection: { payment_sessions: [{ provider_id: providerId, data }] },
})

beforeEach(() => {
  useNuxtApp().$i18n.locale.value = "en"
  cartId.value = "cart_1"
  cartState.cart.value = { id: "cart_1", region_id: "reg_1", items: [{ id: "item_1" }] }
  // The real clear() of useCart removes the cookie and the cart state.
  cartState.clear.mockReset().mockImplementation(() => {
    cartId.value = null
    cartState.cart.value = null
  })
  Object.values(sdk.store.cart).forEach((mock) => mock.mockReset())
  Object.values(sdk.store.fulfillment).forEach((mock) => mock.mockReset())
  sdk.store.payment.initiatePaymentSession
    .mockReset()
    .mockResolvedValue(sessionWith("pp_test_test", { payment_url: "https://pay.example.com/1" }))
  sdk.store.payment.listPaymentProviders.mockReset()
})

describe("useCheckout", () => {
  it("saves the email and the address for Indonesia", async () => {
    sdk.store.cart.update.mockResolvedValue({ cart: { id: "cart_1", email: "buyer@example.com" } })

    await useCheckout().saveContact(" buyer@example.com ", address)

    expect(sdk.store.cart.update).toHaveBeenCalledWith("cart_1", {
      email: "buyer@example.com",
      shipping_address: address,
      billing_address: address,
      locale: "en-US",
    })
    expect(cartState.cart.value.email).toBe("buyer@example.com")
  })

  it("saves the contact with the storefront locale", async () => {
    useNuxtApp().$i18n.locale.value = "id"
    sdk.store.cart.update.mockResolvedValue({ cart: { id: "cart_1" } })

    await useCheckout().saveContact("dewi@example.com", address)

    expect(sdk.store.cart.update).toHaveBeenCalledWith(
      "cart_1",
      expect.objectContaining({ email: "dewi@example.com", locale: "id-ID" })
    )
  })

  it("lists the shipping options with the calculated amount", async () => {
    sdk.store.fulfillment.listCartOptions.mockResolvedValue({
      shipping_options: [
        { id: "so_1", name: "Standard Shipping", price_type: "calculated" },
        { id: "so_2", name: "Pickup", price_type: "flat", amount: 0 },
      ],
    })
    sdk.store.fulfillment.calculate.mockResolvedValue({ shipping_option: { amount: 18000 } })

    const options = await useCheckout().loadShippingOptions()

    expect(sdk.store.fulfillment.listCartOptions).toHaveBeenCalledWith({ cart_id: "cart_1" })
    expect(sdk.store.fulfillment.calculate).toHaveBeenCalledTimes(1)
    expect(sdk.store.fulfillment.calculate).toHaveBeenCalledWith("so_1", { cart_id: "cart_1" })
    expect(options).toEqual([
      { id: "so_1", name: "Standard Shipping", amount: 18000 },
      { id: "so_2", name: "Pickup", amount: 0 },
    ])
  })

  it("adds the selected shipping option to the cart", async () => {
    sdk.store.cart.addShippingMethod.mockResolvedValue({
      cart: { id: "cart_1", shipping_total: 18000 },
    })

    await useCheckout().selectShippingOption("so_1")

    expect(sdk.store.cart.addShippingMethod).toHaveBeenCalledWith("cart_1", { option_id: "so_1" })
    expect(cartState.cart.value.shipping_total).toBe(18000)
  })

  it("lists the payment providers of the cart region", async () => {
    sdk.store.payment.listPaymentProviders.mockResolvedValue({
      payment_providers: [{ id: "pp_a_a" }, { id: "pp_b_b" }],
    })

    expect(await useCheckout().listPaymentProviders()).toEqual([{ id: "pp_a_a" }, { id: "pp_b_b" }])
    expect(sdk.store.payment.listPaymentProviders).toHaveBeenCalledWith({ region_id: "reg_1" })
  })

  it("drops a provider that Medusa marks as disabled", async () => {
    sdk.store.payment.listPaymentProviders.mockResolvedValue({
      payment_providers: [
        { id: "pp_a_a", is_enabled: false },
        { id: "pp_b_b", is_enabled: true },
      ],
    })
    expect(await useCheckout().listPaymentProviders()).toEqual([{ id: "pp_b_b" }])
  })

  it("drops bank transfer when the switch is off, also when Medusa enables it", async () => {
    sdk.store.payment.listPaymentProviders.mockResolvedValue({
      payment_providers: [
        { id: "pp_bank-transfer_bank-transfer", is_enabled: true },
        { id: "pp_b_b", is_enabled: true },
      ],
    })
    expect(await useCheckout().listPaymentProviders({ bankTransferEnabled: false })).toEqual([
      { id: "pp_b_b" },
    ])
  })

  it("keeps bank transfer by default", async () => {
    sdk.store.payment.listPaymentProviders.mockResolvedValue({
      payment_providers: [{ id: "pp_bank-transfer_bank-transfer", is_enabled: true }],
    })
    expect(await useCheckout().listPaymentProviders()).toEqual([
      { id: "pp_bank-transfer_bank-transfer" },
    ])
  })

  it("starts the session with the selected provider and the customer object", async () => {
    const cart = cartState.cart.value

    await useCheckout().startPayment("pp_test_test", customer)

    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(cart, {
      provider_id: "pp_test_test",
      data: { customer },
    })
  })

  it("returns the redirect URL for an https payment_url", async () => {
    expect(await useCheckout().startPayment("pp_test_test", customer)).toEqual({
      type: "redirect",
      url: "https://pay.example.com/1",
    })
    expect(sdk.store.cart.complete).not.toHaveBeenCalled()
  })

  // Review Focus: a payment_url that is not https must not redirect the browser.
  it("rejects a payment_url that is not https and does not complete the cart", async () => {
    for (const url of ["http://pay.example.com/1", "javascript:alert(1)", 42]) {
      sdk.store.payment.initiatePaymentSession.mockResolvedValue(
        sessionWith("pp_test_test", { payment_url: url })
      )

      await expect(useCheckout().startPayment("pp_test_test", customer)).rejects.toThrow(
        "The payment session has a payment URL that is not https."
      )
    }
    expect(sdk.store.cart.complete).not.toHaveBeenCalled()
    expect(cartId.value).toBe("cart_1")
  })

  it("fails and does not complete the cart when there is no session for the provider", async () => {
    sdk.store.payment.initiatePaymentSession.mockResolvedValue(sessionWith("pp_other_other", {}))

    await expect(useCheckout().startPayment("pp_test_test", customer)).rejects.toThrow(
      "The payment collection has no session for the provider."
    )
    expect(sdk.store.cart.complete).not.toHaveBeenCalled()
  })

  it("completes the cart and returns the order id when the session has no payment_url", async () => {
    sdk.store.payment.initiatePaymentSession.mockResolvedValue(
      sessionWith("pp_bank-transfer_bank-transfer", {})
    )
    sdk.store.cart.complete.mockResolvedValue({ type: "order", order: { id: "order_1" } })

    expect(await useCheckout().startPayment("pp_bank-transfer_bank-transfer", customer)).toEqual({
      type: "order",
      orderId: "order_1",
    })
    expect(sdk.store.cart.complete).toHaveBeenCalledWith("cart_1")
    expect(cartId.value).toBeNull()
    expect(cartState.cart.value).toBeNull()
  })

  // Review Focus: a failed cart.complete after a bank transfer session keeps the cart.
  it("keeps the cart when the completion fails", async () => {
    const cart = cartState.cart.value
    sdk.store.payment.initiatePaymentSession.mockResolvedValue(
      sessionWith("pp_bank-transfer_bank-transfer", {})
    )
    sdk.store.cart.complete.mockResolvedValue({
      type: "cart",
      cart: {},
      error: { message: "No stock" },
    })

    await expect(
      useCheckout().startPayment("pp_bank-transfer_bank-transfer", customer)
    ).rejects.toThrow("No stock")
    expect(cartId.value).toBe("cart_1")
    expect(cartState.cart.value).toBe(cart)
  })

  it("gives a clear message when the completion fails with no error message", async () => {
    sdk.store.payment.initiatePaymentSession.mockResolvedValue(
      sessionWith("pp_bank-transfer_bank-transfer", {})
    )
    sdk.store.cart.complete.mockResolvedValue({ type: "cart", cart: {} })

    await expect(
      useCheckout().startPayment("pp_bank-transfer_bank-transfer", customer)
    ).rejects.toThrow("The cart did not become an order.")
    expect(cartId.value).toBe("cart_1")
  })

  it("does not change the cart when the provider is not available", async () => {
    const cart = cartState.cart.value
    sdk.store.payment.initiatePaymentSession.mockRejectedValue(new Error("Provider is down"))

    await expect(useCheckout().startPayment("pp_test_test", customer)).rejects.toThrow(
      "Provider is down"
    )

    expect(cartState.cart.value).toBe(cart)
    expect(cartId.value).toBe("cart_1")
  })

  it("has no provider id in the source", () => {
    expect(source).not.toMatch(/pp_[a-z-]+_[a-z-]+/)
  })

  it("completes the cart of the cookie", async () => {
    cartState.cart.value = null
    sdk.store.cart.complete.mockResolvedValue({ type: "order", order: { id: "order_1" } })

    const result = await useCheckout().complete()

    expect(sdk.store.cart.complete).toHaveBeenCalledWith("cart_1")
    expect(result).toEqual({ type: "order", order: { id: "order_1" } })
  })

  it("fails with a clear message when there is no cart", async () => {
    cartState.cart.value = null
    cartId.value = null

    await expect(useCheckout().saveContact("buyer@example.com", address)).rejects.toThrow(
      "The cart is not loaded."
    )
    await expect(useCheckout().complete()).rejects.toThrow("There is no cart to complete.")
  })
})
