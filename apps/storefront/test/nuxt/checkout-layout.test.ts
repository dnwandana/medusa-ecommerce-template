import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import CheckoutLayout from "~/layouts/checkout.vue"
import { readHead } from "./helpers/head"

const load = vi.fn().mockResolvedValue(undefined)
const refresh = vi.fn().mockResolvedValue(undefined)
mockNuxtImport("useCart", () => () => ({ load, itemCount: ref(0) }))
mockNuxtImport("useCustomer", () => () => ({ refresh, customer: ref(null) }))

const mountLayout = (options: { slots?: Record<string, () => unknown> } = {}) =>
  mountSuspended(CheckoutLayout, options)

describe("checkout layout", () => {
  it("shows the back link, the wordmark and the secure label, with no navigation", async () => {
    const wrapper = await mountSuspended(CheckoutLayout, { slots: { default: () => "Body" } })
    const header = wrapper.get("header")
    expect(header.get("a[href='/cart']").text()).toContain("Back to cart")
    expect(header.get("a[href='/']").text()).toBe("Everyday")
    expect(header.text()).toContain("Secure checkout")
    expect(header.findAll("a")).toHaveLength(2)
    expect(wrapper.text()).toContain("Body")
  })

  it("shows the copyright and the Privacy, Terms and Help links in the footer", async () => {
    const wrapper = await mountSuspended(CheckoutLayout)
    const footer = wrapper.get("footer")
    expect(footer.findAll("a").map((a) => a.attributes("href"))).toEqual([
      "/privacy",
      "/terms",
      "/contact",
    ])
    expect(footer.text()).toContain(`© ${new Date().getFullYear()} Everyday`)
  })

  it("loads the cart and the customer after the mount", async () => {
    await mountSuspended(CheckoutLayout)
    expect(load).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
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
        useHead({ title: "Checkout" })
        return () => h("div")
      },
    })
    await mountLayout({ slots: { default: () => h(Page) } })
    expect((await readHead()).title).toBe("Checkout | Everyday")
  })

  it("tells search engines not to index the page", async () => {
    await mountLayout()
    const head = await readHead()
    expect(head.meta("robots")).toBe("noindex")
    expect(head.links("canonical")).toEqual([])
  })
})
