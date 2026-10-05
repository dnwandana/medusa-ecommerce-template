import type { MayarMock } from "./mayar-mock"

export type StoreContext = { api: any; headers: Record<string, string>; regionId: string }
export type CartItem = [sku: string, quantity: number]

const customer = { name: "Budi Santoso", email: "buyer@example.com", mobile: "081234567890" }

// Creates a cart with an Indonesian address, the given items, and the seeded shipping option.
export async function createCartWithShipping(
  ctx: StoreContext,
  items: CartItem[]
): Promise<{ cartId: string; total: number }> {
  const { api, headers, regionId } = ctx
  const products = await api.get("/store/products?fields=*variants", { headers })
  const variantIdBySku: Record<string, string> = Object.fromEntries(
    products.data.products.flatMap((p: any) => p.variants.map((v: any) => [v.sku, v.id]))
  )

  const created = await api.post(
    "/store/carts",
    {
      region_id: regionId,
      // Medusa sets the email of a logged-in customer.
      ...(headers.authorization ? {} : { email: customer.email }),
      shipping_address: {
        first_name: "Budi",
        last_name: "Santoso",
        address_1: "Jl. Sudirman No. 1",
        city: "Jakarta",
        postal_code: "10220",
        country_code: "id",
        phone: customer.mobile,
      },
    },
    { headers }
  )
  const cartId: string = created.data.cart.id

  for (const [sku, quantity] of items) {
    await api.post(
      `/store/carts/${cartId}/line-items`,
      { variant_id: variantIdBySku[sku], quantity },
      { headers }
    )
  }

  const options = await api.get(`/store/shipping-options?cart_id=${cartId}`, { headers })
  const withShipping = await api.post(
    `/store/carts/${cartId}/shipping-methods`,
    { option_id: options.data.shipping_options[0].id },
    { headers }
  )

  return { cartId, total: withShipping.data.cart.total }
}

// Creates a cart and a Mayar payment session for it. installMayarMock() must be active.
export async function createCartWithPaymentSession(
  ctx: StoreContext,
  items: CartItem[]
): Promise<{
  cartId: string
  paymentCollectionId: string
  sessionId: string
  invoiceId: string
  total: number
}> {
  const { api, headers } = ctx
  const { cartId, total } = await createCartWithShipping(ctx, items)

  const collection = await api.post("/store/payment-collections", { cart_id: cartId }, { headers })
  const paymentCollectionId: string = collection.data.payment_collection.id

  const withSession = await api.post(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    { provider_id: "pp_mayar_mayar", data: { customer } },
    { headers }
  )
  const session = withSession.data.payment_collection.payment_sessions[0]

  return {
    cartId,
    paymentCollectionId,
    sessionId: session.id,
    invoiceId: session.data.invoice_id,
    total,
  }
}

// Creates a cart, marks its Mayar invoice as paid, and completes the cart. Returns the order.
export async function placePaidOrder(
  ctx: StoreContext,
  mock: MayarMock,
  items: CartItem[]
): Promise<any> {
  const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, items)
  mock.setInvoiceStatus(invoiceId, "paid")

  const completed = await ctx.api.post(`/store/carts/${cartId}/complete`, {}, { headers: ctx.headers })
  if (completed.data.type !== "order") {
    throw new Error(
      `The cart ${cartId} did not become an order. Response: ${JSON.stringify(completed.data.error)}`
    )
  }
  return completed.data.order
}
