import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useCart } from "#imports"

const { sdk, cartId } = vi.hoisted(() => ({
  cartId: { value: null as string | null },
  sdk: {
    store: {
      region: { list: vi.fn() },
      cart: {
        create: vi.fn(),
        retrieve: vi.fn(),
        createLineItem: vi.fn(),
        updateLineItem: vi.fn(),
        deleteLineItem: vi.fn(),
        transferCart: vi.fn(),
      },
    },
  },
}))

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useCartId", () => () => cartId)

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

const cartWith = (quantities: number[], extra: Record<string, unknown> = {}) => ({
  id: "cart_1",
  completed_at: null,
  items: quantities.map((quantity, index) => ({ id: `item_${index}`, quantity })),
  ...extra,
})

beforeEach(() => {
  clearNuxtState()
  cartId.value = null
  Object.values(sdk.store.cart).forEach((mock) => mock.mockReset())
  sdk.store.region.list.mockReset().mockResolvedValue({ regions: [{ id: "reg_1" }] })
})

describe("useCart: load", () => {
  it("makes no request when there is no cart cookie", async () => {
    const { load, cart } = useCart()

    await load()

    expect(sdk.store.cart.retrieve).not.toHaveBeenCalled()
    expect(cart.value).toBeNull()
  })

  it("loads the cart of the cookie", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.retrieve.mockResolvedValue({ cart: cartWith([2, 1]) })
    const { load, cart, itemCount } = useCart()

    await load()

    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1")
    expect(cart.value?.id).toBe("cart_1")
    expect(itemCount.value).toBe(3)
  })

  // Review Focus: a cookie that points to a deleted cart must not break the page.
  it("removes the cookie when the cart does not exist", async () => {
    cartId.value = "cart_gone"
    sdk.store.cart.retrieve.mockRejectedValue(httpError(404))
    const { load, cart } = useCart()

    await expect(load()).resolves.toBeUndefined()

    expect(cartId.value).toBeNull()
    expect(cart.value).toBeNull()
  })

  // Review Focus: a complete cart is an order. The customer needs a new cart.
  it("removes the cookie when the cart is complete", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.retrieve.mockResolvedValue({
      cart: cartWith([1], { completed_at: "2026-10-02T00:00:00Z" }),
    })
    const { load, cart } = useCart()

    await load()

    expect(cartId.value).toBeNull()
    expect(cart.value).toBeNull()
  })

  it("keeps the cookie and throws for other errors", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.retrieve.mockRejectedValue(httpError(500))

    await expect(useCart().load()).rejects.toThrow("HTTP 500")
    expect(cartId.value).toBe("cart_1")
  })
})

describe("useCart: items", () => {
  it("creates a cart for the region when the first item is added", async () => {
    sdk.store.cart.create.mockResolvedValue({ cart: cartWith([]) })
    sdk.store.cart.createLineItem.mockResolvedValue({ cart: cartWith([2]) })
    const { add, itemCount } = useCart()

    await add("variant_1", 2)

    expect(sdk.store.cart.create).toHaveBeenCalledWith({ region_id: "reg_1" })
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledWith("cart_1", {
      variant_id: "variant_1",
      quantity: 2,
    })
    expect(cartId.value).toBe("cart_1")
    expect(itemCount.value).toBe(2)
  })

  it("adds one item to the existing cart by default", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.retrieve.mockResolvedValue({ cart: cartWith([1]) })
    sdk.store.cart.createLineItem.mockResolvedValue({ cart: cartWith([1, 1]) })
    const { load, add } = useCart()
    await load()

    await add("variant_2")

    expect(sdk.store.cart.create).not.toHaveBeenCalled()
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledWith("cart_1", {
      variant_id: "variant_2",
      quantity: 1,
    })
  })

  it("creates a new cart when the cookie points to a deleted cart", async () => {
    cartId.value = "cart_gone"
    sdk.store.cart.retrieve.mockRejectedValue(httpError(404))
    sdk.store.cart.create.mockResolvedValue({ cart: cartWith([]) })
    sdk.store.cart.createLineItem.mockResolvedValue({ cart: cartWith([1]) })

    await useCart().add("variant_1")

    expect(sdk.store.cart.create).toHaveBeenCalledTimes(1)
    expect(cartId.value).toBe("cart_1")
  })

  it("changes the quantity of a line item", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.updateLineItem.mockResolvedValue({ cart: cartWith([5]) })
    const { updateItem, itemCount } = useCart()

    await updateItem("item_0", 5)

    expect(sdk.store.cart.updateLineItem).toHaveBeenCalledWith("cart_1", "item_0", { quantity: 5 })
    expect(itemCount.value).toBe(5)
  })

  it("removes the line item when the quantity is less than 1", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.deleteLineItem.mockResolvedValue({ id: "item_0", deleted: true })
    sdk.store.cart.retrieve.mockResolvedValue({ cart: cartWith([]) })
    const { updateItem, itemCount } = useCart()

    await updateItem("item_0", 0)

    expect(sdk.store.cart.updateLineItem).not.toHaveBeenCalled()
    expect(sdk.store.cart.deleteLineItem).toHaveBeenCalledWith("cart_1", "item_0")
    expect(itemCount.value).toBe(0)
  })
})

describe("useCart: customer and clear", () => {
  it("transfers the cart to the customer", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.transferCart.mockResolvedValue({ cart: cartWith([1], { customer_id: "cus_1" }) })
    const { transferToCustomer, cart } = useCart()

    await transferToCustomer()

    expect(sdk.store.cart.transferCart).toHaveBeenCalledWith("cart_1")
    expect(cart.value?.customer_id).toBe("cus_1")
  })

  it("does not transfer when there is no cart cookie", async () => {
    await useCart().transferToCustomer()

    expect(sdk.store.cart.transferCart).not.toHaveBeenCalled()
  })

  it("does not throw when the transfer fails", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.transferCart.mockRejectedValue(httpError(500))

    await expect(useCart().transferToCustomer()).resolves.toBeUndefined()
  })

  it("clears the cookie and the state", async () => {
    cartId.value = "cart_1"
    sdk.store.cart.retrieve.mockResolvedValue({ cart: cartWith([1]) })
    const { load, clear, cart } = useCart()
    await load()

    clear()

    expect(cartId.value).toBeNull()
    expect(cart.value).toBeNull()
  })
})
