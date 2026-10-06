import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppFooter, TrustLines } from "#components"
import { clearNuxtData } from "#imports"

const { catalog } = vi.hoisted(() => ({ catalog: { listCategories: vi.fn() } }))

mockNuxtImport("useCatalog", () => () => catalog)

beforeEach(() => {
  // The footer and the products page share the categories key, so each test starts with no cached data.
  clearNuxtData()
  catalog.listCategories.mockReset().mockResolvedValue([
    { id: "pcat_1", name: "Shirts", handle: "shirts" },
    { id: "pcat_2", name: "Trousers", handle: "trousers" },
  ])
})

describe("TrustLines", () => {
  it("shows the shipping line and the payment line", async () => {
    const wrapper = await mountSuspended(TrustLines)

    expect(wrapper.text()).toContain("We ship to all of Indonesia.")
    expect(wrapper.text()).toContain("Secure payment with Mayar.")
  })
})

describe("AppFooter", () => {
  it("shows one link for each category", async () => {
    const wrapper = await mountSuspended(AppFooter)

    expect(wrapper.find('a[href="/categories/shirts"]').text()).toBe("Shirts")
    expect(wrapper.find('a[href="/categories/trousers"]').text()).toBe("Trousers")
    expect(wrapper.find('a[href="/products"]').exists()).toBe(true)
  })

  // Review Focus: a failed category request must not break the footer.
  it("keeps the Products link when the categories do not load", async () => {
    catalog.listCategories.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(AppFooter)

    expect(wrapper.find('a[href="/products"]').exists()).toBe(true)
    expect(wrapper.find('a[href^="/categories/"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it("shows the account links, the brand text, and the copyright line", async () => {
    const wrapper = await mountSuspended(AppFooter)

    expect(wrapper.find('a[href="/account/orders"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/wishlist"]').exists()).toBe(true)
    expect(wrapper.text()).toContain("Everyday is a clothing label for ordinary days")
    expect(wrapper.text()).toContain("© Everyday")
  })
})
