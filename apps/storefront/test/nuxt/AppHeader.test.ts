import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DOMWrapper } from "@vue/test-utils"
import { AppHeader } from "#components"

const { cartState, customerState, catalog } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    cartState: { itemCount: ref(0) },
    customerState: { customer: ref<unknown>(null), logout: vi.fn() },
    catalog: { listCategories: vi.fn() },
  }
})

mockNuxtImport("useCart", () => () => cartState)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useCatalog", () => () => catalog)

const wrappers: Awaited<ReturnType<typeof mountSuspended>>[] = []

const mountHeader = async () => {
  const wrapper = await mountSuspended(AppHeader, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

// Unmount first. The beforeEach changes the shared refs.
// A header that is still mounted then renders into the removed DOM.
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ""
})

beforeEach(() => {
  cartState.itemCount.value = 0
  customerState.customer.value = null
  catalog.listCategories.mockReset().mockResolvedValue([])
})

const badges = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.findAll('a[href="/cart"] [data-slot="badge"]').map((badge: DOMWrapper<Element>) => badge.text())

describe("AppHeader", () => {
  it("shows the cart count in the desktop badge and in the mobile dot badge", async () => {
    cartState.itemCount.value = 2
    const wrapper = await mountHeader()

    expect(badges(wrapper)).toEqual(["2", "2"])
  })

  // Review Focus: a cart with 0 items shows no "0" badge.
  it("shows no badge for an empty cart", async () => {
    const wrapper = await mountHeader()

    expect(badges(wrapper)).toEqual([])
    expect(wrapper.findAll('a[href="/cart"]')).toHaveLength(2)
  })

  it("shows Log in for a guest", async () => {
    const wrapper = await mountHeader()

    expect(wrapper.find('a[href="/account/login"]').text()).toBe("Log in")
    expect(wrapper.find('button[aria-label="Account"]').exists()).toBe(false)
  })

  it("shows the account menu for a customer", async () => {
    customerState.customer.value = { id: "cus_1" }
    const wrapper = await mountHeader()

    expect(wrapper.find('button[aria-label="Account"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/login"]').exists()).toBe(false)
  })

  it("links the wordmark Everyday to the home page", async () => {
    const wrapper = await mountHeader()

    expect(wrapper.find('a[href="/"]').text()).toBe("Everyday")
    expect(wrapper.find('button[aria-label="Menu"]').exists()).toBe(true)
  })
})
