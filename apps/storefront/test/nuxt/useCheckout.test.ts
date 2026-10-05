import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckout } from "#imports"

const { sdk, cartState, cartId } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    cartId: { value: "cart_1" as string | null },
    cartState: { cart: ref<any>(null) },
    sdk: {
      store: {
        cart: { update: vi.fn(), addShippingMethod: vi.fn(), complete: vi.fn() },
        fulfillment: { listCartOptions: vi.fn(), calculate: vi.fn() },
        payment: { initiatePaymentSession: vi.fn() },
      },
    },
  }
})

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useCart", () => () => cartState)
mockNuxtImport("useCartId", () => () => cartId)

const values = {
  email: "buyer@example.com",
  phone: "+62 812-3456-7890",
  first_name: "Sari",
  last_name: "Dewi",
  address_1: "Jl. Merdeka No. 1",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40111",
}
const mayarCustomer = { name: "Sari Dewi", email: "buyer@example.com", mobile: "+6281234567890" }
const sessionWith = (data: Record<string, unknown>) => ({
  payment_collection: { payment_sessions: [{ provider_id: "pp_mayar_mayar", data }] },
})

beforeEach(() => {
  cartId.value = "cart_1"
  cartState.cart.value = { id: "cart_1", items: [{ id: "item_1" }] }
  Object.values(sdk.store.cart).forEach((mock) => mock.mockReset())
  Object.values(sdk.store.fulfillment).forEach((mock) => mock.mockReset())
  sdk.store.payment.initiatePaymentSession.mockReset()
})

describe("useCheckout", () => {
  it("saves the email and the address for Indonesia", async () => {
    sdk.store.cart.update.mockResolvedValue({ cart: { id: "cart_1", email: values.email } })
    const address = {
      first_name: "Sari",
      last_name: "Dewi",
      address_1: "Jl. Merdeka No. 1",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40111",
      country_code: "id",
      phone: "+6281234567890",
    }

    await useCheckout().saveContact(values)

    expect(sdk.store.cart.update).toHaveBeenCalledWith("cart_1", {
      email: "buyer@example.com",
      shipping_address: address,
      billing_address: address,
    })
    expect(cartState.cart.value.email).toBe("buyer@example.com")
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

  it("starts a Mayar payment and returns the payment URL", async () => {
    const cart = cartState.cart.value
    sdk.store.payment.initiatePaymentSession.mockResolvedValue(
      sessionWith({ payment_url: "https://pay.mayar.example/invoice-1" })
    )

    const url = await useCheckout().startPayment(mayarCustomer)

    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(cart, {
      provider_id: "pp_mayar_mayar",
      data: { customer: mayarCustomer },
    })
    expect(url).toBe("https://pay.mayar.example/invoice-1")
  })

  it("fails when the session has no payment URL or an unsafe URL", async () => {
    for (const data of [{}, { payment_url: "javascript:alert(1)" }, { payment_url: 42 }]) {
      sdk.store.payment.initiatePaymentSession.mockResolvedValue(sessionWith(data))

      await expect(useCheckout().startPayment(mayarCustomer)).rejects.toThrow(
        "The payment session has no payment URL."
      )
    }
  })

  it("does not change the cart when Mayar is not available", async () => {
    const cart = cartState.cart.value
    sdk.store.payment.initiatePaymentSession.mockRejectedValue(new Error("Mayar is down"))

    await expect(useCheckout().startPayment(mayarCustomer)).rejects.toThrow("Mayar is down")

    expect(cartState.cart.value).toBe(cart)
    expect(cartId.value).toBe("cart_1")
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

    await expect(useCheckout().saveContact(values)).rejects.toThrow("The cart is not loaded.")
    await expect(useCheckout().complete()).rejects.toThrow("There is no cart to complete.")
  })
})
