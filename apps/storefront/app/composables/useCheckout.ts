import type { HttpTypes } from "@medusajs/types"
import type { CartAddress } from "~/utils/addressForm"
import type { PaymentCustomer } from "~/utils/checkoutForm"

export type ShippingChoice = { id: string; name: string; amount: number | null }

// A gateway session sends the browser to a payment page. A session with no payment page, for
// example bank transfer, gives the order at once.
export type PaymentStart = { type: "redirect"; url: string } | { type: "order"; orderId: string }

// Returns the functions for the checkout steps of the cart.
export function useCheckout(): {
  saveContact(email: string, address: CartAddress): Promise<void>
  loadShippingOptions(): Promise<ShippingChoice[]>
  selectShippingOption(optionId: string): Promise<void>
  listPaymentProviders(): Promise<{ id: string }[]>
  startPayment(providerId: string, customer: PaymentCustomer): Promise<PaymentStart>
  complete(): Promise<HttpTypes.StoreCompleteCartResponse>
} {
  // The Nuxt context is not available after an await. Get all composables here.
  const sdk = useMedusa()
  const { cart, clear } = useCart()
  const cartId = useCartId()

  function requireCart(): HttpTypes.StoreCart {
    if (!cart.value) {
      throw new Error("The cart is not loaded.")
    }
    return cart.value
  }

  // Writes the email, the shipping address, and the billing address. The store has no separate
  // billing address, so both get the same address.
  async function saveContact(email: string, address: CartAddress): Promise<void> {
    const current = requireCart()
    const { cart: updated } = await sdk.store.cart.update(current.id, {
      email: email.trim(),
      shipping_address: address,
      billing_address: address,
    })
    cart.value = updated
  }

  async function loadShippingOptions(): Promise<ShippingChoice[]> {
    const cartIdOfCart = requireCart().id
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartIdOfCart,
    })

    return Promise.all(
      shipping_options.map(async (option): Promise<ShippingChoice> => {
        // A calculated option has no amount in the list. The provider gives it for this cart.
        if (option.price_type === "calculated") {
          const { shipping_option } = await sdk.store.fulfillment.calculate(option.id, {
            cart_id: cartIdOfCart,
          })
          return { id: option.id, name: option.name, amount: shipping_option.amount ?? null }
        }
        return { id: option.id, name: option.name, amount: option.amount ?? null }
      })
    )
  }

  async function selectShippingOption(optionId: string): Promise<void> {
    const current = requireCart()
    const { cart: updated } = await sdk.store.cart.addShippingMethod(current.id, {
      option_id: optionId,
    })
    cart.value = updated
  }

  // Returns the payment providers of the cart region. The page needs no list of provider ids.
  async function listPaymentProviders(): Promise<{ id: string }[]> {
    const regionId = requireCart().region_id
    if (!regionId) {
      throw new Error("The cart has no region.")
    }
    const { payment_providers } = await sdk.store.payment.listPaymentProviders({
      region_id: regionId,
    })
    return payment_providers.map(({ id }) => ({ id }))
  }

  async function startPayment(
    providerId: string,
    customer: PaymentCustomer
  ): Promise<PaymentStart> {
    const current = requireCart()
    // Do not catch SDK errors and do not write the cart. A failed start keeps the cart as it is.
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(current, {
      provider_id: providerId,
      data: { customer },
    })

    const session = payment_collection.payment_sessions?.find(
      (item) => item.provider_id === providerId
    )
    if (!session) {
      throw new Error("The payment collection has no session for the provider.")
    }

    const data = session.data ?? {}
    if ("payment_url" in data) {
      const url = data.payment_url
      // Accept only an https URL, so that the redirect cannot run a script or leave TLS.
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("The payment session has a payment URL that is not https.")
      }
      return { type: "redirect", url }
    }

    // The session has no payment page, so the provider authorizes when the cart completes.
    const result = await sdk.store.cart.complete(current.id)
    if (result.type === "order") {
      clear()
      return { type: "order", orderId: result.order.id }
    }
    // Keep the cart, so that the customer can try again.
    throw new Error(result.error?.message || "The cart did not become an order.")
  }

  async function complete(): Promise<HttpTypes.StoreCompleteCartResponse> {
    // The return page does not load the cart. Use the cart ID of the cookie.
    const id = cartId.value
    if (!id) {
      throw new Error("There is no cart to complete.")
    }
    return sdk.store.cart.complete(id)
  }

  return {
    saveContact,
    loadShippingOptions,
    selectShippingOption,
    listPaymentProviders,
    startPayment,
    complete,
  }
}
