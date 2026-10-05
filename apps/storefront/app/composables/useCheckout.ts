import type { HttpTypes } from "@medusajs/types"
import type { CheckoutFormValues } from "~/utils/checkoutForm"

export const MAYAR_PROVIDER_ID = "pp_mayar_mayar"

export type ShippingChoice = { id: string; name: string; amount: number | null }

// Returns the functions for the checkout steps of the cart.
export function useCheckout(): {
  saveContact(values: CheckoutFormValues): Promise<void>
  loadShippingOptions(): Promise<ShippingChoice[]>
  selectShippingOption(optionId: string): Promise<void>
  startPayment(customer: { name: string; email: string; mobile: string }): Promise<string>
  complete(): Promise<HttpTypes.StoreCompleteCartResponse>
} {
  // The Nuxt context is not available after an await. Get all composables here.
  const sdk = useMedusa()
  const { cart } = useCart()
  const cartId = useCartId()

  function requireCart(): HttpTypes.StoreCart {
    if (!cart.value) {
      throw new Error("The cart is not loaded.")
    }
    return cart.value
  }

  async function saveContact(values: CheckoutFormValues): Promise<void> {
    const current = requireCart()
    const address = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      address_1: values.address_1.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      postal_code: values.postal_code.trim(),
      country_code: "id",
      phone: normalizePhone(values.phone),
    }

    const { cart: updated } = await sdk.store.cart.update(current.id, {
      email: values.email.trim(),
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

  async function startPayment(customer: {
    name: string
    email: string
    mobile: string
  }): Promise<string> {
    // Do not catch SDK errors and do not write the cart. A failed start keeps the cart as it is.
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(requireCart(), {
      provider_id: MAYAR_PROVIDER_ID,
      data: { customer },
    })

    const session = payment_collection.payment_sessions?.find(
      (item) => item.provider_id === MAYAR_PROVIDER_ID
    )
    const url = session?.data?.payment_url
    // Accept only an https URL, so that the redirect cannot run a script.
    if (typeof url !== "string" || !url.startsWith("https://")) {
      throw new Error("The payment session has no payment URL.")
    }
    return url
  }

  async function complete(): Promise<HttpTypes.StoreCompleteCartResponse> {
    // The return page does not load the cart. Use the cart ID of the cookie.
    const id = cartId.value
    if (!id) {
      throw new Error("There is no cart to complete.")
    }
    return sdk.store.cart.complete(id)
  }

  return { saveContact, loadShippingOptions, selectShippingOption, startPayment, complete }
}
