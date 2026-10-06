import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppFooter, AppHeader, Sonner } from "#components"
import DefaultLayout from "~/layouts/default.vue"

const { cartState, customerState, catalog } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    cartState: { itemCount: ref(0), load: vi.fn() },
    customerState: { customer: ref<unknown>(null), refresh: vi.fn(), logout: vi.fn() },
    catalog: { listCategories: vi.fn() },
  }
})

mockNuxtImport("useCart", () => () => cartState)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useCatalog", () => () => catalog)

afterEach(() => {
  document.body.innerHTML = ""
})

beforeEach(() => {
  cartState.load.mockReset().mockResolvedValue(undefined)
  customerState.refresh.mockReset().mockResolvedValue(undefined)
  catalog.listCategories.mockReset().mockResolvedValue([])
})

const mountLayout = () =>
  mountSuspended(DefaultLayout, { attachTo: document.body, slots: { default: () => "Page body" } })

describe("default layout", () => {
  it("renders the header, the page in main, the footer, and the toaster", async () => {
    const wrapper = await mountLayout()

    expect(wrapper.findComponent(AppHeader).exists()).toBe(true)
    expect(wrapper.find("main").text()).toBe("Page body")
    expect(wrapper.findComponent(AppFooter).exists()).toBe(true)
    expect(wrapper.findComponent(Sonner).props("position")).toBe("top-right")
  })

  it("gives main the max width and the padding of the design", async () => {
    const wrapper = await mountLayout()
    const main = wrapper.find("main").classes()

    expect(main).toEqual(
      expect.arrayContaining([
        "max-w-[1280px]",
        "px-4",
        "md:px-6",
        "pt-6",
        "pb-16",
        "md:pt-12",
        "md:pb-24",
      ])
    )
  })

  it("loads the cart and the customer after the mount", async () => {
    await mountLayout()
    await flushPromises()

    expect(cartState.load).toHaveBeenCalledTimes(1)
    expect(customerState.refresh).toHaveBeenCalledTimes(1)
  })

  it("keeps the layout when the cart request fails", async () => {
    cartState.load.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountLayout()
    await flushPromises()

    expect(wrapper.find("main").text()).toBe("Page body")
  })
})
