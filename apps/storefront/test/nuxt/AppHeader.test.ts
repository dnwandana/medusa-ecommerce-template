import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppHeader } from "#components"

const { cartState, customerState, wishlistState, catalog, navState } = await vi.hoisted(
  async () => {
    const { ref } = await import("vue")
    return {
      cartState: { itemCount: ref(0) },
      customerState: { customer: ref<unknown>(null), logout: vi.fn() },
      wishlistState: { wishlist: ref<unknown>(null), load: vi.fn() },
      catalog: { listCategories: vi.fn(), listProducts: vi.fn() },
      navState: {
        categories: ref([
          { id: "pcat_women", name: "Women", handle: "women" },
          { id: "pcat_men", name: "Men", handle: "men" },
        ]),
        pending: ref(false),
      },
    }
  }
)

mockNuxtImport("useCart", () => () => cartState)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useWishlist", () => () => wishlistState)
mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useNavCategories", () => () => navState)

const stubs = {
  AccountMenu: { template: "<div data-testid='account-menu' />" },
  LanguageSwitcher: { template: "<div data-testid='language-switcher' />" },
  AppMobileMenu: { template: "<div data-testid='mobile-menu' />" },
}

const wrappers: Awaited<ReturnType<typeof mountSuspended>>[] = []

const mountHeader = async () => {
  const wrapper = await mountSuspended(AppHeader, { attachTo: document.body, global: { stubs } })
  wrappers.push(wrapper)
  return wrapper
}

// Unmount first. The beforeEach changes the shared refs.
// A header that is still mounted then renders into the removed DOM.
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

beforeEach(() => {
  cartState.itemCount.value = 0
  customerState.customer.value = null
  wishlistState.wishlist.value = null
  wishlistState.load.mockReset().mockResolvedValue(undefined)
  catalog.listCategories.mockReset().mockResolvedValue([])
  catalog.listProducts.mockReset().mockResolvedValue({ products: [] })
})

describe("AppHeader", () => {
  it("shows the category links, the wordmark and the counts", async () => {
    cartState.itemCount.value = 2
    customerState.customer.value = { id: "cus_1" }
    wishlistState.wishlist.value = { id: "w1", items: [{ id: "i1" }] }
    const wrapper = await mountHeader()

    expect(wrapper.findAll("nav a").map((a) => a.text())).toEqual(["Women", "Men"])
    expect(wrapper.get("a[href='/']").text()).toBe("Everyday")
    expect(wrapper.get("a[href='/cart']").attributes("aria-label")).toBe("Cart, 2 items")
    expect(wrapper.get("a[href='/account/wishlist']").attributes("aria-label")).toBe(
      "Wishlist, 1 item"
    )
  })

  it("shows no count for an empty cart", async () => {
    const wrapper = await mountHeader()

    expect(wrapper.get("a[href='/cart']").attributes("aria-label")).toBe("Cart")
    expect(wrapper.find("a[href='/cart'] [data-slot='count']").exists()).toBe(false)
  })

  it("loads the wishlist after the customer signs in", async () => {
    const wrapper = await mountHeader()
    expect(wishlistState.load).not.toHaveBeenCalled()

    customerState.customer.value = { id: "cus_1" }
    await wrapper.vm.$nextTick()

    expect(wishlistState.load).toHaveBeenCalledTimes(1)
  })

  it("adds the shadow after 40 px of scroll", async () => {
    const wrapper = await mountHeader()
    // happy-dom gives scrollY only a getter.
    vi.spyOn(window, "scrollY", "get").mockReturnValue(41)
    window.dispatchEvent(new Event("scroll"))
    await wrapper.vm.$nextTick()

    expect(wrapper.get("header").attributes("data-scrolled")).toBe("true")
    expect(wrapper.get("header").classes()).toContain("shadow-md")
  })

  it("shows the search box on desktop", async () => {
    const wrapper = await mountHeader()

    expect(wrapper.find("form[role='search']").exists()).toBe(true)
  })

  it("opens the search sheet from the phone search button", async () => {
    const wrapper = await mountHeader()
    const button = wrapper.get("[data-slot='search']")
    expect(button.attributes("aria-haspopup")).toBe("dialog")

    await button.trigger("click")

    expect(wrapper.findComponent({ name: "SearchSheet" }).props("open")).toBe(true)
  })
})
