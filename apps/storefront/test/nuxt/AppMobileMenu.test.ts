import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppMobileMenu } from "#components"
import { useRouter } from "#imports"

const { catalog, customerState } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    catalog: { listCategories: vi.fn() },
    customerState: { customer: ref<unknown>(null) },
  }
})

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useCustomer", () => () => customerState)

let mounted: Awaited<ReturnType<typeof mountSuspended>> | undefined

// Unmount first. A mounted menu of an old test still watches the route and its portal is gone.
afterEach(() => {
  mounted?.unmount()
  mounted = undefined
  document.body.innerHTML = ""
})

beforeEach(() => {
  catalog.listCategories.mockReset().mockResolvedValue([
    { id: "pcat_1", name: "Shirts", handle: "shirts" },
    { id: "pcat_2", name: "Trousers", handle: "trousers" },
  ])
  customerState.customer.value = null
})

const openMenu = async () => {
  const wrapper = await mountSuspended(AppMobileMenu, { attachTo: document.body, route: "/" })
  mounted = wrapper
  await wrapper.find('button[aria-label="Menu"]').trigger("click")
  await flushPromises()
  return wrapper
}

const sheet = () => document.body.querySelector('[role="dialog"]')

describe("AppMobileMenu", () => {
  it("links to the products and to each category", async () => {
    await openMenu()

    expect(sheet()?.querySelector('a[href="/products"]')).not.toBeNull()
    expect(sheet()?.querySelector('a[href="/categories/shirts"]')?.textContent).toContain("Shirts")
    expect(sheet()?.querySelector('a[href="/categories/trousers"]')?.textContent).toContain(
      "Trousers"
    )
  })

  it("gives the close button an i18n label", async () => {
    await openMenu()

    expect(sheet()?.querySelector('[data-slot="sheet-close"]')?.textContent).toContain("Close")
  })

  it("shows Log in for a guest", async () => {
    await openMenu()

    expect(sheet()?.querySelector('a[href="/account/login"]')?.textContent).toContain("Log in")
    expect(sheet()?.querySelector('a[href="/account/orders"]')).toBeNull()
  })

  it("shows the account links for a customer", async () => {
    customerState.customer.value = { id: "cus_1" }
    await openMenu()

    expect(sheet()?.querySelector('a[href="/account"]')).not.toBeNull()
    expect(sheet()?.querySelector('a[href="/account/orders"]')).not.toBeNull()
    expect(sheet()?.querySelector('a[href="/account/wishlist"]')).not.toBeNull()
  })

  // The test router stub of @nuxt/test-utils does not navigate on a link click.
  // Thus the test changes the route through the router.
  it("closes when the route changes", async () => {
    await openMenu()
    expect(sheet()?.querySelector('a[href="/products"]')).not.toBeNull()

    await useRouter().push("/products")
    await flushPromises()

    expect(sheet()).toBeNull()
  })
})
