import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WishlistPage from "~/pages/account/wishlist.vue"

const { wishlist } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    wishlist: {
      wishlist: ref<unknown>(null),
      load: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      itemFor: vi.fn(),
    },
  }
})

mockNuxtImport("useWishlist", () => () => wishlist)

const item = (id: string, title: string, amount: number | null) => ({
  id,
  product_variant_id: `variant_${id}`,
  product_variant: {
    id: `variant_${id}`,
    title: "M",
    sku: null,
    calculated_price: amount === null ? null : { calculated_amount: amount },
    product: { id: "prod_1", title, handle: "plain-t-shirt", thumbnail: null },
  },
})

const mountPage = async () => {
  const wrapper = await mountSuspended(WishlistPage)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  wishlist.wishlist.value = null
  wishlist.load.mockReset().mockResolvedValue(undefined)
  wishlist.remove.mockReset().mockResolvedValue(undefined)
})

describe("wishlist page", () => {
  it("loads the wishlist and shows the empty text", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [] }
    const wrapper = await mountPage()

    expect(wishlist.load).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain("Your wishlist is empty.")
  })

  it("shows each item with the product, the variant, the price, and a link", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.text()).toContain("M")
    expect(wrapper.text()).toContain("Rp 150.000")
    expect(wrapper.find('a[href="/products/plain-t-shirt"]').text()).toBe("View the product")
  })

  it("shows no price text for a variant with no price", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", null)] }
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain("NaN")
    expect(wrapper.text()).not.toContain("Rp")
  })

  it("removes an item", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    const wrapper = await mountPage()

    await wrapper.find('[data-testid="remove-wi_1"]').trigger("click")
    await flushPromises()

    expect(wishlist.remove).toHaveBeenCalledWith("wi_1")
  })

  it("shows an error when the removal fails", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    wishlist.remove.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    await wrapper.find('[data-testid="remove-wi_1"]').trigger("click")
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe("The wishlist did not change. Try again.")
  })
})
