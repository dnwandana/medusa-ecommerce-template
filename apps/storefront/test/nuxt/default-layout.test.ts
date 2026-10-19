import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppFooter, AppHeader, Sonner } from "#components"
import DefaultLayout from "~/layouts/default.vue"
import { readHead } from "./helpers/head"

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

beforeEach(() => {
  cartState.load.mockReset().mockResolvedValue(undefined)
  customerState.refresh.mockReset().mockResolvedValue(undefined)
  catalog.listCategories.mockReset().mockResolvedValue([])
})

const mountLayout = (options: { slots?: Record<string, () => unknown> } = {}) =>
  mountSuspended(DefaultLayout, {
    attachTo: document.body,
    slots: { default: () => "Page body" },
    ...options,
  })

describe("default layout", () => {
  it("renders the header, the page in main, the footer, and the toaster", async () => {
    const wrapper = await mountLayout()

    expect(wrapper.findComponent(AppHeader).exists()).toBe(true)
    expect(wrapper.find("main").text()).toBe("Page body")
    expect(wrapper.findComponent(AppFooter).exists()).toBe(true)
    expect(wrapper.findComponent(Sonner).props("position")).toBe("top-right")
  })

  it("gives main the max width and the side padding of the design", async () => {
    const wrapper = await mountLayout()
    const main = wrapper.find("main").classes()

    expect(main).toEqual(expect.arrayContaining(["max-w-[1440px]", "px-4", "md:px-12"]))
    // Each page sets its own section spacing.
    expect(main.some((name) => /^(md:)?p[tby]-/.test(name))).toBe(false)
  })

  it("shows the announcement bar above the header and a 1440 px main", async () => {
    const wrapper = await mountLayout()
    const html = wrapper.html()
    expect(html.indexOf("Delivered to your door")).toBeLessThan(html.indexOf("<header"))
    expect(wrapper.get("main").classes()).toContain("max-w-[1440px]")
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

  it("sets lang to the language tag of the locale", async () => {
    await mountLayout()
    expect((await readHead()).htmlAttrs.lang).toBe("en-US")
    await useNuxtApp().$i18n.setLocale("id")
    expect((await readHead()).htmlAttrs.lang).toBe("id-ID")
    await useNuxtApp().$i18n.setLocale("en")
  })

  it("adds the store name to a page title", async () => {
    // A slot component stands in for a page.
    const Page = defineComponent({
      setup: () => {
        useHead({ title: "Your cart" })
        return () => h("div")
      },
    })
    await mountLayout({ slots: { default: () => h(Page) } })
    expect((await readHead()).title).toBe("Your cart | Everyday")
  })
})
