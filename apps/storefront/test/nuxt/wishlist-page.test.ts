import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav } from "#components"
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
    const link = wrapper.get('[data-testid="view-wi_1"]')
    expect(link.attributes("href")).toBe("/products/plain-t-shirt")
    expect(link.text()).toBe("View the product")
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

  it("shows the wishlist in the account nav", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [] }
    const wrapper = await mountPage()

    expect(wrapper.findComponent(AccountNav).exists()).toBe(true)
    expect(wrapper.find("h2").text()).toBe("Wishlist")
  })

  it("shows an empty state with a link to the products", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [] }
    const wrapper = await mountPage()
    const empty = wrapper.find('[data-slot="empty"]')

    expect(empty.text()).toContain("Your wishlist is empty.")
    expect(empty.find('a[href="/products"]').text()).toBe("Continue shopping")
  })

  it("removes an item with an icon button that has a label", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    const wrapper = await mountPage()
    const button = wrapper.find('[data-testid="remove-wi_1"]')

    expect(button.find("svg").exists()).toBe(true)
    expect(button.text()).toBe("Remove from wishlist")
    expect(button.find(".sr-only").exists()).toBe(true)
  })

  it("shows the removal error in a destructive alert", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    wishlist.remove.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    await wrapper.find('[data-testid="remove-wi_1"]').trigger("click")
    await flushPromises()

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe(
      "The wishlist did not change. Try again."
    )
    expect(wrapper.find('[data-testid="wishlist-wi_1"]').exists()).toBe(true)
  })

  it("shows the items as cards in two columns, three from md", async () => {
    wishlist.wishlist.value = {
      id: "wl_1",
      items: [item("wi_1", "Plain T-Shirt", 150000), item("wi_2", "Linen Shirt", 250000)],
    }
    const wrapper = await mountPage()
    const card = wrapper.get('[data-testid="wishlist-wi_1"]')

    expect(card.element.tagName).toBe("ARTICLE")
    expect(card.element.parentElement!.className).toContain("grid-cols-2")
    expect(card.element.parentElement!.className).toContain("md:grid-cols-3")
    expect(card.find('[style*="4 / 5"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="item"]').exists()).toBe(false)
  })

  it("removes the item with a filled heart", async () => {
    wishlist.wishlist.value = { id: "wl_1", items: [item("wi_1", "Plain T-Shirt", 150000)] }
    const wrapper = await mountPage()
    const heart = wrapper.get('[data-testid="remove-wi_1"]')

    expect(heart.attributes("aria-pressed")).toBe("true")
    expect(heart.get("svg").classes()).toContain("fill-current")
  })

  it("disables the hearts while a removal runs", async () => {
    wishlist.wishlist.value = {
      id: "wl_1",
      items: [item("wi_1", "Plain T-Shirt", 150000), item("wi_2", "Linen Shirt", 250000)],
    }
    wishlist.remove.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="remove-wi_1"]').trigger("click")
    await wrapper.get('[data-testid="remove-wi_2"]').trigger("click")

    expect(wishlist.remove).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="remove-wi_2"]').attributes("disabled")).toBeDefined()
  })

  it("shows skeleton cards while the wishlist loads", async () => {
    wishlist.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(WishlistPage)

    expect(wrapper.get('[role="status"]').text()).toContain("Loading…")
    expect(wrapper.findAll('[data-testid="wishlist-skeleton"]')).toHaveLength(6)
  })

  it("loads again after Try again", async () => {
    wishlist.load.mockRejectedValueOnce(new Error("HTTP 500"))
    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain("Try again")
    await wrapper.get('[role="alert"] button').trigger("click")
    await flushPromises()

    expect(wishlist.load).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
