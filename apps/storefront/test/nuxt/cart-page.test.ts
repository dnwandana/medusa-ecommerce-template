import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computed, defineComponent, h, nextTick } from "vue"
import CartPage from "~/pages/cart.vue"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"
import { readHead } from "./helpers/head"

const { useCartMock, catalog, wishlistMove, customer } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    useCartMock: {
      cart: ref<unknown>(null),
      itemCount: ref(0),
      load: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
    },
    catalog: { listVariantStock: vi.fn() },
    wishlistMove: { move: vi.fn() },
    customer: { customer: ref<unknown>(null), ensureLoaded: vi.fn() },
  }
})

mockNuxtImport("useCart", () => () => useCartMock)
mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useMoveToWishlist", () => () => wishlistMove)
mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => STOREFRONT_DEFAULTS),
  ensureSettings: vi.fn(),
}))

// The stub keeps the props of the real component and makes no request.
const RelatedStub = defineComponent({
  name: "RelatedProducts",
  props: ["sourceKey", "source"],
  setup: () => () => h("section"),
})

const filledCart = {
  id: "cart_1",
  item_subtotal: 450000,
  item_total: 450000,
  items: [
    {
      id: "item_1",
      product_id: "prod_tee",
      variant_id: "v_m",
      product_title: "Plain T-Shirt",
      variant_title: "M",
      quantity: 2,
      unit_price: 150000,
      created_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "item_2",
      product_id: "prod_chino",
      variant_id: "v_30",
      product_title: "Wide Chino",
      variant_title: "30",
      quantity: 1,
      unit_price: 150000,
      created_at: "2026-10-02T00:00:00Z",
    },
  ],
}

// The mocks share one cart ref. A page that stays mounted reacts to the cart of the next test.
const mounted: { unmount(): void }[] = []

const mountPage = async (options: { flush?: boolean } = {}) => {
  const wrapper = await mountSuspended(CartPage, {
    global: { stubs: { RelatedProducts: RelatedStub } },
  })
  mounted.push(wrapper)
  if (options.flush !== false) {
    await flushPromises()
  }
  return wrapper
}

beforeEach(() => {
  useCartMock.cart.value = null
  useCartMock.itemCount.value = 0
  useCartMock.load.mockReset().mockResolvedValue(undefined)
  useCartMock.updateItem.mockReset().mockResolvedValue(undefined)
  useCartMock.removeItem.mockReset().mockResolvedValue(undefined)
  catalog.listVariantStock.mockReset().mockResolvedValue({})
  wishlistMove.move.mockReset().mockResolvedValue("moved")
  customer.customer.value = null
  customer.ensureLoaded.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe("cart page", () => {
  it("shows the skeletons until the cart loads", async () => {
    useCartMock.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage({ flush: false })

    expect(wrapper.find("[data-testid='cart-loading']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='cart-loading']").text()).toContain("Loading…")
    expect(wrapper.findAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
    expect(wrapper.find("[data-slot='empty']").exists()).toBe(false)
  })

  it("loads the cart and the customer after the mount", async () => {
    customer.ensureLoaded.mockRejectedValue(new Error("offline"))
    const wrapper = await mountPage()

    expect(useCartMock.load).toHaveBeenCalledTimes(1)
    expect(customer.ensureLoaded).toHaveBeenCalledTimes(1)
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("shows the error when the cart does not load", async () => {
    useCartMock.load.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    expect(wrapper.get("[role='alert']").text()).toBe("An error occurred. Try again.")
  })

  it("shows the title, the count, the lines and the summary", async () => {
    useCartMock.cart.value = filledCart
    useCartMock.itemCount.value = 3
    const wrapper = await mountPage()

    expect(wrapper.get("h1").text()).toBe("Your cart")
    expect(wrapper.text()).toContain("3 pieces")
    expect(wrapper.get("ul[aria-label='Items in your cart']").findAll("li")).toHaveLength(2)
    expect(wrapper.findComponent({ name: "CartSummary" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "TrustLines" }).exists()).toBe(false)
    expect(wrapper.get("[data-testid='continue']").attributes("href")).toBe("/products")
  })

  it("reads the stock of the cart products and gives it to each line", async () => {
    useCartMock.cart.value = filledCart
    catalog.listVariantStock.mockResolvedValue({
      v_m: { id: "v_m", inventory_quantity: 2, manage_inventory: true, allow_backorder: false },
    })
    const wrapper = await mountPage()

    expect(catalog.listVariantStock).toHaveBeenCalledWith(["prod_chino", "prod_tee"])
    const lines = wrapper.findAllComponents({ name: "CartLineItem" })
    expect(lines[0]!.props("stock")).toMatchObject({ inventory_quantity: 2 })
    expect(lines[1]!.props("stock")).toBeNull()
  })

  it("reads the stock again only when the products change", async () => {
    useCartMock.cart.value = filledCart
    await mountPage()

    useCartMock.cart.value = {
      ...filledCart,
      items: [{ ...filledCart.items[0], quantity: 3 }, filledCart.items[1]],
    }
    await flushPromises()
    expect(catalog.listVariantStock).toHaveBeenCalledTimes(1)

    useCartMock.cart.value = { ...filledCart, items: [filledCart.items[0]] }
    await flushPromises()
    expect(catalog.listVariantStock).toHaveBeenCalledTimes(2)
    expect(catalog.listVariantStock).toHaveBeenLastCalledWith(["prod_tee"])
  })

  it("gives the lines no stock when the stock request fails", async () => {
    useCartMock.cart.value = filledCart
    catalog.listVariantStock.mockRejectedValue(new Error("offline"))
    const wrapper = await mountPage()

    expect(wrapper.findAllComponents({ name: "CartLineItem" })[0]!.props("stock")).toBeNull()
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("changes and removes a line through the cart composable", async () => {
    useCartMock.cart.value = filledCart
    const wrapper = await mountPage()
    const lines = () => wrapper.findAllComponents({ name: "CartLineItem" })

    lines()[0]!.vm.$emit("update", 3)
    await flushPromises()
    lines()[1]!.vm.$emit("remove")
    await flushPromises()

    expect(useCartMock.updateItem).toHaveBeenCalledWith("item_1", 3)
    expect(useCartMock.removeItem).toHaveBeenCalledWith("item_2")
  })

  it("shows the busy state only on the changed line", async () => {
    useCartMock.cart.value = filledCart
    let resolve!: () => void
    useCartMock.removeItem.mockReturnValue(new Promise<void>((done) => (resolve = done)))
    const wrapper = await mountPage()
    const lines = () => wrapper.findAllComponents({ name: "CartLineItem" })

    lines()[0]!.vm.$emit("remove")
    await nextTick()
    expect(lines()[0]!.props()).toMatchObject({ busy: "remove", disabled: true })
    expect(lines()[1]!.props()).toMatchObject({ busy: null, disabled: true })
    expect(wrapper.findComponent({ name: "CartSummary" }).props("disabled")).toBe(true)

    // A second change during the first change does nothing.
    lines()[1]!.vm.$emit("update", 2)
    await nextTick()
    expect(useCartMock.updateItem).not.toHaveBeenCalled()

    resolve()
    await flushPromises()
    expect(lines()[1]!.props("disabled")).toBe(false)
    expect(wrapper.findComponent({ name: "CartSummary" }).props("disabled")).toBe(false)
  })

  it("gives the update kind to the line that changes its quantity", async () => {
    useCartMock.cart.value = filledCart
    useCartMock.updateItem.mockReturnValue(new Promise<void>(() => {}))
    const wrapper = await mountPage()
    const lines = () => wrapper.findAllComponents({ name: "CartLineItem" })

    lines()[1]!.vm.$emit("update", 2)
    await nextTick()
    expect(lines()[1]!.props("busy")).toBe("update")
    expect(lines()[0]!.props("busy")).toBeNull()
  })

  it("shows the error when a change fails and hides it at the next change", async () => {
    useCartMock.cart.value = filledCart
    useCartMock.removeItem.mockRejectedValueOnce(new Error("HTTP 500"))
    const wrapper = await mountPage()
    const lines = () => wrapper.findAllComponents({ name: "CartLineItem" })

    lines()[0]!.vm.$emit("remove")
    await flushPromises()
    expect(wrapper.get("[role='alert']").text()).toBe("An error occurred. Try again.")
    expect(lines()).toHaveLength(2)

    lines()[1]!.vm.$emit("update", 2)
    await flushPromises()
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("moves a line to the wishlist", async () => {
    useCartMock.cart.value = filledCart
    const wrapper = await mountPage()

    wrapper.findAllComponents({ name: "CartLineItem" })[1]!.vm.$emit("move")
    await flushPromises()

    expect(wishlistMove.move).toHaveBeenCalledWith(filledCart.items[1])
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("keeps the line and shows the error when the move fails", async () => {
    useCartMock.cart.value = filledCart
    wishlistMove.move.mockRejectedValue(new Error("offline"))
    const wrapper = await mountPage()

    wrapper.findAllComponents({ name: "CartLineItem" })[0]!.vm.$emit("move")
    await flushPromises()

    expect(wishlistMove.move).toHaveBeenCalledWith(filledCart.items[0])
    expect(wrapper.get("[role='alert']").text()).toBe("An error occurred. Try again.")
    expect(wrapper.findAllComponents({ name: "CartLineItem" })).toHaveLength(2)
  })

  it("gives the related section the last added product and the cart products", async () => {
    useCartMock.cart.value = filledCart
    const wrapper = await mountPage()

    expect(wrapper.findComponent({ name: "RelatedProducts" }).props()).toEqual({
      sourceKey: "cart",
      source: { productId: "prod_chino", excludeIds: ["prod_tee", "prod_chino"] },
    })
  })

  it("adds space below the content for the checkout bar on phones", async () => {
    useCartMock.cart.value = filledCart
    const wrapper = await mountPage()

    expect(wrapper.get("[data-testid='cart-page']").classes()).toContain("pb-32")
  })

  it("shows the empty state with the wishlist text for a customer", async () => {
    useCartMock.cart.value = { ...filledCart, items: [] }
    customer.customer.value = { id: "cus_1" }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Your cart is empty")
    expect(wrapper.text()).toContain("Your wishlist keeps anything you saved.")
    expect(wrapper.get("a[href='/products']").text()).toBe("Discover the collection")
    expect(wrapper.findComponent({ name: "RelatedProducts" }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: "CartSummary" }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain("pieces")
  })

  it("shows the short empty text for a guest", async () => {
    useCartMock.cart.value = null
    customer.customer.value = null
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Pieces you add will wait here.")
    expect(wrapper.text()).not.toContain("wishlist")
    expect(catalog.listVariantStock).not.toHaveBeenCalled()
  })

  it("tells search engines not to index the page", async () => {
    await mountPage()
    const head = await readHead()
    expect(head.meta("robots")).toBe("noindex")
    expect(head.links("canonical")).toEqual([])
  })
})
